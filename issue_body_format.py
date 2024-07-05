from loguru import logger

from const import git_integration, get_credentials, fetch_operation
from core.mongo import global_client
from core.openai import OpenAI
from core.openai.cell import UserMessage, SystemMessage
from core.utils import get_repo_setting
from core.webhook.event_type import Issue

format_prompt = """
按照国际规范整理改善用户提出的 issue 的内容，确保结构清晰、简洁、易读。
1. 如果内容涉及流程，可以使用 mermaid 图表进行解释。
2. 如果问题较为简单，附加推测原因和解决方案。
3. 如果含有多个问题，可以尝试使用Markdown表格进行分类说明。
4. 不要添加不存在的或者不确定的信息。
5. 直接给出改善后的内容，不需要多余的描述。
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
    prompt = (
        f"Issue:"
        f"\n## {event.issue.title}"
        f"\n{event.issue.body}"
        f"\n\nRule: {prompt_rule}"
        f"\nPlease standardize the body of this issue in {repo_setting.language}."
    )
    try:
        oai_result = await OpenAI(
            model=credit_card.apiModel,
            messages=[
                SystemMessage(content="You are a github bot, you are helping to improve the issue content."),
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
        logger.info(f"Update issue body to {better_issue}")
        issue = event.get_issue(integration=git_integration)
        issue.edit(
            body=better_issue
        )
        operation.body_format = better_issue
        await global_client.save(operation)
