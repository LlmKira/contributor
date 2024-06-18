# -*- coding: utf-8 -*-
# @Time    : 2023/11/15 下午10:19
# @Author  : sudoskys
# @File    : note_github_bot_test.py
# @Software: PyCharm

import os

from github_bot_api import Event, Webhook
from github_bot_api import GithubApp
from github_bot_api.flask import create_flask_app

from settings.server import ServerSetting

app = GithubApp(
    user_agent='my-bot/0.0.0',
    app_id=ServerSetting.github_app_id,
    private_key=ServerSetting.github_private_key.get_secret_value()
)

webhook = Webhook(secret=None)


@webhook.listen('issues')
def on_pull_request(event: Event) -> bool:
    print(event.payload)
    client = app.installation_client(event.payload['installation']['id'])
    repo = client.get_repo(event.payload['repository']['full_name'])
    issue = repo.get_issue(number=event.payload['issue']['number'])
    issue.create_comment('Hello World')
    return True


@webhook.listen('issue_comment')
def on_issue_comment(event: Event) -> bool:
    print(event.payload)
    print(event.delivery_id)
    client = app.installation_client(event.payload['installation']['id'])
    repo = client.get_repo(event.payload['repository']['full_name'])
    issue = repo.get_issue(number=event.payload['issue']['number'])
    issue.edit(
        body=f"Hello World\n\n{issue.body}"

    )
    return True


os.environ['FLASK_ENV'] = 'development'
flask_app = create_flask_app(__name__, webhook)
flask_app.run(host=ServerSetting.host, port=ServerSetting.port)
