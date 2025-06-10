const { ethers, hexlify } = require("ethers")
const { pharos, routerAddress, tokenArr, zenith, skibidi, maxSuccessTransaction } = require("../../../config/config")
const PharosClient = require("../../pharos/pharos.services")
const { HttpsProxyAgent } = require("https-proxy-agent")
const Wallet = require("../../../utils/wallet.utils")
const Token = require("./token")
const { getSplittedAddress } = require("../../../utils/splitAddress")

class Transaction {
    static encodeMultiCallData(pair, amount, walletAddress) {
        const data = ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'address', 'uint256', 'address', 'uint256', 'uint256', 'uint256'],
            [
                pair.to,
                pair.from,
                500,
                walletAddress,
                amount,
                0,
                0,
            ]
        )
        return [ethers.concat(['0x04e45aaf', data])]
    }


    static async check(hash) {
        try {
            const receipt = await pharos.rpc.getTransactionReceipt(hash)

            return {
                hash: receipt?.hash,
                status: receipt?.status
            }
        } catch (error) {
            console.error(error)
        }
    }

    static async sendToken(wallet, proxy, token, max) {
        const recipients = Wallet.loadRecipientAddress()
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const sender = new ethers.Wallet(wallet, pharos.rpc)
        const address = getSplittedAddress(sender.address)
        const amount = ethers.parseEther("0.00001")
        const stats = {
            success: 0,
            reverted: 0
        }

        while (stats.success < maxSuccessTransaction && stats.reverted < maxSuccessTransaction) {
            const randomRecipientIndex = Math.floor(Math.random() * recipients.length)
            const recipient = recipients[randomRecipientIndex]
            const sr = getSplittedAddress(recipient)

            try {
                skibidi.processing(`${address} IS SENDING 0.00001 PHRS TO ${sr}`)
                const tx = await sender.sendTransaction({
                    to: recipient,
                    value: amount
                })

                await tx.wait()

                const txStatus = await this.check(tx.hash, agent)

                if (txStatus.status !== 1) {
                    throw new Error(`${address} FAILED VERIFYING HASH`)
                }

                skibidi.success(`${address} SUCCESSFULLY SENDING 0.00001 PHRS TO ${sr}. REPORTING`)
                stats.success++

                const report = await PharosClient.reportSendTokenTask(sender.address, token, tx.hash, agent)

                if (!report.status) {
                    throw new Error(`${address} SUCCESSFULLY SENDING TOKEN BUT FAILED TO REPORT IT.`)
                }
            } catch (error) {
                skibidi.failed(`${address} ERROR: ${error}`)
                stats.reverted++
            }

            if (stats.success === maxSuccessTransaction) {
                break
            } else {
                skibidi.processing(`${address} COMPLETED (${stats.success}/${maxSuccessTransaction}) TRANSACTION`)
                await new Promise(resolve => setTimeout(resolve, 20000))
            }
        }

        skibidi.success(`${address} HAS SUCCESSFULLY COMPLETED (${stats.success}/${maxSuccessTransaction}) TRANSACTION`)
        return {
            success: stats.success,
            reverted: stats.reverted
        }
    }

    static async deposit(contract, value) {
        const deposit = await contract.deposit({ value: value })
        await deposit.wait()
        return
    }

    static async swapToken(wallet) {
        const sender = new ethers.Wallet(wallet, pharos.rpc)
        const address = getSplittedAddress(sender.address)

        const erc20Abi = [
            'function balanceOf(address) view returns (uint256)',
            'function allowance(address owner, address spender) view returns (uint256)',
            'function approve(address spender, uint256 amount) public returns (bool)',
            "function deposit() payable",
            'function decimals() view returns (uint8)'
        ]

        const multicallAbi = [
            "function multicall(uint256 collectionAndSelfcalls, bytes[] data) payable returns (bytes[] results)"
        ]

        const exactInputSingle = [
            "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)"
        ]

        const unwrap = [
            "function unwrapWETH9(uint256 amountMinimum, address recipient) payable"
        ]

        const swapMode = [
            "swap",
            "deposit"
        ]

        const tokens = [
            tokenArr.usdc,
            tokenArr.usdt,
            tokenArr.PHRS
        ]

        const stats = {
            success: 0,
            reverted: 0
        }

        while (stats.success < maxSuccessTransaction && stats.reverted < maxSuccessTransaction) {
            const mode = Math.floor(Math.random() * swapMode.length)
            skibidi.processing(`${address} IS TRYING TO SWAP A TOKEN`)

            try {
                switch (mode) {
                    case 0:
                        try {
                            const randomTokenIndex = Math.floor(Math.random() * tokens.length)
                            let tokenIn = tokens[randomTokenIndex]
                            const tokenOut = tokens[randomTokenIndex]

                            const tokenInContract = new Token(tokenIn, sender.privateKey)
                            const decimal = await tokenInContract.decimals()
                            const amount = ethers.parseUnits("0.00001", decimal)

                            tokenIn === tokenOut ? tokenIn = tokenArr.PHRS : tokenIn

                            const tokenContract = new ethers.Contract(tokenIn, erc20Abi, sender)
                            const balance = await tokenContract.balanceOf(sender.address)
                            const allowance = await tokenContract.allowance(sender.address, routerAddress)

                            const deadline = Math.floor(Date.now() / 1000) + 15 * 60

                            if (balance < amount) {
                                const deposit = await tokenContract.deposit({ value: amount })
                                await deposit.wait()

                                const depositReceipt = await this.check(deposit.hash)

                                if (depositReceipt.status !== 1) {
                                    skibidi.failed(`${address} HAS INSUFFICIENT BALANCE`)
                                    stats.reverted++
                                }
                            }

                            if (allowance < amount) {
                                const approve = await tokenContract.approve(routerAddress, amount)
                                await approve.wait()
                            }

                            const exactInputSingleInterface = new ethers.Interface(exactInputSingle)
                            const multicallInterface = new ethers.Interface(multicallAbi)

                            const exactInputSingleParams = {
                                tokenIn: tokenIn,
                                tokenOut: tokenOut,
                                fee: 500,
                                recipient: sender.address,
                                amountIn: amount,
                                amountOutMinimum: 0n,
                                sqrtPriceLimitX96: 0n
                            }

                            const param1 = exactInputSingleInterface.encodeFunctionData("exactInputSingle", [exactInputSingleParams])
                            const data = [param1]

                            const multicall = multicallInterface.encodeFunctionData("multicall", [
                                deadline,
                                data
                            ])

                            const tx = await sender.sendTransaction({
                                to: routerAddress,
                                data: multicall,
                                gasLimit: 300000
                            })

                            await tx.wait()

                            const receipt = await this.check(tx.hash)

                            if (receipt.status !== 1) {
                                skibidi.warn(`${address} FAILED VERIFYING TRANSACTION HASH`)
                            } else {
                                stats.success++
                                skibidi.success(`${address} SUCCESSFULLY SWAPPED A TOKEN`)
                            }
                        } catch (error) {
                            skibidi.failed(`${address} TRANSACTION REVERTED`)
                            stats.reverted++
                        }

                        break

                    case 1:
                        try {
                            const pharosContract = new ethers.Contract(pharos.contractAddress, erc20Abi, sender)
                            const pharosBalance = await pharosContract.balanceOf(sender.address)
                            const amountToDeposit = ethers.parseUnits("0.00001", 18)

                            if (pharosBalance < amountToDeposit) {
                                skibidi.failed(`${address} HAS INSUFFICIENT BALANCE`)
                            }

                            const deposit = await pharosContract.deposit({ value: amountToDeposit })
                            await deposit.wait()

                            const depositReceipt = await this.check(deposit.hash)

                            if (depositReceipt.status !== 1) {
                                skibidi.failed(`${address} FAILED VERIFYING TRANSACTION HASH`)
                            } else {
                                stats.success++
                                skibidi.success(`${address} SUCCESSFULLY SWAPPED A TOKEN`)
                            }
                        } catch (error) {
                            skibidi.failed(`${address} TRANSACTION REVERTED`)
                            stats.reverted++
                        }

                        break
                }
            } catch (error) {
                skibidi.failed(`${address} FAILED CREATING TRANSACTION`)
            }

            if (stats.success === maxSuccessTransaction) {
                break
            } else {
                skibidi.processing(`${address} COMPLETED (${stats.success}/${maxSuccessTransaction}) TRANSACTION`)
                await new Promise(resolve => setTimeout(resolve, 20000))
            }
        }

        skibidi.success(`${address} HAS SUCCESSFULLY COMPLETED(${stats.success}/${maxSuccessTransaction}) TRANSACTION`)
        return {
            success: stats.success,
            reverted: stats.reverted
        }
    }

    static async addLiquidity(wallet) {
        const signer = new ethers.Wallet(wallet, pharos.rpc)
        const address = getSplittedAddress(signer.address)

        const mintAbi = [
            "function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline) params) payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"
        ]

        const pair = [
            {
                from: tokenArr.PHRS,
                to: tokenArr.usdc
            },
            {
                from: tokenArr.usdc,
                to: tokenArr.PHRS
            },
            {
                from: tokenArr.PHRS,
                to: tokenArr.usdt
            },
            {
                from: tokenArr.usdt,
                to: tokenArr.PHRS
            }
        ]

        const stats = {
            success: 0,
            reverted: 0
        }


        while (stats.success < maxSuccessTransaction && stats.reverted < maxSuccessTransaction) {
            skibidi.processing(`${address} IS TRYING TO ADD LIQUIDITY..`)
            try {
                const randomPairIndex = Math.floor(Math.random() * pair.length)
                const randomPair = pair[randomPairIndex]

                const amount1 = randomPair.from === tokenArr.PHRS ? "0.00001" : "0.05"
                const amount2 = randomPair.to === tokenArr.PHRS ? "0.00001" : "0.05"

                const ad = await new Token(randomPair.from, wallet).decimals()
                const bd = await new Token(randomPair.to, wallet).decimals()

                const am = ethers.parseUnits(amount1, ad)
                const bm = ethers.parseUnits(amount2, bd)

                await new Token(randomPair.from, wallet).approve(zenith.liqContract, am)
                await new Token(randomPair.to, wallet).approve(zenith.liqContract, bm)

                const d = Math.floor(Date.now() / 1000) + 1200

                const mintInterface = new ethers.Interface(mintAbi)

                const randomTickLower = Math.floor(Math.random() * (60000 + 20000 + 1)) + 20000
                const randomTickUpper = Math.floor(Math.random() * (120000 + 60000 + 1)) + 60000

                const params = {
                    token0: randomPair.from,
                    token1: randomPair.to,
                    fee: 3000,
                    tickLower: 66840,
                    tickUpper: 80700,
                    amount0Desired: am,
                    amount1Desired: bm,
                    amount0Min: 0n,
                    amount1Min: 0n,
                    recipient: signer.address,
                    deadline: d
                }

                const mint = mintInterface.encodeFunctionData("mint", [params])
                const nonce = await pharos.rpc.getTransactionCount(signer.address, "pending")

                const tx = await signer.sendTransaction({
                    to: zenith.liqContract,
                    data: mint,
                    gasLimit: 500000,
                    nonce: nonce
                })

                await tx.wait()
                const receipt = await pharos.rpc.getTransactionReceipt(tx.hash)

                if (receipt.status === 1) {
                    stats.success++
                    skibidi.success(`${address} SUCCESSFULLY ADDED LIQUIDITY`)
                } else {
                    skibidi.failed(`${address} FAILED VERIFYING TRANSACTION HASH`)
                }

            } catch (error) {
                skibidi.failed(`${address} TRANSACTION REVERTED`)
                stats.reverted++
            }

            if (stats.success === maxSuccessTransaction) {
                break
            } else {
                skibidi.processing(`${address} COMPLETED (${stats.success}/${maxSuccessTransaction}) TRANSACTION`)
                await new Promise(resolve => setTimeout(resolve, 20000))
            }
        }

        skibidi.success(`${address} HAS SUCCESSFULLY COMPLETED (${stats.success}/${maxSuccessTransaction}) TRANSACTION`)
        return {
            success: stats.success,
            reverted: stats.reverted
        }
    }
}

module.exports = Transaction
