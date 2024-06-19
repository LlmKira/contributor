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
    milestone: dict
    node_id: str
    number: int
    reactions: dict
    repository_url: str
    title: str
    updated_at: str
    url: str
    user: dict
    locked: Optional[bool] = None
    assignee: Optional[dict] = None
    labels: Optional[list] = None
    performed_via_github_app: Optional[dict] = None
    state: Optional[Union[str, Literal["open", "closed"]]] = None
    """State of the issue; either 'open' or 'closed'"""
    state_reason: Optional[str] = None
    timeline_url: Optional[str] = None


class OpenIssueOpenEvent(BaseEvent):
    action: Literal["open"]
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
        :param number: int
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
