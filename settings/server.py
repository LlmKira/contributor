import pathlib

from dotenv import load_dotenv
from pydantic import Field, model_validator, SecretStr
from pydantic_settings import BaseSettings


class Server(BaseSettings):
    host: str = Field("127.0.0.1", validation_alias="SERVER_HOST")
    port: int = Field(8080, validation_alias="SERVER_PORT")
    github_app_id: int = Field(None, validation_alias="GITHUB_APP_ID")
    github_private_key_file: str = Field("~/.certs/github/bot_key.pem", validation_alias="GITHUB_PRIVATE_KEY_FILE")
    github_private_key: SecretStr = SecretStr('')

    @model_validator(mode="after")
    def validator(self):
        if not pathlib.Path(self.github_private_key_file).exists():
            raise FileNotFoundError(f"Github private key file not exists: {self.github_private_key_file}")
        else:
            with pathlib.Path(self.github_private_key_file).open("r") as file:
                _key = file.read()
                _key = _key.strip()
                self.github_private_key = SecretStr(_key)
        return self


load_dotenv()
ServerSetting = Server()
