# -*- coding: utf-8 -*-
# @Time    : 2023/11/15 下午10:19
# @Author  : sudoskys
# @File    : note_github_bot_test.py
# @Software: PyCharm

from github import Github, GithubIntegration

from settings.server import ServerSetting
from webhook.event.issue_comment import CreateIssueCommentEvent
from webhook.event.issues import OpenIssueOpenEvent
from webhook.event_type import Issue, IssueComment
from webhook.handler import GithubWebhookHandler

git_integration = GithubIntegration(
    ServerSetting.github_app_id,
    ServerSetting.github_private_key.get_secret_value(),
)

# Example usage
webhook_handler = GithubWebhookHandler()
webhook_handler.debug = True


@webhook_handler.listen(Issue, action=Issue.OPEN)
async def handle_issue_open(event: OpenIssueOpenEvent):
    print("Handling issue open event")
    print(f"Issue: {event.issue.title}")


@webhook_handler.listen(IssueComment, action=IssueComment.CREATED)
async def handle_issue_comment(event: CreateIssueCommentEvent):
    print("Handling issue comment event")
    # Add your logic here
    owner = event.repository.owner.login
    repo_name = event.repository.name
    git_connection = Github(
        login_or_token=git_integration.get_access_token(
            git_integration.get_repo_installation(owner, repo_name).id
        ).token
    )
    repo = git_connection.get_repo(f"{owner}/{repo_name}")
    issue = repo.get_issue(number=event.issue.number)
    issue.create_comment(f"Hello World!")


if __name__ == "__main__":
    webhook_handler.run(ServerSetting.host, ServerSetting.port)
