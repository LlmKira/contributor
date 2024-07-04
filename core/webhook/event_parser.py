# -*- coding: utf-8 -*-

import hmac
import json
from typing import Mapping, Optional, Dict, Any

from pydantic.dataclasses import dataclass

from .exception import InvalidRequestError


@dataclass
class GitHubEvent:
    """Represents a GitHub webhook event."""
    name: str
    delivery_id: str
    signature: Optional[str]
    user_agent: str
    payload: Dict[str, Any]


def parse_event(headers: Mapping[str, str], raw_body: bytes,
                webhook_secret: Optional[str] = None) -> GitHubEvent:
    """
    Parses the headers and raw body of a webhook request into a `GitHubEvent` object.
    """
    event_name = headers.get("X-GitHub-Event")
    delivery_id = headers.get("X-GitHub-Delivery")
    signature_256 = headers.get("X-Hub-Signature-256")
    signature_1 = headers.get("X-Hub-Signature")
    user_agent = headers.get("User-Agent")
    content_type = headers.get("Content-Type")

    if not all([event_name, delivery_id, user_agent, content_type]):
        raise InvalidRequestError("Missing required headers")
    if webhook_secret and not any([signature_256, signature_1]):
        raise InvalidRequestError("Webhook secret configured, but no signature header found")

    mime_type, parameters = extract_mime_components(content_type)
    if mime_type != "application/json":
        raise InvalidRequestError(f"Expected Content-Type: application/json, got {content_type}")
    # encoding = dict(parameters).get("encoding", "UTF-8")
    encoding = next((value for name, value in parameters if name == "encoding"), "UTF-8")

    if webhook_secret:
        signature = signature_256 or signature_1
        if not signature:
            raise RuntimeError("Expected signature to be present")
        algo = "sha256" if signature_256 else "sha1"
        verify_signature(signature, raw_body, webhook_secret.encode("ascii"), algo=algo)

    payload = json.loads(raw_body.decode(encoding))
    return GitHubEvent(event_name, delivery_id, signature_256 or signature_1, user_agent, payload)


def extract_mime_components(mime: str) -> tuple[str, list[tuple]]:
    """
    Extracts and returns the main type and parameters from a MIME type string.
    """
    parts = mime.split(";")
    if not parts or not parts[0].strip():
        raise ValueError(f"Invalid MIME type: {mime!r}")
    parameters = [part.partition("=")[::2] for part in parts[1:]]
    return parts[0].strip(), parameters


class SignatureMismatchError(Exception):
    """Raised when a signature does not match the computed signature."""

    def __init__(self, provided: str, computed: str) -> None:
        self.provided = provided
        self.computed = computed

    def __str__(self) -> str:
        return f"Signature mismatch: provided={self.provided}, computed={self.computed}"


def compute_signature(payload: bytes, secret: bytes, algo: str = "sha256") -> str:
    """
    Computes HMAC signature for the given payload using the specified secret and algorithm.
    """
    if algo not in {"sha1", "sha256"}:
        raise ValueError(f"Unsupported algorithm: {algo!r}")
    return f"{algo}={hmac.new(secret, payload, algo).hexdigest()}"


def verify_signature(sig: str, payload: bytes, secret: bytes, algo: str = "sha256") -> None:
    """
    Verifies the provided signature against the computed one and raises `SignatureMismatchError` if they don't match.
    """
    computed_sig = compute_signature(payload, secret, algo)
    if not hmac.compare_digest(sig, computed_sig):
        raise SignatureMismatchError(sig, computed_sig)
