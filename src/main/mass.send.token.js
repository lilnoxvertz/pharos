const Wallet = require("../utils/wallet.utils")
const Proxy = require("../utils/proxy.utils")
const { refferralCode, maxWorker } = require("../config/config")
const Workers = require("../worker/worker")

async function start() {
    try {
        console.clear()
        const senderWalletArr = await Wallet.load()
        const proxyArr = await Proxy.load()

        const sendTask = []
        const authTask = []
        const authDataArr = []

        for (let i = 0; i < senderWalletArr.length; i++) {
            const proxy = proxyArr.length === 0 ? "" : proxyArr[i % proxyArr.length]
            authTask.push(() => Workers.authWorker(senderWalletArr[i], refferralCode, proxy))
        }

        console.log("\n[STARTING LOGIN WORKER]")
        const authData = await Workers.startLimitedTask(authTask, maxWorker)

        senderWalletArr.forEach((pk, index) => {
            authDataArr.push({
                address: authData[index].address,
                token: authData[index].token
            })
        })

        for (let j = 0; j < senderWalletArr.length; j++) {
            const proxy = proxyArr.length === 0 ? "" : proxyArr[j % proxyArr.length]
            sendTask.push(() => Workers.sendTokenWorker(senderWalletArr[j], proxy, authDataArr[j].token))
        }

        console.log("\n[STARTING SEND TOKEN WORKERS]")
        await Workers.startLimitedTask(sendTask, maxWorker)

        console.log("\nDONE!")
    } catch (error) {
        console.error(error)
    }
}

start()