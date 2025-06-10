const { HttpsProxyAgent } = require("https-proxy-agent")
const { rateLimitConfig, skibidi } = require("../../config/config")
const { ethers } = require("ethers")
const { getSplittedAddress } = require("../../utils/splitAddress")

class Auth {
    static async login(privateKey, reffCode, proxy) {
        const wallet = new ethers.Wallet(privateKey)
        const address = getSplittedAddress(wallet.address)
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

        if (!success && attempt === maxAttempt) {
            skibidi.failed(`${address} REACHED MAX ATTEMPT AND FAILED RETURNING AUTH TOKEN`)
            return {
                status: false
            }
        }

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
                    skibidi.failed(`${address} FAILED GETTING AUTH TOKEN. RETRYING (${attempt}/${maxAttempt})`)
                    await new Promise(resolve => setTimeout(resolve, 20000))
                    continue
                }

                success = true
                skibidi.success(`${address} SUCCESSFULLY RETRIEVED AUTH TOKEN`)
                return {
                    status: true,
                    address: wallet.address,
                    authToken: token
                }
            } catch (error) {
                skibidi.failed(`${address} ERROR: ${error}`)
            }
        }
    }
}

module.exports = Auth