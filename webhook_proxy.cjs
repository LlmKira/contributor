const SmeeClient = require('smee-client')
// dotenv is used to read environment variables from a .env file
require('dotenv').config()
let proxyUrl = process.env.PROXY_WEBHOOK_URL
let targetUrl = process.env.TARGET_WEBHOOK_URL
if (!proxyUrl || !targetUrl) {
    console.error('Please provide a proxy and target URL')
    process.exit(1)
}
const smee = new SmeeClient({
    source: proxyUrl, target: targetUrl, logger: console
})

const events = smee.start()

// Stop forwarding events
// events.close()