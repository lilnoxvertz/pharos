const { skibidi } = require("../config/config")
const Wallet = require("../utils/wallet.utils")
const Workers = require("../worker/worker")

async function mint() {
    let maxWorker = 10

    try {
        const wallets = Wallet.load()

        if (wallets.length === 0) {
            throw new Error(`[NO PRIVATE KEYS FOUND]`)
        }

        const mintTask = []
        for (let i = 0; i < wallets.length; i++) {
            mintTask.push(() => Workers.mint(wallets[i]))
        }

        await Workers.startLimitedTask(mintTask, maxWorker)
        skibidi.success(`SUCCESSFULLY COMPLETED MINT TASK!`)
    } catch (error) {
        skibidi.failed(`Error when running mint task: ${error}`)
        process.exit(1)
    }
}

mint()