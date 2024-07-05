import os

from dotenv import load_dotenv
from github import GithubIntegration
from github.Repository import Repository
from loguru import logger

from core.credit import CreditFetcher
from core.mongo import IssueOperation
from core.utils import get_repo_setting
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


async def get_credentials(repo_name, repo: Repository):
    return await CreditFetcher.get(
        repo_setting=get_repo_setting(
            repo_name=repo_name,
            repo=repo
        ),
        dash_api=ServerSetting.dashboard_api_url,
        token_secret=ServerSetting.token_secret
    )


async def fetch_operation(
        issue_id: int, repo_name: str
):
    try:
        saved_issue = await IssueOperation.find_one(
            IssueOperation.issue_id == issue_id,  # noqa
            IssueOperation.repo_name == repo_name  # noqa
        )
        if not saved_issue:
            saved_issue = IssueOperation(
                issue_id=issue_id,
                repo_name=repo_name,
            )
            await saved_issue.insert()  # noqa
        return saved_issue
    except Exception as e:
        logger.error(f"Failed to save issue operation: {e}")
        return None
