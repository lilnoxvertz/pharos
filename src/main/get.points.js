const { refferralCode, skibidi } = require("../config/config");
const Proxy = require("../utils/proxy.utils");
const Wallet = require("../utils/wallet.utils");
const Workers = require("../worker/worker");

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

        if (proxyArr.length === 0) {
            skibidi.warn("NO PROXY FOUND. USING CURRENT IP AND LIMITING WORKERS")
            maxWorker = 2
        }

        skibidi.success(`[LOADED ${walletArr.length} WALLET]`)
        skibidi.success(`[LOADED ${proxyArr.length} PROXY]`)

        const pointTask = []
        const authTask = []
        const authDataArr = []

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

        for (let j = 0; j < walletArr.length; j++) {
            const proxy = await Proxy.get(proxyArr, j)
            pointTask.push(() => Workers.pointsWorker(authDataArr[j].address, authDataArr[j].token, proxy))
        }

        skibidi.processing("[STARTING POINT WORKERS]")
        await Workers.startLimitedTask(pointTask, maxWorker)
    } catch (error) {
        skibidi.failed(error)
    }

    skibidi.success("TASKS DONE")
}

start()