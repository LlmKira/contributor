# -*- coding: utf-8 -*-
import logging
from functools import wraps
from typing import Callable, Dict, Optional, Union, Any

import uvicorn
from fastapi import FastAPI, Request
from loguru import logger
from pydantic import BaseModel
from pydantic.dataclasses import dataclass

from .event_parser import parse_event
from .event_type import EVENT_MODEL, BaseEventType
from .exception import InvalidRequestError


@dataclass
class GitHubEvent:
    """Represents a GitHub webhook event."""
    name: str
    delivery_id: str
    signature: Optional[str]
    user_agent: str
    payload: Dict[str, Any]


class HandlerConfig:
    escape_bot: bool = True


def should_ignore_bot(config: HandlerConfig, model: BaseModel) -> bool:
    """Returns True if the sender is a bot and the event should be ignored."""
    return getattr(model, "sender", None) and config.escape_bot and model.sender.is_bot()


class InterceptHandler(logging.Handler):
    """A logging handler to intercept and redirect logging messages to loguru."""

    def emit(self, record):
        loguru_logger = logger.opt(depth=2, exception=record.exc_info)
        loguru_logger.log(record.levelname, record.getMessage())


class GithubWebhookHandler:
    def __init__(self, log_server: bool = False, webhook_secret: Optional[str] = None):
        """
        Initialize the GitHub webhook handler.
        :param log_server: Whether to log server events.
        :param webhook_secret: Secret key for validating incoming webhooks.
        """
        self.app = FastAPI()
        self.handlers: Dict[str, Dict[str, Callable]] = {}
        self.filters: Dict[str, Dict[str, Callable]] = {}
        self.configs: Dict[str, Dict[str, HandlerConfig]] = {}
        self.debug: bool = False
        self.log_server = log_server
        self.webhook_secret = webhook_secret
        self._configure_logging()

        @self.app.post("/")
        async def webhook_listener(request: Request):
            """Handle incoming webhook requests from GitHub."""
            try:
                headers = request.headers
                raw_body = await request.body()
                try:
                    event = parse_event(headers, raw_body, self.webhook_secret)
                except InvalidRequestError as e:
                    # docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
                    logger.error(f"Invalid webhook request: {e}")
                    return {
                        "status": "error",
                        "details": "Invalid webhook request",
                    }
                if event.name and event.payload.get("action"):
                    await self.handle_event(event.name, event.payload["action"], event.payload)
                return {"status": "ok"}
            except Exception as e:
                logger.error(f"Webhook listener encountered an error: {e}")
                return {"status": "error", "details": "Server encountered an error, check logs for details"}

    def listen(
            self,
            event_type: Union[BaseEventType, str],
            action: str,
            filter_func: Optional[Callable[[dict], bool]] = None,
            config: HandlerConfig = HandlerConfig(),
    ):
        if not isinstance(event_type, str):
            event_type = str(event_type)

        def decorator(func: Callable):
            """Register a handler for a specific GitHub event type and action."""
            # 如果已经存在，则警告
            if self.handlers.get(event_type, {}).get(action):
                logger.warning(f"Event[{event_type}]({action}) already has a handler, overwriting")
            self.handlers.setdefault(event_type, {})[action] = func
            if filter_func:
                self.filters.setdefault(event_type, {})[action] = filter_func
            self.configs.setdefault(event_type, {})[action] = config

            logger.info(f"Registered listener for Event[{event_type}]({action}) --filter {filter_func is not None}")

            @wraps(func)
            async def wrapped_function(*args, **kwargs):
                try:
                    return await func(*args, **kwargs)
                except Exception as exc:
                    logger.error(f"Error in handler for Event[{event_type}]({action}): {exc}")
                    raise

            return wrapped_function

        return decorator

    async def handle_event(self, event_type: str, action: str, payload: dict):
        """Handle incoming GitHub webhook events."""
        handler = self.handlers.get(event_type, {}).get(action)
        if not handler:
            logger.warning(f"Event[{event_type}]({action}) not handled")
            return

        if self.is_filtered(event_type, action, payload):
            logger.info(f"Event[{event_type}]({action}) filtered")
            return

        config = self.configs[event_type].get(action, HandlerConfig())
        model = self.get_event_model(event_type, action, payload)
        if not model:
            logger.warning(f"Event[{event_type}]({action}) model not found")
            return

        if should_ignore_bot(config, model):
            logger.info(f"Event[{event_type}]({action}) ignored due to bot sender")
            return

        if self.debug:
            print(f"Debug Event[{event_type}]({action})")
            print(model.model_dump())

        try:
            await handler(model)
        except Exception as exc:
            logger.error(f"Error executing handler for Event[{event_type}]({action}): {exc}")

    def is_filtered(self, event_type: str, action: str, payload: dict) -> bool:
        """Check if the event should be filtered based on registered filter functions."""
        filter_func = self.filters.get(event_type, {}).get(action)
        if filter_func:
            try:
                return not filter_func(payload)
            except Exception as exc:
                logger.error(f"Error in filter function for Event[{event_type}]({action}): {exc}")
                return True
        return False

    @staticmethod
    def get_event_model(event_type: Union[BaseEventType, str], action: str, payload: dict) -> Optional[BaseModel]:
        """Retrieve the appropriate model for the specified event type and action."""
        event_key = str(event_type)
        model_class = EVENT_MODEL.get((event_key, action))
        if model_class:
            try:
                return model_class.model_validate(payload)
            except Exception as exc:
                logger.error(f"Error validating model for Event[{event_key}]({action}): {exc}")
        return None

    def _configure_logging(self):
        """Setup logging for the FastAPI application."""
        intercept_handler = InterceptHandler()
        uvicorn_loggers = ["uvicorn", "uvicorn.access", "uvicorn.error"]
        for log_name in uvicorn_loggers:
            log = logging.getLogger(log_name)
            log.handlers = []
            log.propagate = False
            log.addHandler(intercept_handler)
            log.setLevel(logging.INFO if self.log_server else logging.ERROR)

    def run(self, host: str = "0.0.0.0", port: int = 8000, **kwargs):
        """Run the FastAPI application."""
        config = uvicorn.Config(self.app, host=host, port=port, log_config=None, **kwargs)
        server = uvicorn.Server(config)
        logger.info(f"Starting server at {host}:{port}")
        server.run()
