const { parseEther, ethers } = require("ethers");
const { transactionLimitConfig, rateLimitConfig } = require("../../config");
const { truncateAddress } = require("../../utils/truncateAddress");
const { Wallet } = require("../../utils/wallet");
const { Transaction } = require("../transaction");
const { yap } = require("../../utils/logger");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { delay } = require("../../utils/delay")

const authHeader = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Dnt': '1',
    'Origin': 'https://testnet.pharosnetwork.xyz',
    'Pragma': 'no-cache',
    'Priority': 'u=1, i',
    'Referer': 'https://testnet.pharosnetwork.xyz/',
    'Sec-Ch-Ua': '"Chromium";v="136", "Microsoft Edge";v="136", "Not:A-Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
}

class Pharos {
    /**
     * @param {import("ethers").Wallet} wallet 
     */
    constructor(wallet) {
        this.webName = "PHAROS"
        this.wallet = wallet
        this.truncatedAddress = truncateAddress(wallet.address)
    }

    static async login(privateKey, reffCode, proxy) {
        const wallet = new ethers.Wallet(privateKey)
        const truncatedAddress = truncateAddress(wallet.address)
        const signature = await wallet.signMessage("pharos")

        yap.warn(`[PHAROS] ${truncatedAddress} is trying to get auth token`)
        const url = `https://api.pharosnetwork.xyz/user/login?address=${wallet.address}&signature=${signature}&invite_code=${reffCode}`
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        const payload = {
            address: wallet.address,
            signature: signature,
            invite_code: reffCode
        }

        let success = false
        let attempt = 0
        const maxAttempt = rateLimitConfig.api

        while (!success && attempt < maxAttempt) {
            attempt++
            try {
                yap.delay(`[PHAROS] is trying to get auth token`)
                const response = await fetch(url, {
                    method: "POST",
                    headers: authHeader,
                    agent,
                    body: JSON.stringify(payload)
                })

                const result = await response.json()
                const token = result?.data?.jwt

                if (!token) {
                    yap.error(`[PHAROS] ${truncatedAddress} Failed getting auth token. Retrying (${attempt}/${maxAttempt})`)
                    await delay(10)
                    continue
                }

                success = true
                yap.success(`[PHAROS] ${truncatedAddress} Successfully retrieving auth token`)
                return {
                    status: true,
                    address: wallet.address,
                    authToken: token
                }
            } catch (error) {
                yap.error(`[PHAROS] ${truncatedAddress} Error when trying to get auth token: ${error}`)
                return {
                    status: false
                }
            }
        }

        if (!success && attempt === maxAttempt) {
            yap.error(`[PHAROS] ${truncatedAddress} Reached max attempt. failed getting auth token`)
            return {
                status: false
            }
        }
    }

    async sendPHRS() {
        try {
            const recipientList = await Wallet.loadRecipientAddress()
            const amountToSend = parseEther("0.00001")
            const randomRecipient = recipientList[Math.floor(Math.random() * recipientList.length)]
            const truncatedRecipientAddress = truncateAddress(randomRecipient)

            yap.warn(`[PHAROS] ${this.truncatedAddress} is sending token to ${truncatedRecipientAddress}`)
            const tx = await this.wallet.sendTransaction({ value: amountToSend })
            await tx.wait()

            const receipt = await new Transaction(this.wallet, undefined, this.webName).check(tx.hash)

            if (!receipt.status) {
                yap.error(`[PHAROS] ${this.truncatedAddress} Failed confirming tx hash`)
                return false
            }

            yap.success(`[PHAROS] ${this.truncatedAddress} Successfully sending token to ${truncatedRecipientAddress}`)
            return true
        } catch (error) {
            yap.error(`[PHAROS] ${this.truncatedAddress} Error when sending token: ${error}`)
            return false
        }
    }

    static async checkin(walletAddress, token, proxy) {
        const url = `https://api.pharosnetwork.xyz/sign/in?address=${walletAddress}`
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const header = {
            ...authHeader,
            "Authorization": `Bearer ${token}`
        }

        const truncatedAddress = truncateAddress(walletAddress)
        let success = false
        let attempt = 0
        const maxAttempt = rateLimitConfig.api

        while (!success && attempt < maxAttempt) {
            attempt++

            try {
                yap.delay(`[PHAROS] ${truncatedAddress} is trying to check in`)
                const response = await fetch(url, {
                    method: "POST",
                    headers: header,
                    agent
                })

                const result = await response.json()
                if (!response.ok) {
                    yap.error(`[PHAROS] ${truncatedAddress} Failed checking in. Retrying (${attempt}/${maxAttempt})`)
                    await delay(10)
                    continue
                }

                success = true

                if (result.code === 1) {
                    success = true
                    yap.warn(`[PHAROS] ${truncatedAddress} has checked in already`)
                    return {
                        status: false
                    }
                }

                yap.success(`[PHAROS] ${truncatedAddress} Successfully checking in`)
                return {
                    status: true
                }
            } catch (error) {
                yap.error(`[PHAROS] ${truncatedAddress} Error when trying to chek in: ${error}`)
            }
        }

        if (!success && attempt === maxAttempt) {
            yap.error(`[PHAROS] ${truncatedAddress} Reached max attempt. Failed checking in`)
            return {
                status: false
            }
        }
    }

    static async reportSendTokenTask(walletAddress, token, txhash, agent) {
        const truncatedAddress = truncateAddress(walletAddress)
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
                yap.delay(`[PHAROS] ${truncatedAddress} is trying to report task`)
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
                    yap.error(`[PHAROS] ${truncatedAddress} Failed parsing JSON`)
                    result = {}
                }

                const status = result?.data?.verified

                if (!status) {
                    yap.error(`[PHAROS] ${truncatedAddress} Failed verifying status`)
                    await delay(10)
                    continue
                }

                verified = true
                yap.success(`[PHAROS] ${truncatedAddress} Successfully reporting task`)

                return {
                    status: true
                }
            } catch (error) {
                yap.error(`[PHAROS] ${truncatedAddress} Error when trying to verify task: ${error}`)
            }
        }

        if (!verified && attempt === maxAttempt) {
            return {
                status: false
            }
        }
    }

    static async getFaucet(walletAddress, token, proxy) {
        const truncatedAddress = truncateAddress(walletAddress)
        const faucetStatus = await this.getFaucetStatus(walletAddress, token, proxy)

        if (!faucetStatus) {
            yap.error(`[PHAROS] ${truncatedAddress} Faucet already claimed`)
            return {
                status: false
            }
        }

        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const url = `https://api.pharosnetwork.xyz/faucet/daily?address=${walletAddress}`
        const header = {
            ...authHeader,
            "Authorization": `Bearer ${token}`
        }

        let success = false
        let attempt = 0
        const maxAttempt = 3

        while (!success && attempt < maxAttempt) {
            attempt++
            try {
                yap.delay(`[PHAROS] ${truncatedAddress} is trying to claim status`)
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
                    yap.error(`[PHAROS] ${truncateAddress} Failed parsing JSON`)
                    result = {}
                }

                if (!response.ok) {
                    yap.error(`[PHAROS]${truncatedAddress} Failed getting PHRS faucet. retrying (${attempt}/${maxAttempt})`)
                    await delay(10)
                    continue
                }

                if (result.msg === "user has not bound X account") {
                    yap.error(`[PHAROS]${truncatedAddress} Failed claiming faucet. no X account connected`)
                    attempt = 3
                    break
                }

                success = true
                yap.success(`[PHAROS] ${truncatedAddress} Successfully claimed faucet`)

                return {
                    status: true
                }
            } catch (error) {
                yap.error(`[PHAROS] ${truncatedAddress} Error when trying to get faucet: ${error}`)
            }
        }

        if (!success && attempt === maxAttempt) {
            yap.error(`[PHAROS] ${truncatedAddress} Reached max attempt. failed claiming faucet`)
            return {
                status: false
            }
        }
    }


    static async getFaucetStatus(walletAddress, token, proxy) {
        const truncatedAddress = truncateAddress(walletAddress)
        const url = `https://api.pharosnetwork.xyz/faucet/status?address=${walletAddress}`

        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined

        const header = {
            ...authHeader,
            "Authorization": `Bearer ${token}`
        }

        let success = false
        let attempt = 0
        let maxAttempt = rateLimitConfig.api

        while (!success && attempt < maxAttempt) {
            attempt++
            try {
                yap.delay(`[PHAROS] ${truncatedAddress} is trying to get faucet status`)
                const response = await fetch(url, {
                    method: "GET",
                    headers: header,
                    agent
                })

                const result = await response.json()

                if (!response.ok) {
                    yap.error(`[PHAROS] ${truncatedAddress} Failed getting faucet status. Retrying (${attempt}/${maxAttempt})`)
                    await delay(10)
                    continue
                }

                success = true
                const faucetStatus = result?.data?.is_able_to_faucet

                return faucetStatus
            } catch (error) {
                yap.error(`[PHAROS] Error when trying to get faucet status: ${error}`)
                return false
            }
        }

        if (!success && attempt === maxAttempt) {
            yap.error(`[PHAROS] ${truncatedAddress} Reached max attempt. Failed getting faucet status`)
            return false
        }
    }

    static async getPoint(walletAddress, token, proxy) {
        const url = `https://api.pharosnetwork.xyz/user/profile?address=${walletAddress}`
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const truncatedAddress = truncateAddress(walletAddress)

        const header = {
            ...authHeader,
            "Authorization": token
        }

        let pointFound = false
        let attempt = 0
        const maxAttempt = rateLimitConfig.api

        while (!pointFound && attempt < maxAttempt) {
            attempt++
            try {
                yap.delay(`[PHAROS] ${truncatedAddress} is trying to get wallet point`)
                const response = await fetch(url, {
                    method: "GET",
                    headers: header,
                    agent
                })

                if (!response.ok) {
                    yap.error(`[PHAROS] ${truncatedAddress} Failed getting user data. Retrying (${attempt}/${maxAttempt})`)
                    await delay(10)
                    continue
                }
                const result = await response.json()
                const data = result.data.user_info
                const totalPoint = data.TotalPoints

                return totalPoint
            } catch (error) {
                yap.error(`[PHAROS] Error when trying to get profile data: ${error}`)
                return false
            }
        }

        if (!pointFound && attempt === maxAttempt) {
            yap.error(`[PHAROS] ${truncatedAddress} Reached max attempt. Failed getting profile data`)
            return false
        }
    }
}

module.exports = { Pharos }