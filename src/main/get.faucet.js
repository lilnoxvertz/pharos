const Proxy = require("../utils/proxy.utils");
const Wallet = require("../utils/wallet.utils");
const Workers = require("../worker/worker");
const { refferralCode } = require("../config/config");
const { ethers } = require("ethers");

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

        const faucetTask = []
        const authTask = []
        const authDataArr = []

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
            faucetTask.push(() => Workers.faucetWorker(authDataArr[j].address, authDataArr[j].token, proxy))
        }

        console.log("\n[STARTING FAUCET WORKERS]")
        await Workers.startLimitedTask(faucetTask, maxWorker)

        console.log("\nDONE!")
    } catch (error) {
        console.error(error)
    }
}

start() 