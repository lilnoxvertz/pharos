const { HttpsProxyAgent } = require("https-proxy-agent")
const { parentPort, workerData } = require("worker_threads")
const { tokenArr } = require("../../config/config")

const url = "https://testnet-router.zenithswap.xyz/api/v1/faucet"

const headers = {
    "Content-Type": "application/json",
    "Origin": "https://testnet.zenithswap.xyz",
    "Referer": "https://testnet.zenithswap.xyz/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
}

class ZenithClient {
    static async claimUsdt(walletAddress, proxy) {
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        let success = false
        let attempt = 0
        let maxAttempt = 5

        while (!success && attempt < maxAttempt) {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: headers,
                    agent,
                    body: JSON.stringify({
                        tokenAddress: tokenArr.usdt,
                        userAddress: walletAddress
                    })
                })

                const result = await response.json()
                const status = result.status

                if (status !== 200) {
                    if (status === 400) {
                        return console.log(`❗ ${walletAddress} HAS ALREADY CLAIMED USDT TODAY`)
                    }
                    console.log(`❗ ${walletAddress} FAILED CLAIMING USDT. RETRYING`)
                    await new Promise(resolve => setTimeout(resolve, 5000))
                    continue
                }

                success = true
                return `✅ ${walletAddress} SUCCESSFULLY CLAIMING USDT`
            } catch (error) {
                console.error(error)
            }
        }
    }

    static async claimUsdc(walletAddress, proxy) {
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        let success = false
        let attempt = 0
        let maxAttempt = 5

        while (!success && attempt < maxAttempt) {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: headers,
                    agent,
                    body: JSON.stringify({
                        tokenAddress: tokenArr.usdc,
                        userAddress: walletAddress
                    })
                })

                const result = await response.json()

                console.log(result)
                const status = result.status

                if (status !== 200) {
                    if (status === 400) {
                        return console.log(`❗ ${walletAddress} HAS ALREADY CLAIMED USDC TODAY`)
                    }
                    console.log(`❗ ${walletAddress} FAILED CLAIMING USDC. RETRYING`)
                    await new Promise(resolve => setTimeout(resolve, 5000))
                    continue
                }

                success = true
                return `✅ ${walletAddress} SUCCESSFULLY CLAIMING USDC`
            } catch (error) {
                console.error(error)
            }
        }
    }
}

module.exports = ZenithClient