from typing import Type, Tuple

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict, PydanticBaseSettingsSource, TomlConfigSettingsSource


class Github(BaseSettings):
    owner: list[str] = []
    private: bool = False
    model_config = SettingsConfigDict(toml_file='config.toml')

    @classmethod
    def settings_customise_sources(
            cls,
            settings_cls: Type[BaseSettings],
            init_settings: PydanticBaseSettingsSource,
            env_settings: PydanticBaseSettingsSource,
            dotenv_settings: PydanticBaseSettingsSource,
            file_secret_settings: PydanticBaseSettingsSource,
    ) -> Tuple[PydanticBaseSettingsSource, ...]:
        return (TomlConfigSettingsSource(settings_cls),)

    def is_owner(self, uid: str) -> bool:
        if not self.private:
            return True
        # 大小写不敏感
        return uid.lower() in [x.lower() for x in self.owner]


load_dotenv()
GithubSettings = Github()
