const { maxWorker } = require("../config")
const { yap } = require("../utils/logger")
const { Proxy } = require("../utils/proxy")
const { Wallet } = require("../utils/wallet")
const { Workers } = require("../worker/worker")

async function domain() {
    try {
        console.clear()
        const walletList = Wallet.load()
        const proxyList = Proxy.load()

        if (walletList.length === 0) {
            yap.error(`[MAIN] No wallet was found`)
            process.exit(1)
        }

        if (proxyList.length === 0) {
            yap.warn(`[MAIN] No proxy was found.`)
            maxWorker = 2
        }

        const task = []
        for (let i = 0; i < walletList.length; i++) {
            const privateKey = walletList[i]
            const proxy = Proxy.get(proxyList, i)
            task.push(() => Workers.domain(privateKey, proxy))
        }

        await Workers.startLimitedTask(task, maxWorker)
        yap.success(`[MAIN] all wallet has completed domain task.`)
        return
    } catch (error) {
        yap.error(`[MAIN] Error when trying to start domain task: ${error}`)
        yap.delay(`[MAIN] Retrying..`)
        await delay(20)
    }
}

domain()