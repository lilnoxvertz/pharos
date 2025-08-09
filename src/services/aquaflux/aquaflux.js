const { Contract, parseEther } = require("ethers");
const { dexList, rateLimitConfig } = require("../../config");
const { Transaction } = require("../transaction");
const { AbiCoder } = require("ethers");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { yap } = require("../../utils/logger");
const { delay } = require("../../utils/delay");

const aquafluxContract = dexList.contract.aquaflux

const header = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Origin": "https://playground.aquaflux.pro",
    "Referer": "https://playground.aquaflux.pro/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"
}

const abi = [
    "function claimTokens()",
    "function MINT(uint256 amount)"
]

const compositions = [
    "fortress",
    "balancer",
    "hunter"
]

class Aquaflux extends Transaction {
    constructor(wallet, proxy) {
        const webName = "AQUAFLUX"
        const contract = new Contract(aquafluxContract.mintContract, abi, wallet)
        super(wallet, contract, webName)
        this.proxy = proxy ? new HttpsProxyAgent(proxy) : undefined
    }

    async split() {
        yap.delay(`[AQUAFLUX] ${this.truncatedAddress} is constructing split calldata`)
        this.txData = {
            functionName: "claimTokens",
            args: [],
            overrides: null,
            method: "claiming token"
        }

        return this
    }

    async craft() {
        yap.delay(`[AQUAFLUX] ${this.truncatedAddress} is constructing craft calldata`)
        const composition = compositions[Math.floor(Math.random() * compositions.length)]
        yap.warn(`[AQUAFLUX] ${this.truncatedAddress} choosed ${composition}`)

        switch (composition) {
            case "fortress": {
                const calldata = "0x7905642a0000000000000000000000000000000000000000000000056bc75e2d63100000"

                this.txData = {
                    target: aquafluxContract.mintContract,
                    calldata: calldata,
                    method: "minting token"
                }

                break
            }

            case "balancer": {
                const calldata = "0x7aa747000000000000000000000000000000000000000000000000056bc75e2d63100000"

                this.txData = {
                    target: aquafluxContract.mintContract,
                    calldata: calldata,
                    method: "minting token"
                }

                break
            }

            case "hunter": {
                const calldata = "0x4c10b5230000000000000000000000000000000000000000000000056bc75e2d63100000"

                this.txData = {
                    target: aquafluxContract.mintContract,
                    calldata: calldata,
                    method: "minting token"
                }

                break
            }
        }

        return this
    }

    async claimReward() {
        try {
            yap.delay(`[AQUAFLUX] ${this.truncatedAddress} is constructing claim reward calldata`)
            const token = await this.login()
            const rawData = await this.getRawData(token)

            const encodedParams = AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "bytes"],
                [0, rawData._expiredAt, rawData._signature]
            )

            const calldata = "0x75e7e053" + encodedParams.slice(2)

            this.txData = {
                target: aquafluxContract.mintContract,
                calldata: calldata,
                method: "minting nft"
            }

            return this
        } catch (error) {
            yap.error(`[AQUAFLUX] ${this.truncatedAddress} Error when constructing mint calldata: ${error}`)
            return false
        }
    }

    async login() {
        const agent = this.proxy
        const signatureMessage = `Sign in to AquaFlux with timestamp: ${Date.now()}`
        const signature = await this.wallet.signMessage(signatureMessage)

        const url = "https://api.aquaflux.pro/api/v1/users/wallet-login"
        const payload = {
            address: this.wallet.address,
            message: signatureMessage,
            signature: signature,
            agent
        }

        let tokenFound = false
        let attempt = 0
        const maxAttempt = rateLimitConfig.api

        while (!tokenFound && attempt < maxAttempt) {
            try {
                yap.delay(`[AQUAFLUX] ${this.truncatedAddress} is trying to get auth token`)
                const response = await fetch(url, {
                    method: "POST",
                    headers: header,
                    body: JSON.stringify(payload),
                    agent
                })

                if (!response.ok) {
                    yap.error(`[AQUAFLUX] ${this.truncatedAddress} Failed getting response. retrying`)
                    await delay(20)
                    continue
                }

                const result = await response.json()
                const status = result.status

                if (status !== "success") {
                    yap.error(`[AQUAFLUX] ${this.truncatedAddress} Failed getting auth token`)
                    return false
                }

                const data = result.data
                const token = data.accessToken

                if (!token) {
                    yap.error(`[AQUAFLUX] ${this.truncatedAddress} No auth token found`)
                    return false
                }

                tokenFound = true
                yap.success(`[AQUAFLUX] ${this.truncatedAddress} Successfully getting auth token`)
                return token
            } catch (error) {
                yap.error(`[AQUAFLUX] ${this.truncatedAddress} Error when trying to get auth token: ${error}`)
            }

            await delay(20)
        }

        if (!tokenFound && attempt === maxAttempt) {
            yap.error(`[AQUAFLUX] ${this.truncatedAddress} Reached max attempt. Failed getting signature`)
            return false
        }
    }

    async getRawData(authToken) {
        const agent = this.proxy
        const url = "https://api.aquaflux.pro/api/v1/users/get-signature"

        const payload = {
            requestedNftType: 0,
            walletAddress: this.wallet.address
        }

        let signatureFound = false
        let attempt = 0
        const maxAttempt = rateLimitConfig.api

        while (!signatureFound && attempt < maxAttempt) {
            attempt++

            try {
                yap.delay(`[AQUAFLUX] ${this.truncatedAddress} is trying to get signature`)
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        ...header,
                        "Authorization": `Bearer ${authToken}`,
                    },
                    body: JSON.stringify(payload),
                    agent
                })

                if (!response.ok) {
                    yap.error(`[AQUAFLUX] ${this.truncatedAddress} Failed getting response. retrying`)
                    await delay(20)
                    continue
                }

                const result = await response.json()
                const status = result.status

                if (status !== "success") {
                    yap.error(`[AQUAFLUX] ${this.truncatedAddress} Failed getting signature hash`)
                    return false
                }


                const data = result.data
                const signature = data.signature
                const expiredAt = data.expiresAt

                if (!signature) {
                    yap.error(`[AQUAFLUX] ${this.truncatedAddress} No signature found`)
                    return false
                }

                signatureFound = true
                yap.success(`[AQUAFLUX] ${this.truncatedAddress} Successfully getting signature`)
                return {
                    _signature: signature,
                    _expiredAt: expiredAt
                }
            } catch (error) {
                yap.error(`[AQUAFLUX] ${this.truncatedAddress} Error when trying to get signature: ${error}`)
            }

            await delay(20)
        }

        if (!signatureFound && attempt === maxAttempt) {
            yap.error(`[AQUAFLUX] ${this.truncatedAddress} Reached max attempt. Failed getting signature`)
            return false
        }
    }
}

module.exports = { Aquaflux }
