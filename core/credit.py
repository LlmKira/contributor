import hashlib
import hmac
import time
from typing import List

import aiohttp
from loguru import logger
from pydantic import SecretStr, BaseModel, Field

from .openai import OpenAICredential, OpenAI
from .openai.cell import UserMessage, SystemMessage
from .utils import Card, RepoSetting


class CreditFetcher:
    @staticmethod
    async def fetch(
            card_id: str,
            dashboard_api: str,
            token_secret: str
    ):
        async with aiohttp.ClientSession() as session:
            current_second = str(int(time.time()))
            time_token = hmac.new(token_secret.encode(), current_second.encode(), hashlib.sha256).hexdigest()
            url = f"{dashboard_api}/internal/cards/{card_id}"
            params = {'timeToken': time_token}
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return Card.model_validate(data)
                elif response.status in {400, 401, 404}:
                    message = (
                        "Missing timeToken" if response.status == 400 else
                        "Invalid timeToken" if response.status == 401 else
                        "Card or User not found"
                    )
                    raise Exception(f"{message} {card_id}")
                else:
                    raise Exception(f"Request failed with status: {response.status}")

    @staticmethod
    async def get(
            repo_setting: RepoSetting,
            dash_api: str,
            token_secret: str
    ) -> (Card, OpenAICredential):
        if not repo_setting.contributor:
            raise Exception("Not Configured")
        try:
            credit_card = await CreditFetcher.fetch(
                card_id=repo_setting.contributor,
                dashboard_api=dash_api,
                token_secret=token_secret
            )
            if credit_card.disabled:
                raise Exception("Card is disabled")
        except Exception as e:
            raise e
        oai_credential = OpenAICredential(api_key=SecretStr(credit_card.apiKey), base_url=credit_card.openaiEndpoint)
        return credit_card, oai_credential


class AIPromptProcessor:
    class Label(BaseModel):
        best_labels: List[str] = Field([], description="few best labels")

    @staticmethod
    async def get_labels(
            title: str,
            body: str,
            issue_url: str,
            labels: List,
            oai_credential: OpenAICredential,
            credit_card: Card
    ):
        """
        Get the best labels for the issue
        """
        prompt = (
            f"Issue: {title}"
            f"\nBody: {body}"
            f"\nIssue URL: {issue_url}"
            f"\nLabels: {', '.join([label.name for label in labels])}"
            f"\n\nPlease select the most appropriate label for this issue."
            f"\nThe number of labels is limited to 0~3."
        )
        try:
            return await OpenAI(
                model=credit_card.apiModel,
                messages=[UserMessage(content=prompt)]
            ).extract(
                response_model=AIPromptProcessor.Label,
                session=oai_credential
            )
        except Exception as e:
            logger.error(f"Failed to get labels: {e}")
            return None

    @staticmethod
    async def create_issue_report(
            oai_credential: OpenAICredential,
            credit_card: Card,
            docs: List[str] = None
    ):
        try:
            assert docs, "Empty docs"
            report = await OpenAI(
                model=credit_card.apiModel,
                messages=[
                    SystemMessage(content="You are a github bot, you are helping to close the issue."),
                    UserMessage(content="\n".join(docs)),
                    UserMessage(
                        content="Give a **report** based on the information you have. "
                                "*If it is not mentioned in the text, then there is no need to write it.*"
                                "The report should be concise and clear."
                                "Summarize the problems users encountered and how they were solved."
                                "You can also use `mermaid` to draw a flowchart.\n"
                                "**Please write a closed report for this issue.**"
                    )
                ]).request(
                session=oai_credential
            )
            assert report.default_message.content, "Empty report"
            return report.default_message.content
        except Exception as e:
            logger.error(f"Failed to get report: {e}")
            return None
