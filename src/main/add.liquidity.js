const { skibidi } = require("../config/config")
const Wallet = require("../utils/wallet.utils")
const Workers = require("../worker/worker")

async function start() {
    let maxWorker = 5
    try {
        console.clear()
        const walletArr = await Wallet.load()

        if (walletArr.length === 0) {
            skibidi.warn("NO PRIVATE KEY FOUND")
            process.exit(1)
        }

        skibidi.success(`[LOADED ${walletArr.length} WALLET]`)

        const swapTask = []
        for (let i = 0; i < walletArr.length; i++) {
            swapTask.push(() => Workers.liqWorker(walletArr[i]))
        }

        skibidi.processing("[STARTING LIQUIDITY WORKERS]")
        await Workers.startLimitedTask(swapTask, maxWorker)
    } catch (error) {
        skibidi.failed(error)
    }

    skibidi.success("TASKS DONE")
}

start()
