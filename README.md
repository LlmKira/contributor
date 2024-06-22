![contributor](.github/banner.png)

---

## 🚀 Contributor GithubApp

In a nutshell, for better project management, we need an improved Issue management tool. That’s why I created this
project.

By configuring a bot through repository files, everyone can freely set up the bot through these files, which will
automatically handle repository events based on the configuration.

This repository includes a template configuration file for setting up your bot. As for sensitive information like keys,
you can easily configure them through my panel.

[Install this integration](https://github.com/apps/neutron-nerve)

[View Dashboard](https://contributor.dianas.cyou)

## Deploying the App 🛠️

```shell
pdm install
npm install
nano .env
pm2 start pm2.json
```

## Acknowledgements 🙏

- [gosmee by chmouel](https://github.com/chmouel/gosmee)
- [Octokit Webhooks Payload Examples](https://github.com/octokit/webhooks/blob/main/payload-examples/api.github.com/issues/assigned.payload.json)
- [GitHub Webhook Events and Payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads#issues)
- [Validating Webhook Deliveries](https://docs.github.com/zh/webhooks/using-webhooks/validating-webhook-deliveries)
- [PyGithub Examples - Issue](https://github.com/PyGithub/PyGithub/blob/main/doc/examples/Issue.rst)