import logging
from functools import wraps
from typing import Callable, Dict, Optional, Union

import uvicorn
from fastapi import FastAPI, Request
from loguru import logger
from pydantic import BaseModel

from .event_type import EVENT_MODEL, BaseEventType


class HandlerConfig:
    escape_bot: bool = True


def _should_escape_bot(config: HandlerConfig, model: BaseModel) -> bool:
    """Check if the sender is a bot and if the event should be escaped."""
    return getattr(model, "sender", None) and config.escape_bot and model.sender.is_bot()


class InterceptHandler(logging.Handler):
    """Intercept standard logging and forward it to loguru."""

    def emit(self, record):
        # Convert the logging record to a loguru record
        level = record.levelname
        frame, depth = logging.currentframe().f_back, 2
        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


class GithubWebhookHandler:
    def __init__(self, log_server: bool = False):
        """
        Initialize the GitHub webhook handler.
        :param log_server: Whether to log server events.
        """
        self.app = FastAPI()
        self.handlers: Dict[str, Dict[str, Callable]] = {}
        self.filters: Dict[str, Dict[str, Callable]] = {}
        self.configs: Dict[str, Dict[str, HandlerConfig]] = {}
        self.debug: bool = False
        self.log_server = log_server

        self._setup_logging()

        @self.app.post("/")
        async def webhook_listener(request: Request):
            """Handle incoming webhook requests from GitHub."""
            try:
                headers = request.headers
                payload = await request.json()
                event_type = headers.get("X-GitHub-Event")
                action = payload.get("action")
                if event_type and action:
                    await self.handle_event(event_type, action, payload)
                return {"status": "ok"}
            except Exception as e:
                logger.error(f"Webhook listener error: {e}")
                return {"status": "error", "details": str(e)}

    def listen(
            self,
            event_type: str,
            action: str,
            filter_func: Optional[Callable[[dict], bool]] = None,
            config: HandlerConfig = HandlerConfig(),
    ):
        def decorator(func: Callable):
            """Decorator to register a handler for a specific event type and action."""
            self.handlers.setdefault(event_type, {})[action] = func
            if filter_func:
                self.filters.setdefault(event_type, {})[action] = filter_func
            self.configs.setdefault(event_type, {})[action] = config

            logger.info(f"Create listener for Event[{event_type}]({action}) --filter {filter_func is not None}")

            @wraps(func)
            async def wrapper(*args, **kwargs):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    logger.error(f"Error in handler for Event[{event_type}]({action}): {e}")
                    raise

            return wrapper

        return decorator

    async def handle_event(self, event_type: str, action: str, payload: dict):
        """Handle incoming GitHub events."""
        handler = self.handlers.get(event_type, {}).get(action)
        if not handler:
            logger.warning(f"Event[{event_type}]({action}) NOT_HANDLED")
            return

        if self._is_filtered(event_type, action, payload):
            logger.info(f"Event[{event_type}]({action}) FILTERED")
            return

        config = self.configs[event_type].get(action, HandlerConfig())
        model = self.get_model(event_type, action, payload)
        if not model:
            logger.warning(f"Event[{event_type}]({action}) NOT_FOUND_MODEL")
            return

        if _should_escape_bot(config, model):
            logger.info(f"Event[{event_type}]({action}) ESCAPE_BOT")
            return

        if self.debug:
            print(f"Event[{event_type}]({action})")
            print(model.model_dump())

        try:
            await handler(model)
        except Exception as e:
            logger.error(f"Error executing handler for Event[{event_type}]({action}): {e}")

    def _is_filtered(self, event_type: str, action: str, payload: dict) -> bool:
        """Check if the event should be filtered based on the filter functions."""
        filter_func = self.filters.get(event_type, {}).get(action)
        if filter_func:
            try:
                return not filter_func(payload)
            except Exception as e:
                logger.error(f"Error in filter function for Event[{event_type}]({action}): {e}")
                # If there is an error, filter the event
                return True
        return False

    @staticmethod
    def get_model(event_type: Union[BaseEventType, str], action: str, payload: dict) -> Optional[BaseModel]:
        """Get the corresponding model for the event type and action."""
        event_type = str(event_type)
        model_class = EVENT_MODEL.get((event_type, action))
        if model_class:
            try:
                return model_class.model_validate(payload)
            except Exception as e:
                logger.error(f"Event[{event_type}]({action}) MODEL_VALIDATE_ERROR")
                logger.error(e)
        return None

    def _setup_logging(self):
        """
        Setup logging for the FastAPI application.
        """
        logging.getLogger("uvicorn").handlers = []
        logging.getLogger("uvicorn").propagate = False

        # Ensure Loguru handles everything
        intercept_handler = InterceptHandler()
        logging.getLogger("uvicorn").addHandler(intercept_handler)
        logging.getLogger("uvicorn.access").addHandler(intercept_handler)
        logging.getLogger("uvicorn.error").addHandler(intercept_handler)

        if self.log_server:
            logging.getLogger("uvicorn.access").setLevel(logging.INFO)
            logging.getLogger("uvicorn.error").setLevel(logging.INFO)
        else:
            logging.getLogger("uvicorn.access").setLevel(logging.ERROR)
            logging.getLogger("uvicorn.error").setLevel(logging.ERROR)

    def run(self, host: str = "0.0.0.0", port: int = 8000):
        """Run the FastAPI application."""
        config = uvicorn.Config(self.app, host=host, port=port, log_config=None)
        server = uvicorn.Server(config)
        logger.info(f"Starting server at {host}:{port}")
        server.run()
