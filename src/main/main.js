const { skibidi, refferralCode } = require("../config/config")
const Proxy = require("../utils/proxy.utils")
const Wallet = require("../utils/wallet.utils")
const Workers = require("../worker/worker")

async function main() {
    while (true) {
        let maxWorker = 15
        console.clear()
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

            skibidi.warn(`[CYCLE START] PROCESSING ${wallets.length} WALLETS WITH ${maxWorker} WORKERS`)

            const mainTask = []
            for (let i = 0; i < wallets.length; i++) {
                const proxy = Proxy.get(proxys, i)
                const walletNumber = i + 1
                mainTask.push(() => Workers.main(wallets[i], proxy, walletNumber))
            }

            await Workers.startLimitedTask(mainTask, maxWorker)
            skibidi.success("ALL WALLETS HAVE COMPLETED A FULL CYCLE.")
            skibidi.processing("RESTARTING THE ENTIRE PROCESS IN 1 HOUR...")
            await new Promise(resolve => setTimeout(resolve, 120000))
        } catch (error) {
            skibidi.failed(error)
            skibidi.processing("RESTARTING DUE TO ERROR IN 5 MINUTES...")
            await new Promise(resolve => setTimeout(resolve, 300000))
        }
    }
}

main()
