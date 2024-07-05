from loguru import logger

from const import git_integration, get_credentials, fetch_operation
from core.credit import AIPromptProcessor
from core.mongo import global_client
from core.utils import get_repo_setting
from core.webhook.event_type import Issue


# @webhook_handler.listen(Issue, action=Issue.OPENED, unique_id="issue_auto_label")
async def issue_auto_label(event: Issue.OPENED_EVENT):
    logger.info("Received Issue.OPEN event")
    repo = event.repository.get_repo(git_integration)
    repo_setting = get_repo_setting(
        repo_name=event.repository.full_name,
        repo=repo
    )
    if not repo_setting.issue_auto_label:
        return logger.debug("Issue auto label is disabled")

    operation = await fetch_operation(
        repo_name=event.repository.full_name,
        issue_id=event.issue.id
    )
    if not operation:
        return logger.error("Failed to fetch issue operation")
    if operation.labels:
        return logger.debug("Issue has been labeled")

    try:
        credit_card, oai_credential = await get_credentials(
            repo_name=event.repository.full_name,
            repo=repo
        )
    except Exception as e:
        return logger.info(f"Skip get credit: {e}")

    labels = repo.get_labels()
    logger.debug(f"Get labels {labels}")

    extract_label = await AIPromptProcessor.get_labels(
        oai_credential=oai_credential,
        credit_card=credit_card,
        title=event.issue.title,
        body=event.issue.body,
        issue_url=event.issue.html_url,
        labels=labels
    )

    if extract_label:
        best_labels = extract_label.best_labels[:3]
        logger.info(f"Add labels: {best_labels} to issue {event.issue.html_url}")
        issue = event.get_issue(integration=git_integration)
        issue.add_to_labels(*best_labels)
        operation.labels = best_labels
        await global_client.save(operation)
