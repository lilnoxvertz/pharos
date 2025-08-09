const { HttpsProxyAgent } = require("https-proxy-agent");
const { dexList, rateLimitConfig, tokenList, provider } = require("../../config");
const { Transaction } = require("../transaction");
const { Token } = require("../token");
const { yap } = require("../../utils/logger");
const { truncateAddress } = require("../../utils/truncateAddress");
const { delay } = require("../../utils/delay");
const { ethers } = require("ethers");
const { AbiCoder } = require("ethers");
const { Wallet } = require("ethers");

const faroswapContract = dexList.contract.faroswap

const header = {
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://faroswap.xyz',
    'Referer': 'https://faroswap.xyz/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
}

class Faroswap extends Transaction {
    constructor(wallet, proxy) {
        const webName = "FAROSWAP"
        const contract = null
        super(wallet, contract, webName)
        this.proxy = proxy ? new HttpsProxyAgent(proxy) : undefined
    }

    /**
     * @param {import("ethers").Wallet} wallet 
     * @param {import("https-proxy-agent").HttpsProxyAgent} proxy 
     * @returns 
     */

    async getSwapRouteData() {
        const routes = [
            {
                from: tokenList.fPHRS,
                to: tokenList.newUsdt
            },
            {
                from: tokenList.fPHRS,
                to: tokenList.fWPHRS
            }
        ]

        const agent = this.proxy

        let data = false
        let attempt = 0
        const maxAttempt = rateLimitConfig.api

        while (!data && attempt < maxAttempt) {
            attempt++

            try {
                const route = routes[Math.floor(Math.random() * routes.length)]
                const balance = await provider.getBalance(this.wallet.address)

                if (balance === 0n) {
                    yap.error(`[FAROSWAP] ${this.truncatedAddress} has insufficient balance`)
                    return false
                }

                const amount = (balance * 1n) / 100n
                const deadline = Math.floor(Date.now() / 1000) + (20 * 60)
                const url = `https://api.dodoex.io/route-service/v2/widget/getdodoroute?chainId=688688&deadLine=${deadline}&apikey=a37546505892e1a952&slippage=10&source=dodoV2AndMixWasm&toTokenAddress=${route.to}&fromTokenAddress=${route.from}&userAddr=${this.wallet.address}&estimateGas=false&fromAmount=${amount}`

                yap.delay(`[FAROSWAP] ${this.truncatedAddress} trying to get swap route data`)
                const response = await fetch(url, {
                    method: "GET",
                    headers: header,
                    agent
                })

                if (!response.ok) {
                    yap.error(`[FAROSWAP] ${this.truncatedAddress} Failed getting swap route data. retrying`)
                    await delay(10)
                    continue
                }

                const result = await response.json()
                const swapData = result.data
                const calldata = swapData.data
                const gasLimit = swapData.gasLimit
                const routerAddress = swapData.to

                data = true

                yap.success(`[FAROSWAP] ${this.truncatedAddress} Successfully retrieved route data`)
                return {
                    calldata: calldata,
                    routerAddress: routerAddress,
                    gasLimit: gasLimit,
                    amount: amount
                }
            } catch (error) {
                yap.error(`[FAROSWAP] ${this.truncatedAddress} Error when trying to get swap route data: ${error}`)
            }
        }

        if (!data && attempt === maxAttempt) {
            yap.error(`[FAROSWAP] ${this.truncatedAddress} Reached max attempt. Failed getting swap route data`)
            return false
        }
    }

    async swap() {
        try {
            const transactionData = await this.getSwapRouteData()

            if (!transactionData) {
                return false
            }

            yap.delay(`[FAROSWAP] ${this.truncatedAddress} is constructing swap calldata`)

            this.txData = {
                target: transactionData.routerAddress,
                calldata: transactionData.calldata,
                method: "swaping token"
            }

            return this
        } catch (error) {
            yap.error(`[${this.webName}] ${this.truncatedAddress} Error when construction swap calldata: ${error}`)
        }
    }

    async addLiquidity() {
        try {
            yap.delay(`[FAROSWAP] ${this.truncatedAddress} is constructing liq calldata`)

            const pairList = [{
                from: tokenList.fWPHRS,
                to: tokenList.newUsdt
            }]

            const pair = pairList[0]

            const token1 = new Token(pair.from, this.wallet)
            const token2 = new Token(pair.to, this.wallet)

            const balance1 = await token1.balance()
            const balance2 = await token2.balance()

            const token1amount = ethers.parseEther("0.0001")
            const token2amount = ethers.parseUnits("0.0001", 6)

            const amount1min = (token1amount - 995n) / 1000n
            const amount2min = (token2amount - 995n) / 1000n

            if (balance1 === 0n || balance2 === 0n) {
                yap.error(`[${this.webName}] ${this.truncatedAddress} has insufficient balance`)
                return
            }

            const allowance1 = await token1.allowance(this.wallet.address, faroswapContract.liqContract)
            const allowance2 = await token2.allowance(this.wallet.address, faroswapContract.liqContract)

            if (allowance1 < token1amount) {
                yap.warn(`[${this.webName}] ${this.truncatedAddress} has smaller allowance than required. approving token 1`)
                await token1.approve(faroswapContract.liqContract, token1amount)
            }

            if (allowance2 < token2amount) {
                yap.warn(`[${this.webName}] ${this.truncatedAddress} has smaller allowance than required. approving token 2`)
                await token2.approve(faroswapContract.liqContract, token2amount)
            }

            if (token1amount > balance1 || token2amount > balance2) {
                yap.error(`[${this.webName}] ${this.truncatedAddress} has smaller balance than the amount required`)
                return
            }


            const deadline = Math.floor(Date.now() / 1000) + (20 * 60)

            const types = [
                "address", "address", "uint24", "uint256", "uint256",
                "uint256", "uint256", "address", "uint256"
            ]

            const params = [
                pair.from,
                pair.to,
                30n,
                token1amount,
                token2amount,
                amount1min,
                amount2min,
                this.wallet.address,
                deadline
            ]

            const selector = "0x426e40b1"
            const encodedData = AbiCoder.defaultAbiCoder().encode(types, params)
            const calldata = selector + encodedData.slice(2)

            this.txData = {
                target: faroswapContract.liqContract,
                calldata: calldata,
                method: "adding liquidity"
            }

            return this
        } catch (error) {
            yap.error(`[${this.webName}] ${this.truncatedAddress} Error when constructing liq calldata: ${error}`)
            return false
        }
    }
}

module.exports = { Faroswap }