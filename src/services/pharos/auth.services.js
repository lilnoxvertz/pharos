const { HttpsProxyAgent } = require("https-proxy-agent")
const { rateLimitConfig } = require("../../config/config")
const { workerData, parentPort } = require("worker_threads")
const { ethers } = require("ethers")
const chalk = require("chalk")

class Auth {
    static async login() {
        const { privateKey, reffCode, proxy } = workerData

        const wallet = new ethers.Wallet(privateKey)
        const signature = await wallet.signMessage("pharos")

        const url = `https://api.pharosnetwork.xyz/user/login?address=${wallet.address}&signature=${signature}&invite_code=${reffCode}`
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        const header = {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en;q=0.9',
            'Authorization': 'Bearer null',
            'Cache-Control': 'no-cache',
            'Dnt': '1',
            'Origin': 'https://testnet.pharosnetwork.xyz',
            'Pragma': 'no-cache',
            'Referer': 'https://testnet.pharosnetwork.xyz/',
            'Sec-Ch-Ua': '"Chromium";v="136", "Microsoft Edge";v="136", "Not:A-Brand";v="99"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
        }

        const payload = {
            address: wallet.address,
            signature: signature,
            invite_code: reffCode
        }

        let success = false
        let attempt = 0
        let maxAttempt = rateLimitConfig.maxAttempt

        while (!success && attempt < maxAttempt) {
            attempt++
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: header,
                    agent,
                    body: JSON.stringify(payload)
                })

                const result = await response.json()
                const token = result?.data?.jwt

                if (!token) {
                    console.log(chalk.red(`${walletAddress} FAILED RETRIEVING TOKEN! RETRYING`))
                    await new Promise(resolve => setTimeout(resolve, 20000))
                    continue
                }

                success = true
                parentPort.postMessage({
                    type: "success",
                    data: {
                        address: wallet.address,
                        token: token
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
}

module.exports = Auth