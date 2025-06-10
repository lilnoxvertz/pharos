const { HttpsProxyAgent } = require("https-proxy-agent")
const { authHeader, rateLimitConfig, skibidi } = require("../../config/config")
const { parentPort, workerData } = require("worker_threads")
const { getSplittedAddress } = require("../../utils/splitAddress")

class PharosClient {
    static async checkIn(token, walletAddress, proxy) {
        const url = `https://api.pharosnetwork.xyz/sign/in?address=${walletAddress}`

        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        const header = {
            ...authHeader,
            'Authorization': `Bearer ${token}`,
        }

        const address = getSplittedAddress(walletAddress)

        let success = false
        let checkInAttempt = 0
        let maxAttempt = rateLimitConfig.maxAttempt

        while (!success && checkInAttempt < maxAttempt) {
            checkInAttempt++
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: header,
                    agent
                })

                const result = await response.json()

                if (!response.ok) {
                    skibidi.failed(`${address} FAILED DOING CHECK IN TASK. RETRYING (${checkInAttempt}/${maxAttempt})`)
                    await new Promise(resolve => setTimeout(resolve, 20000))
                    continue
                }

                success = true

                if (result.code === 1) {
                    success = true
                    return {
                        status: false,
                        msg: `${address} HAS CHECKED IN ALREADY`
                    }
                }

                skibidi.success(`${address} SUCCESSFULLY CHECKING IN`)

                return {
                    status: true,
                }
            } catch (error) {
                skibidi.failed(`${address} ERROR: ${error}`)
            }
        }

        if (!success && checkInAttempt === maxAttempt) {
            return {
                status: false,
                msg: `${address} REACHED MAX ATTEMPT AND FAILED DOING CHECK IN`
            }
        }
    }

    static async reportSendTokenTask(walletAddress, token, txhash, agent) {
        const address = getSplittedAddress(walletAddress)
        const url = `https://api.pharosnetwork.xyz/task/verify?address=${walletAddress}&task_id=103&tx_hash=${txhash}`

        const header = {
            ...authHeader,
            'Authorization': `Bearer ${token}`,
        }

        let verified = false
        let attempt = 0
        let maxAttempt = 1

        while (!verified && attempt < maxAttempt) {
            attempt++
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: header,
                    agent
                })

                let result
                try {
                    const text = await response.text()
                    result = text ? JSON.parse(text) : {}
                } catch (jsonError) {
                    skibidi.failed(`${address} FAILED PARSING JSON`)
                    result = {}
                }

                const status = result?.data?.verified

                if (!status) {
                    skibidi.failed(`${address} FAILED VERIFYING TASK`)
                    await new Promise(resolve => setTimeout(resolve, 20000))
                    continue
                }

                verified = true
                skibidi.success(`${address} SUCCESSFULLY REPORTING TASK`)

                return {
                    status: true
                }
            } catch (error) {
                skibidi.failed(`${address} ERROR VERIFYING TASK`)
            }
        }

        if (!verified && attempt === maxAttempt) {
            return {
                status: false
            }
        }
    }

    static async getFaucet(walletAddress, token, proxy) {
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const url = `https://api.pharosnetwork.xyz/faucet/daily?address=${walletAddress}`
        const header = {
            ...authHeader,
            "Authorization": `Bearer ${token}`
        }

        const address = getSplittedAddress(walletAddress)

        let success = false
        let attempt = 0
        const maxAttempt = 3

        while (!success && attempt < maxAttempt) {
            attempt++
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: header,
                    agent
                })

                let result = null
                try {
                    const text = await response.text()
                    result = text ? JSON.parse(text) : {}
                } catch (jsonError) {
                    skibidi.failed(`${sp} FAILED PARSING JSON`)
                    result = {}
                }

                if (!response.ok) {
                    skibidi.failed(`${address} FAILED GETTING PHRS FAUCET. RETRYING (${attempt}/${maxAttempt})`)
                    await new Promise(resolve => setTimeout(resolve, 20000))
                    continue
                }

                if (result.msg === "user has not bound X account") {
                    skibidi.failed(`${address} FAILED CLAIMING FAUCET. NO X ACCOUNT CONNECTED`)
                    attempt = 3
                    break
                }

                success = true
                skibidi.success(`${address} SUCCESSFULLY CLAIMED FAUCET`)
                return {
                    status: true
                }
            } catch (error) {
                skibidi.failed(`${address} ERROR: ${error}`)
            }
        }

        if (!success && attempt === maxAttempt) {
            return {
                status: false,
                msg: `${address} REACHED MAX ATTEMPT AND FAILED GETTING PHRS FAUCET`
            }
        }
    }


    static async getFaucetStatus(walletAddress, token, proxy) {
        const address = getSplittedAddress(walletAddress)
        const url = `https://api.pharosnetwork.xyz/faucet/status?address=${walletAddress}`

        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        const header = {
            ...authHeader,
            "Authorization": `Bearer ${token}`
        }

        let success = false
        let attempt = 0
        let maxAttempt = rateLimitConfig.maxAttempt

        while (!success && attempt < maxAttempt) {
            attempt++
            try {
                const response = await fetch(url, {
                    method: "GET",
                    headers: header,
                    agent
                })

                const result = await response.json()

                if (!response.ok) {
                    skibidi.failed(`${address} FAILED GETTING FAUCET STATUS. RETRYING (${attempt}/${maxAttempt})`)
                    await new Promise(resolve => setTimeout(resolve, 20000))
                    continue
                }

                success = true
                const faucetStatus = result?.data?.is_able_to_faucet

                return faucetStatus
            } catch (error) {
                skibidi.failed(error)
            }
        }

        if (!success && attempt === maxAttempt) {
            skibidi.failed(`${address} FAILED GETTING FAUCET STATUS`)
            return
        }
    }

    static async getPoint() {
        const { walletAddress, token, proxy } = workerData
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const url = `https://api.pharosnetwork.xyz/user/profile?address=${walletAddress}`

        const header = {
            ...authHeader,
            "Authorization": token
        }

        const splittedAddress = getSplittedAddress(walletAddress)

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: header,
                agent
            })

            if (!response.ok) {
                parentPort.postMessage({
                    type: "failed",
                    data: `${splittedAddress} FAILED GETTING POINTS`
                })
            }
            const result = await response.json()

            const totalPoints = result?.data?.user_info.TotalPoints
            const taskPoints = result?.data?.user_info.TaskPoints

            const transactionCount = await this.getTransactionData(walletAddress, token, proxy)

            parentPort.postMessage({
                type: "done",
                data: {
                    address: walletAddress,
                    totalPoints: totalPoints,
                    taskPoints: taskPoints,
                    sendCount: transactionCount.sendCount,
                    swapCount: transactionCount.swapCount,
                    liqCount: transactionCount.liqCount
                }
            })
        } catch (error) {
            skibidi.error(`${walletAddress} ERROR: ${error}`)
            parentPort.postMessage({
                type: "error",
                data: error
            })
        }
    }

    static async getTransactionData(walletAddress, token, proxy) {
        const url = `https://api.pharosnetwork.xyz/user/tasks?address=${walletAddress}`
        const header = {
            ...authHeader,
            "Authorization": token
        }

        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: header,
                agent
            })

            const result = await response.json()
            const user_task = result.data.user_tasks

            let swapCount = 0
            let sendCount = 0
            let liqCount = 0

            user_task.forEach((id, index) => {
                const taskId = user_task[index].TaskId
                const count = user_task[index].CompleteTimes

                if (taskId === "101" || taskId === 101) {
                    swapCount = count
                } else if (taskId === "102" || taskId === 102) {
                    liqCount = count
                } else if (taskId === "103" || taskId === 103) {
                    sendCount = count
                }
            })

            return {
                swapCount: swapCount,
                sendCount: sendCount,
                liqCount: liqCount
            }
        } catch (error) {
            skibidi.failed(`${walletAddress} ERROR: ${error}`)
        }
    }
}

module.exports = PharosClient