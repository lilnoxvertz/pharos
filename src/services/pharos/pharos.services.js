const { HttpsProxyAgent } = require("https-proxy-agent")
const { authHeader, rateLimitConfig } = require("../../config/config")
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
                data: `❗ ${walletAddress} FAILED DOING CHECK IN TASK.`
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
                    console.log(`❗ ${walletAddress} FAILED TO DO CHECK IN. RETRYING`)
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
            type: "done",
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

        while (!verified && attempt < maxAttempt) {
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
                    console.warn(`Warning: Failed to parse JSON from response for ${walletAddress}:`, jsonError)
                    result = {}
                }

                const status = result?.data?.verified

                if (!status) {
                    console.log(`[FAILED VERIFYING TASK FOR ${walletAddress}]`)
                    console.log(`📃 TASK ID : 103`)
                    console.log(`📃 TX HASH : ${txhash}`)
                    await new Promise(resolve => setTimeout(resolve, 20000))
                    continue
                }

                console.log(`✅ SUCCESSFULLY REPORTING TASK FOR ${walletAddress}`)

                return {
                    status: status
                }
            } catch (error) {
                console.log(`\n❗ ERROR VERIFYING TASK`)
                console.error(error)
            }
        }
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
                    console.warn(`Warning: Failed to parse JSON from response for ${walletAddress}:`, jsonError)
                    result = {}
                }

                if (!response.ok || result.code !== 0) {
                    const status = await PharosClient.getFaucetStatus(walletAddress, token, proxy)
                    if (status === false) {
                        parentPort.postMessage({
                            type: "failed",
                            data: `❗ ${walletAddress} ALREADY CLAIMED PHRS FAUCET TODAY!`
                        })
                        break
                    }

                    console.log(`❗ FAILED GETTING PHRS FAUCET FOR ${walletAddress}. RETRYING`)
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
            type: "done",
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
                    console.log(`❗ ${walletAddress} FAILED GETTING FAUCET STATUS. RETRYING`)
                    await new Promise(resolve => setTimeout(resolve, 20000))
                    continue
                }

                success = true
                const faucetStatus = result?.data?.is_able_to_faucet

                return faucetStatus
            } catch (error) {
                console.error(error)
            }
        }
    }
}

module.exports = PharosClient