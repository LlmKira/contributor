# -*- coding: utf-8 -*-

from .event.issue_comment import CreateIssueCommentEvent
from .event.issues import OpenIssueOpenEvent


class BaseEventType(object):
    pass


class _Issue(BaseEventType):
    OPEN = "opened"

    def __str__(self):
        return "issue"


class _IssueComment(BaseEventType):
    CREATED = "created"

    def __str__(self):
        return "issue_comment"


Issue = _Issue()
IssueComment = _IssueComment()

EVENT_MODEL = {
    (Issue.__str__(), Issue.OPEN): OpenIssueOpenEvent,
    (IssueComment.__str__(), IssueComment.CREATED): CreateIssueCommentEvent,
}
