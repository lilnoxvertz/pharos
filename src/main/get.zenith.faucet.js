const chalk = require("chalk")
const { timestamp } = require("../utils/timestamp")
const Wallet = require("../utils/wallet.utils")
const Workers = require("../worker/worker")

async function start() {
    let maxWorker = 5
    try {
        console.clear()
        const walletArr = await Wallet.load()

        if (walletArr.length === 0) {
            console.log("no private key found!")
            process.exit(1)
        }

        console.log(`[LOADED ${walletArr.length} WALLET]`)

        const mintUsdcTask = []
        const mintUsdtTask = []
        for (let i = 0; i < walletArr.length; i++) {
            mintUsdcTask.push(() => Workers.zenithUsdcWorker(walletArr[i]))
        }

        console.log("STARTING USDC FAUCET WORKERS")
        await Workers.startLimitedTask(mintUsdcTask, maxWorker)

        for (let j = 0; j < walletArr.length; j++) {
            mintUsdtTask.push(() => Workers.zenithUsdtWorker(walletArr[j]))
        }

        console.log("STARTING USDT FAUCET WORKERS")
        await Workers.startLimitedTask(mintUsdtTask, maxWorker)
    } catch (error) {
        console.error(error)
    }

    console.log(timestamp(), chalk.greenBright("  DONE"))
}

start()
