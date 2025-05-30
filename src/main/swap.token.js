const chalk = require("chalk")
const { timestamp } = require("../utils/timestamp")
const Wallet = require("../utils/wallet.utils")
const Workers = require("../worker/worker")
const Proxy = require("../utils/proxy.utils")
const { skibidi } = require("../config/config")

async function start() {
    let maxWorker = 5
    try {
        console.clear()
        const walletArr = await Wallet.load()
        const proxyArr = await Proxy.load()

        if (walletArr.length === 0) {
            skibidi.failed("NO PRIVATE KEY FOUND")
            process.exit(1)
        }

        skibidi.success(`[LOADED ${walletArr.length} WALLET]`)

        const swapTask = []
        for (let i = 0; i < walletArr.length; i++) {
            swapTask.push(() => Workers.swapWorker(walletArr[i]))
        }

        skibidi.processing("[STARTING SWAP WORKERS]")
        await Workers.startLimitedTask(swapTask, maxWorker)
    } catch (error) {
        skibidi.failed(error)
    }

    skibidi.success("TASKS DONE")
}

start()
