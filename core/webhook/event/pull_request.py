# -*- coding: utf-8 -*-
from typing import List
from typing import Optional, Literal

from github import GithubIntegration
from pydantic import ConfigDict

from ._base import BasePullRequest
from ._base import Repository, Sender, Installation, Organization, BaseEvent


class PullRequest(BasePullRequest):
    _links: Optional[dict] = None
    """Links related to the pull request."""

    active_lock_reason: Optional[str] = None
    """Can be: resolved, off-topic, too heated, spam, null."""

    additions: Optional[int] = None

    assignee: Optional[dict] = None
    """Assignee information."""

    assignees: Optional[List[dict]] = None
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

    commits: Optional[int] = None

    deletions: Optional[int] = None

    draft: Optional[bool] = None
    """Is a draft?"""

    head: Optional[dict] = None
    """Head information."""

    labels: Optional[List[dict]] = None
    """Associated labels."""

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

    rebaseable: Optional[bool] = None
    requested_reviewers: Optional[List[dict]] = None
    """Requested reviewers."""

    requested_teams: Optional[List[dict]] = None
    """Requested teams."""

    review_comments: Optional[int] = None

    user: Optional[dict] = None
    """User information."""

    # Additional optional fields
    allow_auto_merge: Optional[bool] = None
    allow_update_branch: Optional[bool] = None
    delete_branch_on_merge: Optional[bool] = None
    merge_commit_message: Optional[str] = None
    merge_commit_title: Optional[str] = None
    squash_merge_commit_message: Optional[str] = None
    squash_merge_commit_title: Optional[str] = None
    use_squash_pr_title_as_default: Optional[bool] = None


class OpenedPullRequestEvent(BaseEvent):
    action: Literal["opened"]
    number: int
    pull_request: PullRequest
    repository: Repository
    sender: Sender
    organization: Optional[Organization] = None
    installation: Optional[Installation] = None

    model_config = ConfigDict(extra="allow")

    def get_pull_request(self, integration: GithubIntegration):
        """
        Get the pull request object.
        :param integration: GithubIntegration
        :return:
        """
        return self.get_repo(integration=integration).get_pull(number=self.pull_request.number)

    def get_repo(self, integration: GithubIntegration):
        """
        Get the repository object.
        :param integration: GithubIntegration
        :return:
        """
        return self.repository.get_repo(integration=integration)


class ClosedPullRequestEvent(BaseEvent):
    action: Literal["closed"]
    number: int
    pull_request: PullRequest
    repository: Repository
    sender: Sender
    organization: Optional[Organization] = None
    installation: Optional[Installation] = None

    model_config = ConfigDict(extra="allow")

    def get_pull_request(self, integration: GithubIntegration):
        """
        Get the pull request object.
        :param integration: GithubIntegration
        :return:
        """
        return self.get_repo(integration=integration).get_pull(number=self.pull_request.number)

    def get_repo(self, integration: GithubIntegration):
        """
        Get the repository object.
        :param integration: GithubIntegration
        :return:
        """
        return self.repository.get_repo(integration=integration)


class EditedPullRequestEvent(BaseEvent):
    action: Literal["edited"]
    number: int
    pull_request: PullRequest
    repository: Repository
    sender: Sender
    organization: Optional[Organization] = None
    installation: Optional[Installation] = None

    model_config = ConfigDict(extra="allow")

    def get_pull_request(self, integration: GithubIntegration):
        """
        Get the pull request object.
        :param integration: GithubIntegration
        :return:
        """
        return self.get_repo(integration=integration).get_pull(number=self.pull_request.number)

    def get_repo(self, integration: GithubIntegration):
        """
        Get the repository object.
        :param integration: GithubIntegration
        :return:
        """
        return self.repository.get_repo(integration=integration)
