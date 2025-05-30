const { HttpsProxyAgent } = require("https-proxy-agent")
const { authHeader, rateLimitConfig, skibidi } = require("../../config/config")
const { parentPort, workerData } = require("worker_threads")
const ZenithClient = require("../zenith/zenith.services")

class PharosClient {
    static async checkIn() {
        const { token, walletAddress, proxy } = workerData

        const url = `https://api.pharosnetwork.xyz/sign/in?address=${walletAddress}`

        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        const header = {
            ...authHeader,
            'Authorization': `Bearer ${token}`,
        }

        let success = false
        let checkInAttempt = 0
        let maxAttempt = rateLimitConfig.maxAttempt

        if (!success && checkInAttempt === maxAttempt) {
            parentPort.postMessage({
                type: "failed",
                data: `${walletAddress} FAILED DOING CHECK IN TASK.`
            })
        }

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
                    skibidi.failed(`${walletAddress} FAILED DOING CHECK IN TASK. RETRYING (${checkInAttempt}/${maxAttempt})`)
                    await new Promise(resolve => setTimeout(resolve, 20000))
                    continue
                }

                success = true
                parentPort.postMessage({
                    type: "success",
                    data: {
                        address: walletAddress,
                        result: result.code
                    }
                })
                return
            } catch (error) {
                parentPort.postMessage({
                    type: "error",
                    data: error
                })
            }
        }

        parentPort.postMessage({
            type: "done"
        })
    }

    static async reportSendTokenTask(walletAddress, token, txhash, agent) {
        const url = `https://api.pharosnetwork.xyz/task/verify?address=${walletAddress}&task_id=103&tx_hash=${txhash}`

        const header = {
            ...authHeader,
            'Authorization': `Bearer ${token}`,
        }

        let verified = false
        let attempt = 0
        let maxAttempt = rateLimitConfig.maxAttempt

        if (!verified && attempt === maxAttempt) {
            return {
                status: false
            }
        }

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
                    skibidi.failed(`${walletAddress} FAILED PARSING JSON`)
                    result = {}
                }

                const status = result?.data?.verified

                if (!status) {
                    skibidi.failed(`${walletAddress} FAILED VERIFYING TASK. RETRYING (${attempt}/${maxAttempt})`)
                    await new Promise(resolve => setTimeout(resolve, 20000))
                    continue
                }

                skibidi.success(`${walletAddress} SUCCESSFULLY REPORTING TASK`)

                return {
                    status: true
                }
            } catch (error) {
                skibidi.failed(`${walletAddress} ERROR VERIFYING TASK`)
            }
        }

        return
    }

    static async getFaucet() {
        const { walletAddress, token, proxy } = workerData
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const url = `https://api.pharosnetwork.xyz/faucet/daily?address=${walletAddress}`
        const header = {
            ...authHeader,
            "Authorization": `Bearer ${token}`
        }

        let success = false
        let attempt = 0
        const maxAttempt = rateLimitConfig.maxAttempt

        if (!success && attempt === maxAttempt) {
            parentPort.postMessage({
                type: "failed",
                data: `${walletAddress} FAILED GETTING FAUCET`
            })
        }

        while (!success && attempt < maxAttempt) {
            attempt++
            try {
                // await ZenithClient.claimUsdc(walletAddress, proxy)
                // await ZenithClient.claimUsdt(walletAddress, proxy)

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
                    skibidi.failed(`${walletAddress} FAILED PARSING JSON`)
                    result = {}
                }

                if (!response.ok || result.code !== 0) {
                    const status = await PharosClient.getFaucetStatus(walletAddress, token, proxy)
                    if (status === false) {
                        parentPort.postMessage({
                            type: "failed",
                            data: `${walletAddress} ALREADY CLAIMED PHRS FAUCET TODAY!`
                        })
                        break
                    }

                    skibidi.failed(`${walletAddress} FAILED GETTING PHRS FAUCET. RETRYING (${attempt}/${maxAttempt})`)
                    await new Promise(resolve => setTimeout(resolve, 20000))
                    continue
                }

                success = true
                parentPort.postMessage({
                    type: "success",
                    data: {
                        address: walletAddress,
                        code: result.code
                    }
                })
            } catch (error) {
                parentPort.postMessage({
                    type: "error",
                    data: error.message || String(error)
                })
            }
        }

        parentPort.postMessage({
            type: "done"
        })
    }


    static async getFaucetStatus(walletAddress, token, proxy) {
        const url = `https://api.pharosnetwork.xyz/faucet/status?address=${walletAddress}`

        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        const header = {
            ...authHeader,
            "Authorization": `Bearer ${token}`
        }

        let success = false
        let attempt = 0
        let maxAttempt = rateLimitConfig.maxAttempt

        if (!success && attempt === maxAttempt) {
            skibidi.failed(`${walletAddress} FAILED GETTING FAUCET STATUS`)
            return
        }

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
                    skibidi.failed(`${walletAddress} FAILED GETTING FAUCET STATUS. RETRYING (${attempt}/${maxAttempt})`)
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

        return
    }

    static async getPoint() {
        const { walletAddress, token, proxy } = workerData
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const url = `https://api.pharosnetwork.xyz/user/profile?address=${walletAddress}`

        const header = {
            ...authHeader,
            "Authorization": token
        }

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: header,
                agent
            })

            if (!response.ok) {
                parentPort.postMessage({
                    type: "failed",
                    data: `${walletAddress} FAILED GETTING POINTS`
                })
            }
            const result = await response.json()
            const totalPoints = result?.data?.user_info.TotalPoints
            const taskPoints = result?.data?.user_info.TaskPoints

            parentPort.postMessage({
                type: "done",
                data: {
                    address: walletAddress,
                    totalPoints: totalPoints,
                    taskPoints: taskPoints
                }
            })
        } catch (error) {
            parentPort.postMessage({
                type: "error",
                data: error
            })
        }
    }
}

module.exports = PharosClient