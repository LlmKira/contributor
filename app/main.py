# -*- coding: utf-8 -*-
# @Author  : sudoskys
import asyncio
import os
from typing import List

from dotenv import load_dotenv
from github import GithubIntegration
from github.Repository import Repository
from loguru import logger
from pydantic import BaseModel, Field, SecretStr

from app.openai import OpenAI, OpenAICredential
from app.openai.cell import UserMessage
from app.utils import load_toml_string
from cache import ExpiringDict
from settings.github import GithubSettings
from settings.server import ServerSetting
from webhook.event.issue_comment import CreateIssueCommentEvent
from webhook.event.issues import OpenedIssueOpenEvent
from webhook.event_type import Issue, IssueComment
from webhook.handler import GithubWebhookHandler

load_dotenv()
setting_cache = ExpiringDict(max_len=100, max_age_seconds=60 * 60 * 12)  # 12 hours
git_integration = GithubIntegration(
    integration_id=ServerSetting.github_app_id,
    private_key=ServerSetting.github_private_key.get_secret_value(),
    user_agent="pygithub/Python",
)
oai_api_key = os.getenv("OAI_KEY", None)
oai_model = os.getenv("OAI_MODEL", "gpt-3.5-turbo")
oai_endpoint = os.getenv("OAI_ENDPOINT", "https://api.openai.com/v1")
if not oai_api_key or not oai_model or not oai_endpoint:
    raise ValueError("OpenAI environment variables are not set")
oai_credential = OpenAICredential(api_key=SecretStr(oai_api_key), base_url=oai_endpoint)
webhook_handler = GithubWebhookHandler()
webhook_handler.debug = True if os.getenv("DEBUG") else False
if webhook_handler.debug:
    print("Debug mode enabled")


class RepoSetting(BaseModel):
    """
    Repository settings
    """
    language: str = "Chinese"
    issue_auto_label: bool = True
    issue_auto_tidy: bool = False
    issue_close_with_report: bool = False
    pr_auto_label: bool = False
    pr_auto_review: bool = False
    pr_auto_merge: bool = False


def get_repo_setting(repo_name: str, repo: Repository) -> RepoSetting:
    repo_setting = setting_cache.get(repo_name)
    if repo_setting:
        return repo_setting
    repo_setting = RepoSetting()
    try:
        repo_setting_file = repo.get_contents(".nerve.toml")
    except Exception as e:
        logger.error(f"Failed to get repo setting file: {e}")
    else:
        if repo_setting_file:
            repo_setting_string = load_toml_string(repo_setting_file.decoded_content.decode())
            if repo_setting_string:
                repo_setting = RepoSetting.model_validate(repo_setting_string)
    setting_cache.set(repo_name, repo_setting)
    return repo_setting


@webhook_handler.listen(Issue, action=Issue.OPENED, unique_id="Issue opened")
async def handle_issue_open(event: OpenedIssueOpenEvent):
    # TODO: 检索历史 issue，然后自动标记
    logger.info("Received Issue.OPEN event")
    # 先查找仓库的设置
    repo_setting = get_repo_setting(
        event.repository.full_name,
        event.repository.get_repo(git_integration)
    )
    if not repo_setting.issue_auto_label:
        return logger.debug("Issue auto label is disabled")
    # 获取仓库的设置
    if not GithubSettings.is_owner(uid=event.repository.owner.login):
        return logger.debug("Not owner")
    # 获取标题和内容
    print(f"Issue: {event.issue.title}")
    print(f"Body: {event.issue.body}")
    issue = event.get_issue(integration=git_integration)
    # 查找有哪些标签
    labels = event.repository.get_repo(git_integration).get_labels()
    logger.debug(f"Get labels {labels}")

    # 询问 AI
    class Label(BaseModel):
        best_labels: List[str] = Field([], description="few best labels")

    prompt = (
        f"Issue: {event.issue.title}\nBody: {event.issue.body}"
        f"\nIssue URL: {event.issue.html_url}"
        f"\nLabels: {', '.join([label.name for label in labels])}"
        f"\n\nPlease select the most appropriate label for this issue."
        f"\nThe number of labels is limited to 0～3."
    )
    # 询问 AI
    extract_label: Label = await OpenAI(
        model=oai_model,
        messages=[
            UserMessage(content=prompt),
        ]).extract(
        response_model=Label,
        session=oai_credential
    )
    logger.info(f"Add labels: {extract_label.best_labels[:3]} to issue {event.issue.html_url}")
    issue.add_to_labels(*extract_label.best_labels[:3])


@webhook_handler.listen(IssueComment, action=IssueComment.CREATED, unique_id="Issue comment created")
async def handle_issue_comment(event: CreateIssueCommentEvent):
    logger.info("Received IssueComment.CREATED event")
    # 先查找仓库的设置
    repo_setting = get_repo_setting(
        event.repository.full_name,
        event.repository.get_repo(git_integration)
    )
    issue = event.repository.get_issue(integration=git_integration, issue_number=event.issue.number)
    comment = issue.create_comment(f"Hello World!")
    await asyncio.sleep(5)
    issue.get_comment(comment.id).edit("Hello World! Edited")  # 编辑一个评论需要 comment id 和 issue number，还有
    print(f"Issue: {event.issue.title}")
    print(f"Comment: {event.comment.body}")


if __name__ == "__main__":
    webhook_handler.run(ServerSetting.host, ServerSetting.port)
