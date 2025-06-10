const { skibidi, refferralCode } = require("../config/config")
const Proxy = require("../utils/proxy.utils")
const Wallet = require("../utils/wallet.utils")
const Workers = require("../worker/worker")

async function main() {
    let maxWorker = 5
    console.clear()
    try {
        const wallets = Wallet.load()
        const proxys = Proxy.load()

        if (wallets.length === 0) {
            skibidi.failed("[NO PRIVATE KEYS FOUDN]")
            process.exit(1)
        }

        if (proxys.length === 0) {
            maxWorker = 2
            skibidi.warn("[NO PROXY FOUND. USING CURRENT IP AND LIMITING WORKER]")
        }

        skibidi.warn(`[LOADED ${wallets.length} WALLET]`)
        skibidi.warn(`[LOADED ${proxys.length} PROXY]`)

        const mainTask = []
        for (let i = 0; i < wallets.length; i++) {
            const proxy = Proxy.get(proxys, i)
            mainTask.push(() => Workers.main(wallets[i], proxy))
        }

        await Workers.startLimitedTask(mainTask, maxWorker)
    } catch (error) {
        skibidi.failed(error)
    }
}

main()