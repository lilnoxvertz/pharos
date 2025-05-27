const { Worker } = require("worker_threads")
const path = require("path")
const { timestamp } = require("../utils/timestamp")
const chalk = require("chalk")

class Workers {
    static async authWorker(privateKey, reffCode, proxy) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/auth.js"), {
                workerData: {
                    privateKey: privateKey,
                    reffCode: reffCode,
                    proxy: proxy
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
                    resolve()
                }

                if (message.type === "success") {
                    const address = message.data.address
                    const token = message.data.token

                    console.log(`${timestamp()} ${chalk.greenBright(`✅ ${address} SUCCESSFULLY RETRIEVED A TOKEN`)}`)
                    resolve({
                        address: address,
                        token: token
                    })
                }

                if (message.type === "failed") {
                    console.log(`${timestamp()} ${message.data}`)
                    resolve()
                }

                if (message.type === "error") {
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    reject(new Error("WORKER STOPPED"))
                }
            })
        })
    }

    static async checkInWorker(token, walletAddress, proxy) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/checkIn.js"), {
                workerData: {
                    token: token,
                    walletAddress: walletAddress,
                    proxy: proxy
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
                    resolve()
                }

                if (message.type === "success") {
                    if (message.data.result === 1) {
                        console.log(`${timestamp()} ${chalk.greenBright(`✅ ${message.data.address} HAS CHECKED IN ALREADY`)}`)
                        resolve()
                    } else {
                        console.log(`${timestamp()} ${chalk.greenBright(`✅ ${message.data.address} SUCCESSFULLY CHECKING IN`)}`)
                        resolve()
                    }
                }

                if (message.type === "failed") {
                    console.log(chalk.redBright(message.data))
                }

                if (message.type === "error") {
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    reject(new Error("WORKER STOPPED"))
                }
            })
        })
    }

    static async sendTokenWorker(wallet, proxy, token) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/sendToken.js"), {
                workerData: {
                    wallet: wallet,
                    proxy: proxy,
                    token: token
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
                    resolve()
                }

                if (message.type === "success") {
                    resolve()
                }

                if (message.type === "failed") {
                    console.log(`${timestamp()} ${chalk.redBright(message.data)}`)
                    resolve()
                }

                if (message.type === "error") {
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    reject(new Error("WORKER STOPPED"))
                }
            })
        })
    }

    static async faucetWorker(walletAddress, token, proxy) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/getFaucet.js"), {
                workerData: {
                    walletAddress: walletAddress,
                    token: token,
                    proxy: proxy
                }
            })

            worker.on("message", async (message) => {
                if (message.type === "done") {
                    resolve()
                }
                if (message.type === "success") {
                    console.log(`${timestamp()} ${`✅ ${message.data.address} SUCCESSFULLY CLAIMED FAUCET`}`)
                    resolve()
                }

                if (message.type === "failed") {
                    console.log(`${timestamp()} ${message.data}`)
                    resolve()
                }

                if (message.type === "error") {
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    reject(new Error("WORKER STOPPED"))
                }
            })
        })
    }

    static async swapWorker(wallet) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/swapToken.js"), {
                workerData: {
                    wallet: wallet
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
                    resolve()
                }
                if (message.type === "success") {
                    console.log(`\n${timestamp()} ${chalk.greenBright(`✅ ${message.data.address} SUCCESSFULLY SWAPPING TOKEN`)}`)
                    console.log(`[+] HASH               : ${message.data.hash}`)
                    resolve()
                }

                if (message.type === "failed") {
                    console.log(`\n${chalk.redBright(message.data)}`)
                    resolve()
                }

                if (message.type === "error") {
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    console.log("WORKER STOPPED")
                }
            })
        })
    }

    static async liqWorker(wallet) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/liq.js"), {
                workerData: {
                    wallet: wallet
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
                    resolve()
                }
                if (message.type === "success") {
                    console.log(`\n${timestamp()} ${chalk.greenBright(`✅ ${message.data.address} SUCCESSFULLY ADDING LIQUIDITY`)}`)
                    console.log(`[+] HASH : ${message.data.hash}`)
                    resolve()
                }

                if (message.type === "failed") {
                    console.log(`\n${chalk.redBright(message.data)}`)
                    resolve()
                }

                if (message.type === "error") {
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    console.log("WORKER STOPPED")
                }
            })
        })
    }

    static async zenithFaucetWorker(walletAddress, proxy) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/zenithFaucet.js"), {
                workerData: {
                    walletAddress: walletAddress,
                    proxy: proxy
                }
            })

            worker.on("message", (message) => {
                if (message.type === "success") {
                    console.log(message.data)
                    resolve()
                }

                if (message.type === "failed") {
                    console.log(message.data)
                    resolve()
                }

                if (message.type === "error") {
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    console.log("WORKER STOPPED")
                }
            })
        })
    }

    static async pointsWorker(walletAddress, token, proxy) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/point.js"), {
                workerData: {
                    walletAddress: walletAddress,
                    token: token,
                    proxy: proxy
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
                    console.log(`[${message.data.address} POINTS]`)
                    console.log(chalk.yellow(`🪙 TOTAL POINTS : ${message.data.totalPoints}`))
                    console.log(chalk.yellow(`🪙 TASK POINT   : ${message.data.taskPoints}\n`))
                    resolve()
                }

                if (message.type === "failed") {
                    console.log(chalk.redBright(message.data))
                    resolve()
                }

                if (message.type === "error") {
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    console.log("WORKER STOPPED")
                }
            })
        })
    }

    static async zenithUsdcWorker(wallet) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/zenithUsdc.js"), {
                workerData: {
                    wallet: wallet
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
                    resolve()
                }
                if (message.type === "success") {
                    console.log(`\n${timestamp()} ${chalk.greenBright(`✅ ${message.data.address} SUCCESSFULLY MINTING USDC`)}`)
                    console.log(`[+] HASH               : ${message.data.hash}`)
                    resolve()
                }

                if (message.type === "failed") {
                    console.log(`\n${chalk.redBright(message.data)}`)
                    resolve()
                }

                if (message.type === "error") {
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    console.log("WORKER STOPPED")
                }
            })
        })
    }

    static async zenithUsdtWorker(wallet) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/zenithUsdt.js"), {
                workerData: {
                    wallet: wallet
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
                    resolve()
                }
                if (message.type === "success") {
                    console.log(`\n${timestamp()} ${chalk.greenBright(`✅ ${message.data.address} SUCCESSFULLY MINTING USDT`)}`)
                    console.log(`[+] HASH               : ${message.data.hash}`)
                    resolve()
                }

                if (message.type === "failed") {
                    console.log(`\n${chalk.redBright(message.data)}`)
                    resolve()
                }

                if (message.type === "error") {
                    reject(new Error(message.data))
                }
            })

            worker.on("error", reject)
            worker.on("exit", (code) => {
                if (code !== 0) {
                    console.log("WORKER STOPPED")
                }
            })
        })
    }

    static async startLimitedTask(tasks, limit) {
        const results = new Array(tasks.length)
        let nextTaskIndex = 0

        async function worker() {
            while (true) {
                const currentIndex = nextTaskIndex++
                if (currentIndex >= tasks.length) break

                try {
                    const result = await tasks[currentIndex]()
                    results[currentIndex] = result
                } catch (error) {
                    results[currentIndex] = { error }
                }
            }
        }

        const workers = Array(Math.min(limit, tasks.length))
            .fill(0)
            .map(() => worker())

        await Promise.all(workers)
        return results
    }
}

module.exports = Workers