const { refferralCode } = require("../config/config");
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
            console.log("❗no private key found!")
            process.exit(1)
        }

        if (proxyArr.length === 0) {
            console.log("❗no proxy found, using current ip")
            maxWorker = 2
        }

        const pointTask = []
        const authTask = []
        const authDataArr = []

        for (let i = 0; i < walletArr.length; i++) {
            const proxy = proxyArr.length === 0 ? "" : proxyArr[i % proxyArr.length]
            authTask.push(() => Workers.authWorker(walletArr[i], refferralCode, proxy))
        }

        console.log("[STARTING LOGIN WORKER]")
        const authData = await Workers.startLimitedTask(authTask, maxWorker)

        walletArr.forEach((pk, index) => {
            authDataArr.push({
                address: authData[index].address,
                token: authData[index].token
            })
        })

        for (let j = 0; j < walletArr.length; j++) {
            const proxy = proxyArr.length === 0 ? "" : proxyArr[j % proxyArr.length]
            pointTask.push(() => Workers.pointsWorker(authDataArr[j].address, authDataArr[j].token, proxy))
        }

        console.log("\n[STARTING POINT WORKER]")
        await Workers.startLimitedTask(pointTask, maxWorker)

        console.log("DONE")
    } catch (error) {
        console.error()
    }
}

start()