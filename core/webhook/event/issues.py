# -*- coding: utf-8 -*-

from typing import Optional, Literal, Union

from github import GithubIntegration
from pydantic import ConfigDict

from ._base import BaseIssue, Repository, Sender, Installation, BaseUser, Organization, BaseEvent


class IssueUser(BaseUser):
    id: int
    login: int
    type: Optional[Literal["Bot", "User", "Organization"]] = None
    """Can be one of: Bot, User, Organization"""

    def is_bot(self):
        return self.type == "Bot"


class Issue(BaseIssue):
    active_lock_reason: str | None | Literal["off-topic", "too heated", "resolved", "spam"]
    """
    The reason the conversation was locked.
    """
    assignee: Optional[dict] = None
    """State of the issue; either 'open' or 'closed'"""
    assignees: list | None
    """The users that were assigned to the issue."""
    author_association: str | Literal[
        "COLLABORATOR", "CONTRIBUTOR", "FIRST_TIMER", "FIRST_TIME_CONTRIBUTOR", "MANNEQUIN", "MEMBER", "NONE", "OWNER"
    ]
    """
    How the author is associated with the repository.
    """
    body: str | None
    """The body of the issue."""
    closed_at: str | None
    comments: int
    comments_url: str
    created_at: str
    draft: Optional[bool] = None
    events_url: str
    html_url: str
    id: int
    labels: Optional[list] = None
    labels_url: str
    locked: Optional[bool] = None
    milestone: Optional[dict] = None
    node_id: str
    number: int
    performed_via_github_app: Optional[dict] = None
    pull_request: Optional[dict] = None
    reactions: dict
    repository_url: str
    state: Optional[Union[str, Literal["open", "closed"]]] = None
    state_reason: Optional[str] = None
    timeline_url: Optional[str] = None
    title: str
    updated_at: str
    url: str
    user: IssueUser


class OpenedIssueOpenEvent(BaseEvent):
    action: Literal["opened"]
    issue: Issue
    repository: Repository
    sender: Sender
    organization: Optional[Organization] = None
    installation: Optional[Installation] = None

    model_config = ConfigDict(extra="allow")

    def get_issue(self, integration: GithubIntegration):
        """
        Get the issue object.
        :param integration: GithubIntegration
        :return: Issue
        """
        return self.repository.get_issue(integration, issue_number=self.issue.number)

    def get_repo(self, integration: GithubIntegration):
        """
        Get the repository object.
        :param integration: GithubIntegration
        :return:
        """
        return self.repository.get_repo(integration=integration)


class ClosedIssueOpenEvent(BaseEvent):
    action: Literal["closed"]
    issue: Issue
    repository: Repository
    sender: Sender
    organization: Optional[Organization] = None
    installation: Optional[Installation] = None

    model_config = ConfigDict(extra="allow")

    def get_issue(self, integration: GithubIntegration):
        """
        Get the issue object.
        :param integration: GithubIntegration
        :return: Issue
        """
        return self.repository.get_issue(integration, issue_number=self.issue.number)

    def get_repo(self, integration: GithubIntegration):
        """
        Get the repository object.
        :param integration: GithubIntegration
        :return:
        """
        return self.repository.get_repo(integration=integration)
