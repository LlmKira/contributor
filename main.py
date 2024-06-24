# -*- coding: utf-8 -*-
# @Author  : sudoskys
import hashlib
import hmac
import os
import time
from typing import List

import aiohttp
from dotenv import load_dotenv
from github import GithubIntegration
from loguru import logger
from pydantic import BaseModel, Field, SecretStr

from app.openai import OpenAI, OpenAICredential, OpenAIResult
from app.openai.cell import UserMessage, SystemMessage
from app.utils import get_repo_setting, Card, RepoSetting
from settings.server import ServerSetting
from webhook.event_type import Issue
from webhook.handler import GithubWebhookHandler

load_dotenv()

git_integration = GithubIntegration(
    integration_id=ServerSetting.github_app_id,
    private_key=ServerSetting.github_private_key.get_secret_value(),
    user_agent="pygithub/Python",
)


async def fetch_credit(card_id):
    token_secret = ServerSetting.token_secret
    dashboard_api = ServerSetting.dashboard_api_url
    async with aiohttp.ClientSession() as session:
        current_second = str(int(time.time()))
        time_token = hmac.new(token_secret.encode(), current_second.encode(), hashlib.sha256).hexdigest()
        url = f"{dashboard_api}/internal/cards/{card_id}"
        params = {'timeToken': time_token}
        async with session.get(url, params=params) as response:
            if response.status == 200:
                data = await response.json()
                return Card.model_validate(data)
            elif response.status == 400:
                raise Exception(f"Missing timeToken {card_id}")
            elif response.status == 401:
                raise Exception(f"Invalid timeToken {card_id}")
            elif response.status == 404:
                logger.warning(f"Card or User not found {card_id}")
                return None
            else:
                raise Exception(f"Request failed with status: {response.status}")


async def get_credit(repo_setting: RepoSetting):
    # 获取仓库的设置
    if not repo_setting.contributor:
        raise Exception("Not Configured")
    try:
        oai_credit = await fetch_credit(card_id=repo_setting.contributor)
        if oai_credit.disabled:
            raise Exception("Card is disabled")
    except Exception as e:
        raise e
    oai_credential = OpenAICredential(api_key=SecretStr(oai_credit.apiKey), base_url=oai_credit.openaiEndpoint)
    return oai_credit, oai_credential


webhook_handler = GithubWebhookHandler()
webhook_handler.debug = True if os.getenv("DEBUG") else False
if webhook_handler.debug:
    print("Debug mode enabled")


@webhook_handler.listen(Issue, action=Issue.OPENED, unique_id="issue_auto_label")
async def issue_auto_label(event: Issue.OPENED_EVENT):
    # TODO: 检索历史 issue，然后自动标记
    logger.info("Received Issue.OPEN event")
    # 先查找仓库的设置
    repo_setting = get_repo_setting(
        repo_name=event.repository.full_name,
        repo=event.repository.get_repo(git_integration)
    )
    if not repo_setting.issue_auto_label:
        return logger.debug("Issue auto label is disabled")
    try:
        oai_credit, oai_credential = await get_credit(repo_setting)
    except Exception as e:
        return logger.info(f"Skip get credit: {e}")
    # 获取标题和内容
    print(f"Issue: {event.issue.title}")
    print(f"Body: {event.issue.body}")
    issue = event.get_issue(integration=git_integration)
    # 查找有哪些标签
    labels = event.repository.get_repo(git_integration).get_labels()
    logger.debug(f"Get labels {labels.__str__()}")

    # 询问 AI
    class Label(BaseModel):
        best_labels: List[str] = Field([], description="few best labels")

    prompt = (
        f"Issue: {event.issue.title}"
        f"\nBody: {event.issue.body}"
        f"\nIssue URL: {event.issue.html_url}"
        f"\nLabels: {', '.join([label.name for label in labels])}"
        f"\n\nPlease select the most appropriate label for this issue."
        f"\nThe number of labels is limited to 0～3."
    )
    logger.debug(f"Prompt: {prompt}")
    # 询问 AI
    try:
        extract_label: Label = await OpenAI(
            model=oai_credit.apiModel,
            messages=[
                UserMessage(content=prompt),
            ]).extract(
            response_model=Label,
            session=oai_credential
        )
    except Exception as e:
        logger.error(f"Failed to get labels: {e}")
        return
    else:
        logger.info(f"Add labels: {extract_label.best_labels[:3]} to issue {event.issue.html_url}")
        issue.add_to_labels(*extract_label.best_labels[:3])


@webhook_handler.listen(Issue, action=Issue.CLOSED, unique_id="close_issue_with_report")
async def close_issue_with_report(event: Issue.CLOSED_EVENT):
    logger.info("Received Issue.CLOSED event")
    # 先查找仓库的设置
    repo_setting = get_repo_setting(
        repo_name=event.repository.full_name,
        repo=event.repository.get_repo(git_integration)
    )
    if not repo_setting.issue_close_with_report:
        return logger.debug("Issue close with report is disabled")
    try:
        oai_credit, oai_credential = await get_credit(repo_setting)
    except Exception as e:
        return logger.info(f"Skip get credit: {e}")
    oai_body = []
    issue = event.repository.get_issue(integration=git_integration, issue_number=event.issue.number)
    oai_body.append(f"Issue: {event.issue.title}")
    oai_body.append(f"Content: {event.issue.body}")
    comments = issue.get_comments()
    selected_comments = {}
    if comments:
        # 只获取第一个和最后一个评论
        if comments.totalCount > 2:
            selected_comments[comments[0].id] = comments[0]
            selected_comments[comments[-1].id] = comments[-1]
            # 创建反应表并选择两个最高的评论
            reaction_table = [(comment.reactions.get("total_count", 0), comment) for comment in comments]
            top_reactions = sorted(reaction_table, key=lambda x: x[0], reverse=True)[:2]
            for count, comment in top_reactions:
                if count > 0:
                    selected_comments[comment.id] = comment
        else:
            selected_comments = {comment.id: comment for comment in comments}
        # 按照 ID 排序，小的在前面
        selected_comments = dict(sorted(selected_comments.items(), key=lambda x: x[0]))
        # 加入评论
        for comment in selected_comments.values():
            oai_body.append(
                f"Comment#{comment.id}:\n"
                f" @{comment.user.login} said:"
                f" {comment.body}\n"
            )
        if issue.pull_request:
            oai_body.append(f"Pull Request: {issue.pull_request.html_url}")
        oai_body.append(f"Report Using Language: {repo_setting.language}")
    logger.debug(f"Prompt: {oai_body}")
    try:
        report: OpenAIResult = await OpenAI(
            model=oai_credit.apiModel,
            messages=[
                SystemMessage(content="You are a github bot, you are helping to close the issue."),
                UserMessage(content="\n".join(oai_body)),
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
    except Exception as e:
        logger.error(f"Failed to get report: {e}")
        return
    else:
        logger.info(f"Add report to issue {event.issue.html_url}")
        issue.create_comment(report.default_message.content)


if __name__ == "__main__":
    webhook_handler.run(ServerSetting.host, ServerSetting.port)
