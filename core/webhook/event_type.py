# -*- coding: utf-8 -*-

from .event.issue_comment import CreateIssueCommentEvent
from .event.issues import OpenedIssueEvent, ClosedIssueEvent
from .event.pull_request import OpenedPullRequestEvent, ClosedPullRequestEvent, EditedPullRequestEvent


class BaseEventType(object):
    pass


class _Issue(BaseEventType):
    """
    assigned closed deleted demilestoned edited labeled locked milestoned
    opened pinned reopened transferred unassigned unlabeled unlocked unpinned
    """
    ASSIGNED = "assigned"

    CLOSED = "closed"
    CLOSED_EVENT = ClosedIssueEvent

    DELETED = "deleted"
    DEMILESTONED = "demilestoned"
    EDITED = "edited"
    LABELED = "labeled"
    LOCKED = "locked"
    MILESTONED = "milestoned"

    OPENED = "opened"
    OPENED_EVENT = OpenedIssueEvent

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


class _PullRequest(BaseEventType):
    """
    assigned auto_merge base branch_change closed converted_to_draft
    edited labeled locked merged milestoned opened ready_for_review
    reopened review_requested review_request_removed synchronize unlabeled unlocked
    """
    ASSIGNED = "assigned"
    AUTO_MERGE_DISABLED = "auto_merge_disabled"
    AUTO_MERGE_ENABLED = "auto_merge_enabled"

    CLOSED = "closed"
    CLOSED_EVENT = ClosedPullRequestEvent

    CONVERTED_TO_DRAFT = "converted_to_draft"
    DEMILESTONED = "demilestoned"
    DEQUEUED = "dequeued"

    EDITED = "edited"
    EDITED_EVENT = EditedPullRequestEvent

    ENQUEUED = "enqueued"
    LABELED = "labeled"
    LOCKED = "locked"
    MILESTONED = "milestoned"

    OPENED = "opened"
    OPENED_EVENT = OpenedPullRequestEvent

    READY_FOR_REVIEW = "ready_for_review"
    REOPENED = "reopened"
    REVIEW_REQUEST_REMOVED = "review_request_removed"
    REVIEW_REQUESTED = "review_requested"
    SYNCHRONIZE = "synchronize"
    UNASSIGNED = "unassigned"
    UNLABELED = "unlabeled"
    UNLOCKED = "unlocked"

    def __str__(self):
        return "pull_request"


Issue = _Issue()
IssueComment = _IssueComment()
PullRequest = _PullRequest()

EVENT_MODEL = {
    (Issue.__str__(), Issue.OPENED): Issue.OPENED_EVENT,
    (Issue.__str__(), Issue.CLOSED): Issue.CLOSED_EVENT,
    (IssueComment.__str__(), IssueComment.CREATED): IssueComment.CREATED_EVENT,
    (PullRequest.__str__(), PullRequest.OPENED): PullRequest.OPENED_EVENT,
    (PullRequest.__str__(), PullRequest.CLOSED): PullRequest.CLOSED_EVENT,
    (PullRequest.__str__(), PullRequest.EDITED): PullRequest.EDITED_EVENT,
}
