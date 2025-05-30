const Proxy = require("../utils/proxy.utils")
const Wallet = require("../utils/wallet.utils")
const { refferralCode, skibidi } = require("../config/config")
const Workers = require("../worker/worker")

async function start() {
    let maxWorker = 5
    try {
        console.clear()
        const walletArr = await Wallet.load()
        const proxyArr = await Proxy.load()

        if (walletArr.length === 0) {
            skibidi.warn("NO PRIVATE KEY FOUND")
            process.exit(1)
        }

        if (proxyArr.length === 0) {
            skibidi.warn("NO PROXY")
            maxWorker = 2
        }

        skibidi.success(`[LOADED ${walletArr.length} WALLET]`)
        skibidi.success(`[LOADED ${proxyArr.length} PROXY]`)

        const authTask = []
        const authDataArr = []
        const checkinTask = []

        for (let i = 0; i < walletArr.length; i++) {
            const proxy = await Proxy.get(proxyArr, i)
            authTask.push(() => Workers.authWorker(walletArr[i], refferralCode, proxy))
        }

        skibidi.processing("[STARTING LOGIN WORKERS]")
        const authData = await Workers.startLimitedTask(authTask, maxWorker)

        walletArr.forEach((pk, index) => {
            authDataArr.push({
                address: authData[index].address,
                token: authData[index].token
            })
        })

        for (let j = 0; j < authDataArr.length; j++) {
            const proxy = await Proxy.get(proxyArr, j)
            checkinTask.push(() => Workers.checkInWorker(authDataArr[j].token, authDataArr[j].address, proxy))
        }

        skibidi.processing("[STARTING CHECK IN WORKERS]")
        await Workers.startLimitedTask(checkinTask, maxWorker)
    } catch (error) {
        skibidi.failed(error)
    }

    skibidi.success("TASKS DONE")
}

start()
