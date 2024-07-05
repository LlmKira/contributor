from loguru import logger

from const import git_integration, get_credentials, fetch_operation
from core.mongo import global_client
from core.openai import OpenAI
from core.openai.cell import UserMessage, SystemMessage
from core.utils import get_repo_setting
from core.webhook.event_type import Issue

format_prompt = """
Organize and refine the content of the issues raised by users according to international standards, ensuring the structure is clear, concise, and readable.
1. If the content involves a process, use a mermaid diagram to explain.
2. If the issue is relatively simple, include possible causes and solutions.
3. If there are multiple issues, use a Markdown table to categorize and explain.
4. Do not add non-existent or uncertain information.
5. Provide the improved content directly without unnecessary descriptions.
6. Do not omit any details.
7. Use formal language and maintain a consistent style.
**8. Dont write the content that is not exist in original content.**
"""


# @webhook_handler.listen(Issue, action=Issue.OPENED, unique_id="issue_title_unify")
async def issue_body_format(event: Issue.OPENED_EVENT):
    logger.info("Received Issue.OPEN event")
    repo = event.repository.get_repo(git_integration)
    repo_setting = get_repo_setting(
        repo_name=event.repository.full_name,
        repo=repo
    )
    if not repo_setting.issue_body_format:
        return logger.debug("issue_body_format is disabled")
    operation = await fetch_operation(
        repo_name=event.repository.full_name,
        issue_id=event.issue.id
    )
    if not operation:
        return logger.error("Failed to fetch issue operation")
    if operation.body_format:
        return logger.debug("Issue body_format has been unified")
    prompt_rule = repo_setting.issue_body_format_prompt or format_prompt
    try:
        credit_card, oai_credential = await get_credentials(
            repo_name=event.repository.full_name,
            repo=repo
        )
    except Exception as e:
        return logger.info(f"Skip get credit: {e}")
    body = event.issue.body or "No description provided."
    prompt = (
        f"Issue:"
        f"\n## {event.issue.title}"
        f"\n{body}"
        f"\n\nRule: {prompt_rule}"
        f"\nPlease standardize the body of this issue in {repo_setting.language}."
    )
    repo_details = (
        f"Hint: This issue is from {event.repository.owner.login}"
        f"\nRepository: {event.repository.full_name}"
        f"\nRepo Desc: {event.repository.description}"
        f"\nRepo Topics: {event.repository.topics}"
    )
    try:
        oai_result = await OpenAI(
            model=credit_card.apiModel,
            messages=[
                SystemMessage(content="You are a github bot, you are helping to improve the issue content."),
                UserMessage(content=repo_details),
                UserMessage(content=prompt)
            ]
        ).request(
            session=oai_credential
        )
        better_issue = oai_result.default_message.content
    except Exception as e:
        logger.error(f"Failed to unify issue body: {e}")
        return None
    if better_issue:
        logger.info(f"Update issue body to {event.issue.html_url}")
        issue = event.get_issue(integration=git_integration)
        edited_body = (f"{issue.body}"
                       f"\n----"
                       "\n<details>"
                       "\n<summary>Summary</summary>"
                       "\n</details>"
                       )
        issue.edit(
            body=edited_body
        )
        operation.body_format = better_issue
        await global_client.save(operation)
