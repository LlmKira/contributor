# -*- coding: utf-8 -*-

from abc import ABC, abstractmethod
from typing import Optional, Union, Literal

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
    license: Optional[str]
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
