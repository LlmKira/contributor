# -*- coding: utf-8 -*-
# @Author  : sudoskys
from typing import List

from github.Issue import Issue as GithubIssue
from github.IssueComment import IssueComment
from github.PaginatedList import PaginatedList
from loguru import logger

from const import git_integration, get_credentials, fetch_operation
from core.credit import AIPromptProcessor
from core.utils import get_repo_setting
from core.webhook.event_type import Issue


# @webhook_handler.listen(Issue, action=Issue.CLOSED, unique_id="close_issue_with_report")
async def close_issue_with_report(event: Issue.CLOSED_EVENT) -> None:
    logger.info("Received Issue.CLOSED event")
    repo = event.repository.get_repo(git_integration)
    repo_setting = get_repo_setting(
        repo_name=event.repository.full_name,
        repo=repo
    )
    if not repo_setting.issue_close_with_report:
        return logger.debug("Issue close with report is disabled")
    operation = await fetch_operation(
        repo_name=event.repository.full_name,
        issue_id=event.issue.id
    )
    if not operation:
        return logger.error("Failed to fetch issue operation")
    if operation.report_comment_id:
        logger.debug("Issue has been reported")
        pass
    try:
        credit_card, oai_credential = await get_credentials(
            repo_name=event.repository.full_name,
            repo=repo
        )
    except Exception as e:
        logger.info(f"Skip get credit: {e}")
        return

    prompt_docs = generate_prompt(event, repo_setting)
    logger.debug(f"Prompt: {prompt_docs}")

    try:
        report_content = await AIPromptProcessor.create_issue_report(
            oai_credential=oai_credential,
            credit_card=credit_card,
            docs=prompt_docs
        )
    except Exception as e:
        logger.error(f"Failed to create issue report: {e}")
        return

    if report_content:
        logger.info(f"Add report to issue {event.issue.html_url}")
        await update_state(event, report_content)


def generate_prompt(event: Issue.CLOSED_EVENT, repo_setting) -> List[str]:
    oai_body = [f"Issue: {event.issue.title}", f"Content: {event.issue.body}"]
    issue: GithubIssue = event.repository.get_issue(integration=git_integration, issue_number=event.issue.number)
    comments: PaginatedList[IssueComment] = issue.get_comments()
    selected_comments = {}
    if comments:
        if comments.totalCount > 2:
            first_comment = comments[0]
            last_comment = comments[-1]
            selected_comments[first_comment.id] = first_comment
            selected_comments[last_comment.id] = last_comment

            reactions = [(comment.reactions.get("total_count", 0), comment) for comment in comments]
            top_reactions = sorted(reactions, key=lambda x: x[0], reverse=True)[:2]

            for _, comment in top_reactions:
                if comment.reactions.get("total_count", 0) > 0:
                    selected_comments[comment.id] = comment
        else:
            selected_comments = {comment.id: comment for comment in comments}

        selected_comments = dict(sorted(selected_comments.items()))
    for comment in selected_comments.values():
        oai_body.append(f"Comment#{comment.id}:\n @{comment.user.login} said: {comment.body}\n")

    if issue.pull_request:
        oai_body.append(f"Pull Request: {issue.pull_request.html_url}")

    oai_body.append(f"Report Using Language: {repo_setting.language}")
    return oai_body


async def update_state(event: Issue.CLOSED_EVENT, report_content: str) -> None:
    issue: GithubIssue = event.repository.get_issue(integration=git_integration, issue_number=event.issue.number)
    saved_issue = await fetch_operation(
        repo_name=event.repository.full_name,
        issue_id=event.issue.number
    )
    if not saved_issue:
        return logger.error("Failed to fetch issue operation")
    if saved_issue.report_comment_id:
        reply = issue.get_comment(saved_issue.report_comment_id)
        reply.edit(report_content)
    else:
        reply = issue.create_comment(report_content)
        await saved_issue.update(
            report_comment_id=reply.id
        )  # noqa
