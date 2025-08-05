const { Worker } = require("worker_threads")
const path = require("path")
const { yap } = require("../utils/logger")

class Workers {
    static async main(privateKey, proxy) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__dirname, "./task/main.js"), {
                workerData: {
                    privateKey: privateKey,
                    proxy: proxy
                }
            })

            worker.on("message", (message) => {
                if (message.type === "complete") {
                    yap.success(`[MAIN] ${message.data} Completed all task`)
                    resolve()
                }

                if (message.type === "done") {
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
            const worker = new Worker(path.resolve(__dirname, "./task/nft.js"), {
                workerData: {
                    privateKey: privateKey
                }
            })

            worker.on("message", (message) => {
                if (message.type === "done") {
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

module.exports = { Workers }