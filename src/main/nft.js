const { maxWorker } = require("../config");
const { delay } = require("../utils/delay");
const { yap } = require("../utils/logger");
const { Wallet } = require("../utils/wallet");
const { Workers } = require("../worker/worker");

async function mintNft() {
    try {
        console.clear()
        const walletList = Wallet.load()

        if (walletList.length === 0) {
            yap.error(`[MAIN] No wallet was found`)
            process.exit(1)
        }

        const task = []
        for (let i = 0; i < walletList.length; i++) {
            const privateKey = walletList[i]
            task.push(() => Workers.mint(privateKey))
        }

        await Workers.startLimitedTask(task, maxWorker)
        yap.success(`[MAIN] all wallet has completed task.`)
        return
    } catch (error) {
        yap.error(`[MAIN] Error when trying to start nft task: ${error}`)
        yap.delay(`[MAIN] Retrying..`)
        await delay(20)
    }
}

mintNft()