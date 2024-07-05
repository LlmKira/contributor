# -*- coding: utf-8 -*-
# @Author  : sudoskys
import os

from dotenv import load_dotenv
from github import GithubIntegration
from loguru import logger

from core.credit import CreditFetcher, AIPromptProcessor
from core.mongo import global_mongodb_instance
from core.mongo_odm import IssueOperation
from core.utils import get_repo_setting
from core.webhook.event_type import Issue
from core.webhook.handler import GithubWebhookHandler
from settings.server import ServerSetting

load_dotenv()

webhook_handler = GithubWebhookHandler()
webhook_handler.debug = bool(os.getenv("DEBUG"))
if webhook_handler.debug:
    print("Debug mode enabled")

git_integration = GithubIntegration(
    integration_id=ServerSetting.github_app_id,
    private_key=ServerSetting.github_private_key.get_secret_value(),
    user_agent="pygithub/Python",
)


@webhook_handler.listen(Issue, action=Issue.OPENED, unique_id="issue_auto_label")
async def issue_auto_label(event: Issue.OPENED_EVENT):
    logger.info("Received Issue.OPEN event")
    repo_setting = get_repo_setting(
        repo_name=event.repository.full_name,
        repo=event.repository.get_repo(git_integration)
    )
    if not repo_setting.issue_auto_label:
        return logger.debug("Issue auto label is disabled")
    try:
        credit_card, oai_credential = await CreditFetcher.get(
            repo_setting,
            dash_api=ServerSetting.dashboard_api,
            token_secret=ServerSetting.token_secret
        )
    except Exception as e:
        return logger.info(f"Skip get credit: {e}")

    labels = event.repository.get_repo(git_integration).get_labels()
    logger.debug(f"Get labels {labels.__str__()}")
    extract_label = await AIPromptProcessor.get_labels(
        oai_credential=oai_credential,
        credit_card=credit_card,
        title=event.issue.title,
        body=event.issue.body,
        issue_url=event.issue.html_url,
        labels=labels
    )
    if extract_label:
        logger.info(f"Add labels: {extract_label.best_labels[:3]} to issue {event.issue.html_url}")
        issue = event.get_issue(integration=git_integration)
        issue.add_to_labels(*extract_label.best_labels[:3])
        global_mongodb_instance.find_one(
            IssueOperation,
            IssueOperation.issue_id == event.issue.id,
        )


@webhook_handler.listen(Issue, action=Issue.CLOSED, unique_id="close_issue_with_report")
async def close_issue_with_report(event: Issue.CLOSED_EVENT):
    logger.info("Received Issue.CLOSED event")
    repo_setting = get_repo_setting(
        repo_name=event.repository.full_name,
        repo=event.repository.get_repo(git_integration)
    )
    if not repo_setting.issue_close_with_report:
        return logger.debug("Issue close with report is disabled")
    try:
        credit_card, oai_credential = await CreditFetcher.get(
            repo_setting=repo_setting,
            dash_api=ServerSetting.dashboard_api_url,
            token_secret=ServerSetting.token_secret
        )
    except Exception as e:
        return logger.info(f"Skip get credit: {e}")

    oai_body = [f"Issue: {event.issue.title}", f"Content: {event.issue.body}"]
    issue = event.repository.get_issue(integration=git_integration, issue_number=event.issue.number)
    comments = issue.get_comments()
    selected_comments = {}
    if comments:
        if comments.totalCount > 2:
            selected_comments[comments[0].id] = comments[0]
            selected_comments[comments[-1].id] = comments[-1]
            reaction_table = [(comment.reactions.get("total_count", 0), comment) for comment in comments]
            top_reactions = sorted(reaction_table, key=lambda x: x[0], reverse=True)[:2]
            for _, comment in top_reactions:
                if comment.reactions.get("total_count", 0) > 0:
                    selected_comments[comment.id] = comment
        else:
            selected_comments = {comment.id: comment for comment in comments}

        selected_comments = dict(sorted(selected_comments.items(), key=lambda x: x[0]))
        for comment in selected_comments.values():
            oai_body.append(f"Comment#{comment.id}:\n @{comment.user.login} said: {comment.body}\n")
        if issue.pull_request:
            oai_body.append(f"Pull Request: {issue.pull_request.html_url}")
        oai_body.append(f"Report Using Language: {repo_setting.language}")

    logger.debug(f"Prompt: {oai_body}")
    report_content = await AIPromptProcessor.create_issue_report(
        oai_credential=oai_credential,
        credit_card=credit_card,
        docs=oai_body
    )
    if report_content:
        logger.info(f"Add report to issue {event.issue.html_url}")
        issue.create_comment(report_content)
        #  issue.get_comment(id=222).edit("some text")


if __name__ == "__main__":
    webhook_handler.run(ServerSetting.host, ServerSetting.port)
