# -*- coding: utf-8 -*-
# @Author  : sudoskys
import asyncio
import os

from github import GithubIntegration
from loguru import logger

from settings.server import ServerSetting
from webhook.event.issue_comment import CreateIssueCommentEvent
from webhook.event.issues import OpenIssueOpenEvent
from webhook.event_type import Issue, IssueComment
from webhook.handler import GithubWebhookHandler

git_integration = GithubIntegration(
    integration_id=ServerSetting.github_app_id,
    private_key=ServerSetting.github_private_key.get_secret_value(),
    user_agent="pygithub/Python",
)

webhook_handler = GithubWebhookHandler()
webhook_handler.debug = True if os.getenv("DEBUG") else False
if webhook_handler.debug:
    print("Debug mode enabled")


@webhook_handler.listen(Issue, action=Issue.OPEN)
async def handle_issue_open(event: OpenIssueOpenEvent):
    logger.info("Received Issue.OPEN event")
    print(f"Issue: {event.issue.title}")


@webhook_handler.listen(IssueComment, action=IssueComment.CREATED)
async def handle_issue_comment(event: CreateIssueCommentEvent):
    logger.info("Received IssueComment.CREATED event")
    issue = event.repository.get_issue(integration=git_integration, issue_number=event.issue.number)
    comment = issue.create_comment(f"Hello World!")
    await asyncio.sleep(5)
    issue.get_comment(comment.id).edit("Hello World! Edited")  # 编辑一个评论需要 comment id 和 issue number，还有
    print(f"Issue: {event.issue.title}")


if __name__ == "__main__":
    webhook_handler.run(ServerSetting.host, ServerSetting.port)
