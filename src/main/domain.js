const { skibidi } = require("../config/config");
const Proxy = require("../utils/proxy.utils");
const Wallet = require("../utils/wallet.utils");
const Workers = require("../worker/worker");

async function mintDomain() {
    let maxWorker = 5

    try {
        const wallets = Wallet.load()
        const proxys = Proxy.load()

        if (wallets.length === 0) {
            skibidi.failed("[NO PRIVATE KEYS FOUND]")
            process.exit(1)
        }

        if (proxys.length === 0) {
            maxWorker = 2
            skibidi.warn("[NO PROXY FOUND. USING CURRENT IP AND LIMITING WORKER]")
        }

        const task = []
        for (let i = 0; i < wallets.length; i++) {
            const proxy = Proxy.get(proxys, i)
            task.push(() => Workers.domain(wallets[i], proxy))
        }

        await Workers.startLimitedTask(task, maxWorker)

        skibidi.success(`Minting domain process done!`)
    } catch (error) {
        skibidi.failed(`Failed initializing worker: ${error}`)
    }
}

mintDomain()