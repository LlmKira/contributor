# -*- coding: utf-8 -*-
# @Author  : sudoskys
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

from const import webhook_handler
from core.mongo import init_database
from core.webhook.event_type import Issue
from issue_auto_label import issue_auto_label
from issue_body_format import issue_body_format
from issue_close_with_report import close_issue_with_report
from issue_title_format import issue_title_format
from settings.server import ServerSetting

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 应用启动前的初始化操作
    await init_database()
    yield
    print("Application Shutdown")


webhook_handler.app.router.lifespan_context = lifespan

if __name__ == "__main__":
    webhook_handler.register_listener(
        Issue,
        action=Issue.CLOSED,
        unique_id="close_issue_with_report",
        handler=close_issue_with_report
    )
    webhook_handler.register_listener(
        Issue,
        action=Issue.OPENED,
        unique_id="issue_auto_label",
        handler=issue_auto_label
    )
    webhook_handler.register_listener(
        Issue,
        action=Issue.OPENED,
        unique_id="issue_title_format",
        handler=issue_title_format
    )
    webhook_handler.register_listener(
        Issue,
        action=Issue.OPENED,
        unique_id="issue_body_format",
        handler=issue_body_format
    )
    webhook_handler.run(ServerSetting.host, ServerSetting.port)
