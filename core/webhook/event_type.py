# -*- coding: utf-8 -*-

from .event.issue_comment import CreateIssueCommentEvent
from .event.issues import OpenedIssueOpenEvent, ClosedIssueOpenEvent


class BaseEventType(object):
    pass


class _Issue(BaseEventType):
    """
    assigned closed deleted demilestoned edited labeled locked milestoned
    opened pinned reopened transferred unassigned unlabeled unlocked unpinned
    """
    ASSIGNED = "assigned"

    CLOSED = "closed"
    CLOSED_EVENT = ClosedIssueOpenEvent

    DELETED = "deleted"
    DEMILESTONED = "demilestoned"
    EDITED = "edited"
    LABELED = "labeled"
    LOCKED = "locked"
    MILESTONED = "milestoned"

    OPENED = "opened"
    OPENED_EVENT = OpenedIssueOpenEvent

    PINNED = "pinned"
    REOPENED = "reopened"
    TRANSFERRED = "transferred"
    UNASSIGNED = "unassigned"
    UNLABELED = "unlabeled"
    UNLOCKED = "unlocked"
    UNPINNED = "unpinned"

    def __str__(self):
        return "issues"


class _IssueComment(BaseEventType):
    CREATED = "created"
    CREATED_EVENT = CreateIssueCommentEvent

    DELETED = "deleted"
    EDITED = "edited"

    def __str__(self):
        return "issue_comment"


Issue = _Issue()
IssueComment = _IssueComment()

EVENT_MODEL = {
    (Issue.__str__(), Issue.OPENED): Issue.OPENED_EVENT,
    (Issue.__str__(), Issue.CLOSED): Issue.CLOSED_EVENT,
    (IssueComment.__str__(), IssueComment.CREATED): IssueComment.CREATED_EVENT,
}
