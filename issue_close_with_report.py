# -*- coding: utf-8 -*-
# @Author  : sudoskys
from typing import List

from github.Issue import Issue as GithubIssue
from github.IssueComment import IssueComment
from github.PaginatedList import PaginatedList
from loguru import logger

from const import git_integration, get_credentials, fetch_operation
from core.mongo import global_client
from core.openai import OpenAI
from core.openai.cell import SystemMessage, UserMessage
from core.utils import get_repo_setting
from core.webhook.event_type import Issue

prompt_rule = """
Write a brief, formal report describing the solution and final outcome of an issue. Specific requirements are as follows:

1. **Avoid content repetition and consolidate descriptions.**
2. **Do not fabricate nonexistent information or contributors.**
3. **Improve formatting using formal language.**
4. **Use Markdown tables or Mermaid flowcharts if the situation is complex.**
5. **Maintain a concise and consistent style throughout the report.**
6. **You may thank contributors at the end.**
"""


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
        assert prompt_docs, "Empty docs"
        report = await OpenAI(
            model=credit_card.apiModel,
            messages=[
                SystemMessage(content="You are a github contributor, you are helping to write a report."),
                UserMessage(content="\n".join(prompt_docs)),
                UserMessage(
                    content=f"\n{prompt_rule}"
                            f"**Please write a closed report for this issue in {repo_setting.language}.**"
                )
            ]).request(
            session=oai_credential
        )
        assert report.default_message.content, "Empty report"
        report_content = report.default_message.content
    except Exception as e:
        logger.error(f"Failed to get report: {e}")
        return None

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
    # 创建
    oai_body.append(
        f">Created By: @{event.issue.user.login} \nCreated At: {event.issue.created_at.strftime('%Y-%m-%d %H:%M:%S')}"
    )
    # 关闭
    oai_body.append(
        f">Closed By: @{event.sender.login} \nClosed At: {event.issue.closed_at.strftime('%Y-%m-%d %H:%M:%S')}"
    )
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
        saved_issue.report_comment_id = reply.id
        await global_client.save(saved_issue)
