const { ethers, parseEther } = require("ethers")
const { workerData, parentPort } = require("worker_threads")
const { pharos, tokenArr, skibidi, faroswap, maxSuccessTransaction } = require("../../../config/config")
const Token = require("../../zenith/transaction/token")
const { HttpsProxyAgent } = require("https-proxy-agent")
const { getSplittedAddress } = require("../../../utils/splitAddress")
const Transaction = require("../../zenith/transaction/transaction.services")
const { AbiCoder } = require("ethers")

const pharosAddress = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"

class FaroDex {
    static async getSwapRouteData(privateKey, proxy) {
        const routes = [
            {
                from: pharosAddress,
                to: tokenArr.nUsdt
            },
            {
                from: pharosAddress,
                to: tokenArr.nWPHRS
            }
        ]

        const signer = new ethers.Wallet(privateKey, pharos.rpc)

        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const address = getSplittedAddress(signer.address)

        let data = false
        let attempt = 0
        const maxAttempt = 10

        while (!data && attempt < maxAttempt) {
            attempt++
            try {
                const randomRoute = routes[Math.floor(Math.random() * routes.length)]

                const toToken = randomRoute.to
                const fromToken = randomRoute.from

                const balance = await new Token(pharos.contractAddress, privateKey).balanceOf()

                const amount = (balance * 1n) / 1000n
                const deadline = Math.floor(Date.now() / 1000) + (20 * 60)

                const slippage = fromToken === "0xD4071393f8716661958F766DF660033b3d35fD29" ? "10.401" : "31.201"

                const url = `https://api.dodoex.io/route-service/v2/widget/getdodoroute?chainId=688688&deadLine=${deadline}&apikey=a37546505892e1a952&slippage=10&source=dodoV2AndMixWasm&toTokenAddress=${toToken}&fromTokenAddress=${fromToken}&userAddr=${signer.address}&estimateGas=false&fromAmount=${amount}`
                const header = {
                    'Accept': 'application/json, text/plain, */*',
                    'Origin': 'https://faroswap.xyz',
                    'Referer': 'https://faroswap.xyz/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
                }

                const response = await fetch(url, {
                    method: "GET",
                    headers: header,
                    agent
                })

                while (!response.ok) {
                    skibidi.failed(`[FAROSWAP] ${address} FAILED GETTING SWAP ROUTE DATA`)
                    await new Promise(r => setTimeout(r, 30000))
                    continue
                }

                const result = await response.json()
                const swapData = result.data
                const calldata = swapData.data
                const gasLimit = swapData.gasLimit
                const routerAddress = swapData.to

                data = true

                skibidi.success(`[FAROSWAP] ${address} SUCCESSFULLY RETRIEVED CALLDATA`)
                return {
                    calldata: calldata,
                    routerAddress: routerAddress,
                    gasLimit: gasLimit,
                    amount: amount
                }
            } catch (error) {
                skibidi.failed(`${address} ERROR: ${error}`)
            }
        }

        if (!data && attempt === maxAttempt) {
            return
        }
    }

    static async swapToken(wallet, proxy) {
        const signer = new ethers.Wallet(wallet, pharos.rpc)
        const truncatedAddress = getSplittedAddress(signer.address)

        const stats = {
            success: 0,
            reverted: 0
        }

        while (stats.success < maxSuccessTransaction && stats.reverted < maxSuccessTransaction) {
            const transactionData = await this.getSwapRouteData(signer.privateKey, proxy)

            if (!transactionData) {
                skibidi.failed("[FAROSWAP] No transaction data found!. skipping")
                parentPort.postMessage({
                    type: "failed"
                })
            }

            try {
                const tx = await signer.sendTransaction({
                    to: transactionData.routerAddress,
                    data: transactionData.calldata,
                    value: transactionData.amount,
                    gasLimit: 800000
                })

                await tx.wait()

                const receipt = await Transaction.check(tx.hash)

                if (receipt.status !== 1) {
                    stats.reverted++
                    throw new Error(`[FAROSWAP] ${truncatedAddress} FAILED VERIFYING TRANSACTION HASH`)
                }

                stats.success++
                skibidi.success(`[FAROSWAP] ${truncatedAddress} SUCCESSFULLY SWAPPED A TOKEN`)
            } catch (error) {
                skibidi.failed(`[FAROSWAP] ${truncatedAddress} ERROR: ${error}`)
                stats.reverted++
            }

            if (stats.success < maxSuccessTransaction) {
                skibidi.processing(`[FAROSWAP] ${truncatedAddress} COMPLETED (${stats.success}/${maxSuccessTransaction}) TRANSACTION`)
                await new Promise(resolve => setTimeout(resolve, 30000))
            }
        }

        return
    }

    static async addLiquidity(wallet) {
        const signer = new ethers.Wallet(wallet, pharos.rpc)
        const truncatedAddress = getSplittedAddress(signer.address)

        const stats = {
            success: 0,
            reverted: 0
        }

        const selector = "0x426e40b1"

        while (stats.success < maxSuccessTransaction && stats.reverted < maxSuccessTransaction) {
            try {
                const deadline = Math.floor(Date.now() / 1000) + 1200

                const pairList = [
                    {
                        from: tokenArr.nWPHRS,
                        to: tokenArr.nUsdt
                    }
                ]

                const pair = pairList[Math.floor(Math.random() * pairList.length)]

                const token1 = new Token(pair.from, wallet)
                const token2 = new Token(pair.to, wallet)

                const balance1 = await token1.balanceOf()
                const balance2 = await token2.balanceOf()

                const token1amount = ethers.parseEther("0.001")
                const token2amount = ethers.parseUnits("0.73", 6)

                const amount1min = (token1amount - 995n) / 1000n
                const amount2min = (token2amount - 995n) / 1000n

                if (balance1 === 0n || balance2 === 0n) {
                    skibidi.failed(`[FAROSWAP] ${truncatedAddress} HAS INSUFFICIENT BALANCE! SKIPPING`)
                    return
                }

                if (token2amount > balance2) {
                    skibidi.failed(`[FAROSWAP] ${truncatedAddress} USDT AMOUNT IS SMALLER THAN THE ONE THAT WAS REQUIRED! SKIPPING`)
                    return
                }

                skibidi.processing(`[FAROSWAP] ${truncatedAddress} IS APPROVING TOKEN`)
                await token1.approve(faroswap.liqContract, token1amount)
                await token2.approve(faroswap.liqContract, token2amount)

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
                    signer.address,
                    deadline
                ]

                const encodedArguments = AbiCoder.defaultAbiCoder().encode(types, params)

                const completeCalldata = selector + encodedArguments.slice(2)

                const tx = await signer.sendTransaction({
                    to: faroswap.liqContract,
                    data: completeCalldata,
                    gasLimit: 300000
                })

                await tx.wait()

                const receipt = await Transaction.check(tx.hash)

                if (receipt.status !== 1) {
                    skibidi.failed(`[FAROSWAP] ${truncatedAddress} FAILED VERIFYING TX HASH`)
                    stats.reverted++
                }

                skibidi.success(`[FAROSWAP] ${truncatedAddress} SUCCESSFULLY ADDING LIQUIDITY`)
                stats.success++
            } catch (error) {
                skibidi.failed(`[FAROSWAP] ${truncatedAddress} ERROR WHEN ADDING LIQUIDITY: ${error}`)
            }

            if (stats.success < maxSuccessTransaction) {
                skibidi.processing(`[FAROSWAP] ${truncatedAddress} COMPLETED (${stats.success}/${maxSuccessTransaction}) TRANSACTION`)
                await new Promise(resolve => setTimeout(resolve, 30000))
            }
        }

        skibidi.success(`[FAROSWAP] ${truncatedAddress} HAS SUCCESSFULLY COMPLETED (${stats.success}/${maxSuccessTransaction}) SEND TRANSACTIONS`)
        return
    }
}

module.exports = FaroDex
