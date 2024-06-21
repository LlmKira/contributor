# -*- coding: utf-8 -*-

from .event.issue_comment import CreateIssueCommentEvent
from .event.issues import OpenedIssueOpenEvent


class BaseEventType(object):
    pass


class _Issue(BaseEventType):
    OPENED = "opened"

    def __str__(self):
        return "issues"


class _IssueComment(BaseEventType):
    CREATED = "created"

    def __str__(self):
        return "issue_comment"


Issue = _Issue()
IssueComment = _IssueComment()

EVENT_MODEL = {
    (Issue.__str__(), Issue.OPENED): OpenedIssueOpenEvent,
    (IssueComment.__str__(), IssueComment.CREATED): CreateIssueCommentEvent,
}
