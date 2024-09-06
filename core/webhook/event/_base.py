# -*- coding: utf-8 -*-

from abc import ABC, abstractmethod
from typing import Optional, Union, Literal, List

from github import GithubIntegration, Github
from github.CommitComment import CommitComment as GithubCommitComment
from github.Issue import Issue as GithubIssue
from github.Repository import Repository as GithubRepository
from pydantic import BaseModel


class Organization(BaseModel):
    login: str
    id: int
    node_id: str
    url: str


class Installation(BaseModel):
    id: int
    node_id: str


class BaseUser(BaseModel, ABC):
    id: int
    login: str

    @abstractmethod
    def is_bot(self) -> bool:
        return False


class Sender(BaseModel):
    login: str
    id: int
    node_id: str
    avatar_url: str
    gravatar_id: str
    type: Union[Literal["Bot", "User", "Organization"], str]
    site_admin: bool
    url: str
    html_url: str

    def is_bot(self):
        return self.type == "Bot"


class BaseIssue(BaseModel, ABC):
    active_lock_reason: str | None
    assignees: list | None
    author_association: Union[str, Literal[
        "COLLABORATOR", "CONTRIBUTOR", "FIRST_TIMER", "FIRST_TIME_CONTRIBUTOR", "MANNEQUIN", "MEMBER", "NONE", "OWNER"]
    ]
    """
    How the author is associated with the repository.
    Can be one of: COLLABORATOR, CONTRIBUTOR, FIRST_TIMER, FIRST_TIME_CONTRIBUTOR, MANNEQUIN, MEMBER, NONE, OWNER
    """
    body: Optional[str]
    closed_at: str | None
    comments: int
    comments_url: str
    created_at: str
    draft: Optional[bool] = None
    events_url: str
    html_url: str
    id: int
    labels_url: str
    node_id: str
    number: int
    reactions: dict
    repository_url: str
    title: str
    updated_at: str
    url: str
    user: dict


class RepositoryUser(BaseUser):
    id: int
    login: str
    node_id: Optional[str] = None
    type: Optional[Literal["Bot", "User", "Organization"]] = None
    """Can be one of: Bot, User, Organization"""
    site_admin: Optional[bool] = None
    events_url: Optional[str] = None
    followers_url: Optional[str] = None
    following_url: Optional[str] = None
    gists_url: Optional[str] = None
    gravatar_id: Optional[str] = None
    html_url: Optional[str] = None
    email: Optional[str] = None

    @property
    def is_bot(self):
        return self.type == "Bot"


class Repository(BaseModel):
    id: int
    node_id: str
    name: str
    full_name: str
    private: bool
    owner: RepositoryUser
    html_url: str
    fork: bool
    created_at: str
    updated_at: str
    pushed_at: str
    description: Optional[str]
    stargazers_count: int
    language: Optional[str]
    archived: bool
    disabled: bool
    open_issues_count: int
    license: Optional[dict]
    topics: list
    allow_forking: bool
    is_template: bool

    def _get_repo_access_token(self, integration: GithubIntegration):
        """
        Get the access token for the repository.
        :param integration: GithubIntegration
        :return: str
        """
        return integration.get_access_token(integration.get_repo_installation(self.owner.login, self.name).id).token

    def get_context(self, integration: GithubIntegration) -> Github:
        """
        Get the context for the repository.
        :param integration: GithubIntegration
        :return: GitHub
        """
        return Github(login_or_token=self._get_repo_access_token(integration))

    def get_repo(self, integration: GithubIntegration) -> GithubRepository:
        """
        Get the repository object.
        :param integration: GithubIntegration
        :return: Repository
        """
        return self.get_context(integration).get_repo(f"{self.owner.login}/{self.name}")

    def get_issue(self, integration: GithubIntegration, issue_number: int) -> GithubIssue:
        """
        Get the issue object.
        :param integration: GithubIntegration
        :param issue_number: int
        :return: Issue
        """
        return self.get_repo(integration).get_issue(number=issue_number)

    def get_comment(self, integration: GithubIntegration, comment_id: int) -> GithubCommitComment:
        """
        Get the comment object.
        :param integration: GithubIntegration
        :param comment_id: int
        :return: Comment
        """
        return self.get_repo(integration).get_comment(comment_id)

    @property
    def is_fork(self):
        return self.fork

    @property
    def is_archived(self):
        return self.archived

    @property
    def is_disabled(self):
        return self.disabled

    @property
    def is_template(self):
        return self.is_template

    @property
    def is_private(self):
        return self.private

    @property
    def is_public(self):
        return not self.private


class BasePullRequest(BaseModel, ABC):
    _links: Optional[dict] = None
    """Links related to the pull request."""

    active_lock_reason: Optional[str] = None
    """Can be: resolved, off-topic, too heated, spam, null."""

    additions: Optional[int] = None

    assignee: Optional[dict] = None
    """Assignee information."""

    assignees: Optional[List[Union[dict, None]]] = None
    """List of assignees."""

    author_association: Optional[str] = None
    """Author's association with the repository."""

    auto_merge: Optional[dict] = None
    """Auto merge status."""

    base: Optional[dict] = None
    """Base information."""

    body: Optional[str] = None
    """Pull request body."""

    changed_files: Optional[int] = None

    closed_at: Optional[str] = None
    """Timestamp when closed."""

    comments: Optional[int] = None

    comments_url: str
    """Comments URL."""

    commits: Optional[int] = None

    commits_url: str
    """Commits URL."""

    created_at: str
    """Creation timestamp."""

    deletions: Optional[int] = None

    diff_url: str
    """Diff URL."""

    draft: Optional[bool] = None
    """Is a draft?"""

    head: Optional[dict] = None
    """Head information."""

    html_url: str
    """HTML URL."""

    id: int
    """Unique ID."""

    issue_url: str
    """Issue URL."""

    labels: Optional[List[dict]] = None
    """Associated labels."""

    locked: bool
    """Is locked?"""

    maintainer_can_modify: Optional[bool] = None

    merge_commit_sha: Optional[str] = None
    """Merge commit SHA."""

    mergeable: Optional[bool] = None
    mergeable_state: Optional[str] = None
    merged: Optional[bool] = None

    merged_at: Optional[str] = None
    """Timestamp when merged."""

    merged_by: Optional[dict] = None

    milestone: Optional[dict] = None
    """Milestone details."""

    node_id: str
    """Node ID."""

    number: int
    """Pull request number."""

    patch_url: str
    """Patch URL."""

    rebaseable: Optional[bool] = None
    requested_reviewers: Optional[List[dict]] = None
    """Requested reviewers."""

    requested_teams: Optional[List[dict]] = None
    """Requested teams."""

    review_comment_url: str
    """Review comment URL."""

    review_comments: Optional[int] = None

    review_comments_url: str
    """Review comments URL."""

    state: str
    """State: open or closed."""

    statuses_url: str
    """Statuses URL."""

    title: str
    """Pull request title."""

    updated_at: str
    """Last update timestamp."""

    url: str
    """API URL."""

    user: Optional[dict] = None
    """User information."""

    # Additional optional fields not present in the original code
    allow_auto_merge: Optional[bool] = None
    allow_update_branch: Optional[bool] = None
    delete_branch_on_merge: Optional[bool] = None
    merge_commit_message: Optional[str] = None
    merge_commit_title: Optional[str] = None
    squash_merge_commit_message: Optional[str] = None
    squash_merge_commit_title: Optional[str] = None
    use_squash_pr_title_as_default: Optional[bool] = None


class BaseEvent(BaseModel, ABC):
    action: str
    sender: Sender
    repository: Repository
    organization: Optional[Organization] = None
    installation: Optional[Installation] = None

    def get_context(self, integration: GithubIntegration) -> Github:
        """
        Get the context for the event.
        :param integration: GithubIntegration
        :return: GitHub
        """
        if self.installation:
            return Github(login_or_token=integration.get_access_token(self.installation.id).token)
        return self.repository.get_context(integration)
