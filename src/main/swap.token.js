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

        const swapTask = []
        for (let i = 0; i < walletArr.length; i++) {
            swapTask.push(() => Workers.swapWorker(walletArr[i]))
        }

        console.log("\nSTARTING SWAP WORKERS")
        await Workers.startLimitedTask(swapTask, maxWorker)

        console.log("DONE")
    } catch (error) {
        console.error(error)
    }
}

start()