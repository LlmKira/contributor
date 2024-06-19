from abc import ABC, abstractmethod
from typing import Optional, Union, Literal

from pydantic import BaseModel


class Organization(BaseModel):
    login: str
    id: int
    node_id: str
    url: str


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


class Installation(BaseModel):
    id: int
    node_id: str
