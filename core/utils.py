from typing import Optional

import toml
from github.Repository import Repository
from loguru import logger
from pydantic import BaseModel, model_validator

from .cache import ExpiringDict

setting_cache = ExpiringDict(max_len=100, max_age_seconds=60 * 60 * 1)  # 1hours


def load_toml_string(toml_str):
    try:
        toml_dict = toml.loads(toml_str)
        return toml_dict
    except toml.TomlDecodeError as e:
        print(f"Error decoding TOML: {e}")
        return None


class RepoSetting(BaseModel):
    """
    Repository settings
    """
    contributor: Optional[str] = None
    language: str = "Chinese"
    issue_auto_label: bool = False
    issue_title_format: bool = False
    issue_body_format: bool = False
    issue_title_format_prompt: Optional[str] = None
    issue_body_format_prompt: Optional[str] = None
    issue_close_with_report: bool = False


def get_repo_setting(repo_name: str, repo: Repository) -> RepoSetting:
    repo_setting = setting_cache.get(repo_name)
    if repo_setting:
        return repo_setting
    repo_setting = RepoSetting()
    try:
        repo_setting_file = repo.get_contents(".nerve.toml")
    except Exception as e:
        logger.error(f"Failed to get repo setting file: {e}")
    else:
        if repo_setting_file:
            repo_setting_string = load_toml_string(repo_setting_file.decoded_content.decode())
            if repo_setting_string:
                repo_setting = RepoSetting.model_validate(repo_setting_string)
    setting_cache.set(repo_name, repo_setting)
    return repo_setting


class Card(BaseModel):
    cardId: str
    openaiEndpoint: str
    apiKey: str
    apiModel: str
    repoUrl: str
    disabled: bool

    @model_validator(mode="after")
    def check(self):
        # 判断是否是 URL
        from urllib.parse import urlparse
        if not urlparse(self.repoUrl).scheme:
            raise ValueError("Invalid URL")
        if not urlparse(self.openaiEndpoint).scheme:
            raise ValueError("Invalid URL")
        if len(self.apiModel) > 20:
            raise ValueError("Model name is too long")
        return self
