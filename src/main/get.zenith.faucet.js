const chalk = require("chalk")
const { timestamp } = require("../utils/timestamp")
const Wallet = require("../utils/wallet.utils")
const Workers = require("../worker/worker")
const { skibidi } = require("../config/config")

async function start() {
    let maxWorker = 5
    try {
        console.clear()
        const walletArr = await Wallet.load()

        if (walletArr.length === 0) {
            skibidi.failed("NO PRIVATE KEY FOUND")
            process.exit(1)
        }

        skibidi.success(`[LOADED ${walletArr.length} WALLET]`)

        const mintUsdcTask = []
        const mintUsdtTask = []
        for (let i = 0; i < walletArr.length; i++) {
            mintUsdcTask.push(() => Workers.zenithUsdcWorker(walletArr[i]))
        }

        skibidi.processing("[STARTING USDC FAUCET WORKERS]")
        const a = await Workers.startLimitedTask(mintUsdcTask, maxWorker)
        console.log(a)

        for (let j = 0; j < walletArr.length; j++) {
            mintUsdtTask.push(() => Workers.zenithUsdtWorker(walletArr[j]))
        }

        skibidi.processing("[STARTING USDT FAUCET WORKERS]")
        const b = await Workers.startLimitedTask(mintUsdtTask, maxWorker)
        console.log(b)
    } catch (error) {
        skibidi.failed(error)
    }

    skibidi.success("TASKS DONE")
}

start()
