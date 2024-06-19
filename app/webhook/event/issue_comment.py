# -*- coding: utf-8 -*-

from typing import Optional, Literal, Union

from pydantic import BaseModel, ConfigDict

from ._base import Repository, Sender, Installation, BaseUser, BaseIssue, Organization


class _CommentUser(BaseUser):
    login: str
    id: int
    name: Optional[str] = None
    node_id: Optional[str] = None
    avatar_url: Optional[str] = None
    url: Optional[str] = None
    type: Optional[Literal["Bot", "User", "Organization"]] = None
    """Can be one of: Bot, User, Organization"""
    deleted: Optional[bool] = None
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


class Comment(BaseModel):
    url: str
    html_url: str
    issue_url: str
    id: int
    node_id: str
    user: _CommentUser
    created_at: str
    updated_at: str
    author_association: str
    body: str
    performed_via_github_app: Optional[dict] = None


class _IssueUser(BaseUser):
    id: int
    login: str
    avatar_url: Optional[str] = None
    deleted: Optional[bool] = None
    email: Optional[str] = None
    events_url: Optional[str] = None
    followers_url: Optional[str] = None
    following_url: Optional[str] = None
    gists_url: Optional[str] = None
    gravatar_id: Optional[str] = None
    html_url: Optional[str] = None
    name: Optional[str] = None
    node_id: Optional[str] = None
    organizations_url: Optional[str] = None
    received_events_url: Optional[str] = None
    repos_url: Optional[str] = None
    site_admin: Optional[bool] = None
    starred_url: Optional[str] = None
    subscriptions_url: Optional[str] = None
    type: Optional[Literal["Bot", "User", "Organization", "Mannequin"]] = None
    """Can be one of: Bot, User, Organization, Mannequin"""
    url: Optional[str] = None

    @property
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
    user: dict
    url: str
    repository_url: str
    id: int
    node_id: str
    title: str
    body: Optional[str]
    closed_at: str | None
    comments: int
    comments_url: str
    created_at: str
    draft: Optional[bool] = None
    events_url: str
    html_url: str
    labels_url: str
    number: int
    milestone: Optional[dict] = None
    assignee: dict | None
    locked: bool
    state: str
    """
    State of the issue; either 'open' or 'closed'
    Can be one of: open, closed
    """
    locked: bool
    performed_via_github_app: Optional[dict] = None


class CreateIssueCommentEvent(BaseModel):
    action: Literal["created"]
    issue: Issue
    comment: Comment
    repository: Repository
    sender: Sender
    organization: Optional[Organization] = None
    installation: Optional[Installation] = None
    model_config = ConfigDict(extra="allow")
