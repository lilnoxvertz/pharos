const { Wallet } = require("../utils/wallet");
const { Proxy } = require("../utils/proxy");
const { yap } = require("../utils/logger");
const { maxWorker } = require("../config");
const { Workers } = require("../worker/worker");
const { delay } = require("../utils/delay");

async function main() {
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

    while (true) {
        try {
            const task = []

            for (let i = 0; i < walletList.length; i++) {
                const privateKey = walletList[i]
                const proxy = Proxy.get(proxyList, i)
                task.push(() => Workers.main(privateKey, proxy))
            }

            yap.warn(`[MAIN] Starting cycle`)

            const a = await Workers.startLimitedTask(task, maxWorker)
            console.log(a)
            yap.delay(`[MAIN] all wallet has completed task. restarting in 60 minute`)
            const minutes = 60 * 60
            await delay(minutes)
        } catch (error) {
            yap.error(`[MAIN] Error when trying to start main task: ${error}`)
            yap.delay(`[MAIN] Retrying..`)
            await delay(20)
        }
    }
}

main()