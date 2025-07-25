const { Worker } = require("worker_threads")
const path = require("path")
const { timestamp } = require("../utils/timestamp")
const chalk = require("chalk")
const { skibidi } = require("../config/config")

class Workers {
    static async main(privateKey, proxy, walletNumber) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/main.js"), {
                workerData: {
                    privateKey: privateKey,
                    proxy: proxy,
                    walletNumber: walletNumber
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

    static async domain(privateKey, proxy) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/domain.js"), {
                workerData: {
                    privateKey: privateKey,
                    proxy: proxy
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
                    resolve()
                }

                if (message.type === "failed") {
                    resolve
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

    static async mint(privateKey) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/mint.js"), {
                workerData: {
                    privateKey: privateKey
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
                    resolve()
                }

                if (message.type === "success") {
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
                    skibidi.warn(`[${message.data.address} DATA]`)
                    console.log(`[POINTS]`)
                    console.log(chalk.yellowBright(`🪙 TOTAL POINTS : ${message.data.totalPoints}`))
                    console.log(chalk.yellowBright(`🪙 TASK POINT   : ${message.data.taskPoints}\n`))

                    console.log(`[TRANSACTION COUNT]`)
                    console.log(chalk.yellowBright(`➡️ SEND         : ${message.data.sendCount}`))
                    console.log(chalk.yellowBright(`🔁 SWAP         : ${message.data.swapCount}`))
                    console.log(chalk.yellowBright(`💦 LIQ          : ${message.data.liqCount}\n`))
                    resolve()
                }

                if (message.type === "failed") {
                    skibidi.failed(message.data)
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