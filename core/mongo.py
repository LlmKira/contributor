from datetime import datetime, timezone
from typing import List, Optional

import pymongo
from beanie import init_beanie, Document
from dotenv import load_dotenv
from loguru import logger
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import Field
from pydantic import model_validator
from pydantic_settings import BaseSettings
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError


class MongoDb(BaseSettings):
    mongodb_dsn: str = Field("mongodb://localhost:27017", validation_alias="MONGODB_DSN")
    """MongoDB 配置"""
    available: bool = True
    """MongoDB 连接状态"""

    @model_validator(mode="after")
    def mongodb_validator(self):
        try:
            client = MongoClient(
                self.mongodb_dsn, serverSelectionTimeoutMS=1000
            )  # 设置超时时间
            client.admin.command("ping")
            # 获取服务器信息
            client.server_info()
            # 尝试执行需要管理员权限的命令
            client.admin.command("listDatabases")
        except ServerSelectionTimeoutError:
            self.available = False
            logger.warning(
                f"\n🍀MongoDB Connection Error -- timeout when connecting to {self.mongodb_dsn}"
            )
        except pymongo.errors.OperationFailure:
            self.available = False
            logger.warning("\n🍀MongoDB Connection Error -- insufficient permissions")
        except Exception as e:
            self.available = False
            logger.warning(f"\n🍀MongoDB Connection Error -- error {e}")
        else:
            logger.success(f"\n🍀MongoDB Connection Success --dsn {self.mongodb_dsn}")
        return self


def utcnow():
    return datetime.now(tz=timezone.utc)


class IssueOperation(Document):
    issue_id: int
    repo_name: str
    report_comment_id: Optional[int] = None
    title_format: Optional[str] = None
    body_format: Optional[str] = None
    format_issue: Optional[str] = None
    labels: Optional[List[str]] = None


load_dotenv()
MongoSetting = MongoDb()
if not MongoSetting.available:
    logger.error("MongoDB Connection Error")
    raise ValueError("MongoDB Connection Error")


async def init_database():
    global_client = AsyncIOMotorClient(MongoSetting.mongodb_dsn)
    await init_beanie(database=global_client.dbname, document_models=[IssueOperation])
    logger.info("Beanie initialized")
