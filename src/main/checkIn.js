const Proxy = require("../utils/proxy.utils")
const Wallet = require("../utils/wallet.utils")
const { refferralCode } = require("../config/config")
const Workers = require("../worker/worker")

async function start() {
    let maxWorker = 5
    try {
        console.clear()
        const walletArr = await Wallet.load()
        const proxyArr = await Proxy.load()

        console.log(`[LOADED ${walletArr.length} WALLET]`)
        console.log(`[LOADED ${proxyArr.length} PROXY]`)

        if (walletArr.length === 0) {
            console.log("❗no private key found!")
            process.exit(1)
        }

        if (proxyArr.length === 0) {
            console.log("❗no proxy found, using current ip")
            maxWorker = 2
        }

        const authTask = []
        const authDataArr = []
        const checkinTask = []

        for (let i = 0; i < walletArr.length; i++) {
            const proxy = proxyArr.length === 0 ? "" : proxyArr[i % proxyArr.length]
            authTask.push(() => Workers.authWorker(walletArr[i], refferralCode, proxy))
        }

        console.log("\n[STARTING LOGIN WORKER]")
        const authData = await Workers.startLimitedTask(authTask, maxWorker)

        walletArr.forEach((pk, index) => {
            authDataArr.push({
                address: authData[index].address,
                token: authData[index].token
            })
        })

        for (let j = 0; j < authDataArr.length; j++) {
            const proxy = proxyArr.length === 0 ? "" : proxyArr[j % proxyArr.length]
            checkinTask.push(() => Workers.checkInWorker(authDataArr[j].token, authDataArr[j].address, proxy))
        }

        console.log("\n[STARTING CHECK IN WORKERS]")
        await Workers.startLimitedTask(checkinTask, maxWorker)

        console.log("\nDONE!")
    } catch (error) {
        console.error(error)
    }
}

start()
