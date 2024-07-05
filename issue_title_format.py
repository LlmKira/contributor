from loguru import logger
from pydantic import BaseModel, Field

from const import git_integration, get_credentials, fetch_operation
from core.mongo import global_client
from core.openai import OpenAI
from core.openai.cell import UserMessage
from core.utils import get_repo_setting
from core.webhook.event_type import Issue

format_prompt = """
Issue Title Guidelines:
Concise: The title should clearly and succinctly describe the problem or task.
Use verbs: Start with a verb to clearly indicate the required action.
Indicate priority or type: Use labels or prefixes for categorization.
Consistent naming style: Maintain a consistent format.
Include necessary context: Provide enough information to avoid ambiguity.

Examples:
    Bug: Fix login page redirect issue
    Feature: Add dark mode option
"""


# @webhook_handler.listen(Issue, action=Issue.OPENED, unique_id="issue_title_unify")
async def issue_title_format(event: Issue.OPENED_EVENT):
    logger.info("Received Issue.OPEN event")
    repo = event.repository.get_repo(git_integration)
    repo_setting = get_repo_setting(
        repo_name=event.repository.full_name,
        repo=repo
    )
    if not repo_setting.issue_title_format:
        return logger.debug("issue_title_format is disabled")
    operation = await fetch_operation(
        repo_name=event.repository.full_name,
        issue_id=event.issue.id
    )
    if not operation:
        return logger.error("Failed to fetch issue operation")
    if operation.title_format:
        return logger.debug("Issue title has been unified")
    prompt_rule = repo_setting.issue_title_format_prompt or format_prompt
    try:
        credit_card, oai_credential = await get_credentials(
            repo_name=event.repository.full_name,
            repo=repo
        )
    except Exception as e:
        return logger.info(f"Skip get credit: {e}")
    prompt = (
        f"Issue: {event.issue.title}"
        f"\nContent: {event.issue.body}"
        f"\n\nFormat: {prompt_rule}"
        f"\nPlease standardize the title of this issue in English."
    )
    try:
        better_issue: FormatResult = await OpenAI(
            model=credit_card.apiModel,
            messages=[UserMessage(content=prompt)]
        ).extract(
            response_model=FormatResult,
            session=oai_credential
        )
    except Exception as e:
        logger.error(f"Failed to unify issue title: {e}")
        return None
    if better_issue:
        title = better_issue.title
        logger.info(f"Standardized title: {title}")
        issue = event.get_issue(integration=git_integration)
        issue.edit(
            title=title
        )
        operation.title_format = title
        await global_client.save(operation)


class FormatResult(BaseModel):
    """
    Standardize issue title
    """
    title: str = Field(..., description="Standardized title")
