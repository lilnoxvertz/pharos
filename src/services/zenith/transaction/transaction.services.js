const { ethers, formatUnits } = require("ethers")
const { pharos, routerAddress, tokenArr, zenith, maxCycleConfig, skibidi } = require("../../../config/config")
const { parentPort, workerData } = require("worker_threads")
const PharosClient = require("../../pharos/pharos.services")
const { HttpsProxyAgent } = require("https-proxy-agent")
const Wallet = require("../../../utils/wallet.utils")
const chalk = require("chalk")
const { timestamp } = require("../../../utils/timestamp")
const Token = require("./token")
const Proxy = require("../../../utils/proxy.utils")

const proxy = Proxy.load()
const randomIndex = Math.floor(Math.random() * proxy.length)
const agent = proxy ? new HttpsProxyAgent(proxy[randomIndex]) : undefined

globalThis.fetch = (url, options = {}) => {
    return fetch(url, {
        ...options,
        agent
    })
}

const mintAbi = [{
    "name": "mint",
    "type": "function",
    "inputs": [
        {
            "name": "_asset",
            "type": "address"
        },
        {
            "name": "_account",
            "type": "address"
        },
        {
            "name": "_amount",
            "type": "uint256"
        }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
}]

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
                hash: receipt.hash,
                status: receipt.status,
                block: receipt.blockNumber
            }
        } catch (error) {
            console.error(error)
        }
    }

    static async sendToken() {
        const { wallet, proxy, token } = workerData
        const recipients = await Wallet.loadRecipientAddress()

        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined



        const sender = new ethers.Wallet(wallet, pharos.rpc)

        const amount = ethers.parseEther("0.00001")

        let i = 0
        let cycle = 0
        let maxCycle = maxCycleConfig

        while (cycle < maxCycle) {
            const randomRecipientIndex = Math.floor(Math.random() * recipients.length)
            const recipient = recipients[randomRecipientIndex]
            try {
                skibidi.processing(`${sender.address} SENDING 0.00001 PHRS TO ${recipient}`)
                const tx = await sender.sendTransaction({
                    to: recipient,
                    value: amount
                })

                await tx.wait()

                const txStatus = await this.check(tx.hash, agent)

                if (txStatus.status !== 1) {
                    skibidi.failed(`${sender.address} FAILED VERIFYING HASH`)
                    return
                }

                skibidi.success(`${sender.address} SUCCESSFULLY SENDING 0.00001 PHRS TO ${recipient}`)

                const report = await PharosClient.reportSendTokenTask(sender.address, token, tx.hash, agent)

                if (!report.status) {
                    parentPort.postMessage({
                        type: "failed",
                        data: `${sender.address} SUCCESSFULLY SENDING TOKEN BUT FAILED TO REPORT IT.`
                    })
                }

                i++
                parentPort.postMessage({
                    type: "success"
                })
            } catch (error) {
                skibidi.failed(`${sender.address} TRANSACTION REVERTED`)
                parentPort.postMessage({
                    type: "error",
                    data: error
                })
            }

            cycle++
            if (cycle === maxCycle) {
                break
            } else {
                skibidi.processing(`${sender.address} COMPLETED (${cycle}/${maxCycle}) CYCLE`)
                await new Promise(resolve => setTimeout(resolve, 100000))
            }
        }

        skibidi.success(`${sender.address} HAS SUCCESSFULLY COMPLETED (${cycle}/${maxCycle}) CYCLE`)
        parentPort.postMessage({
            type: "done"
        })
    }

    static async deposit(contract, value) {
        const deposit = await contract.deposit({ value: value })
        await deposit.wait()
        return
    }

    static async swapToken() {
        const { wallet } = workerData

        const sender = new ethers.Wallet(wallet, pharos.rpc)

        const erc20Abi = [
            'function balanceOf(address) view returns (uint256)',
            'function allowance(address owner, address spender) view returns (uint256)',
            'function approve(address spender, uint256 amount) public returns (bool)',
            "function deposit() payable",
            'function decimals() view returns (uint8)'
        ]

        const routerAbi = [
            {
                "inputs": [
                    {
                        "components": [
                            { "internalType": "address", "name": "tokenIn", "type": "address" },
                            { "internalType": "address", "name": "tokenOut", "type": "address" },
                            { "internalType": "uint24", "name": "fee", "type": "uint24" },
                            { "internalType": "address", "name": "recipient", "type": "address" },
                            { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
                            { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
                            { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" },
                        ],
                        "internalType": "struct IV3SwapRouter.ExactInputSingleParams",
                        "name": "params",
                        "type": "tuple",
                    },
                ],
                "name": "exactInputSingle",
                "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }],
                "stateMutability": "payable",
                "type": "function",
            },
        ]

        const swapMode = [
            "swap", "deposit"
        ]

        const tokens = [
            tokenArr.usdc,
            tokenArr.usdt,
            tokenArr.PHRS
        ]

        let cycle = 0
        let maxCycle = maxCycleConfig

        while (cycle < maxCycle) {
            const mode = Math.floor(Math.random() * swapMode.length)
            skibidi.processing(`${sender.address} IS TRYING TO SWAP A TOKEN`)
            try {
                switch (mode) {
                    case 0:
                        let nonce = await pharos.rpc.getTransactionCount(sender.address, "pending")
                        const router = new ethers.Contract(routerAddress, routerAbi, sender)

                        const amount = ethers.parseUnits("0.00001", 18)
                        const randomTokenIndex = Math.floor(Math.random() * tokens.length)
                        let tokenIn = tokens[randomTokenIndex]
                        const tokenOut = tokens[randomTokenIndex]

                        tokenIn === tokenOut ? tokenIn = tokenArr.PHRS : tokenIn

                        const tokenContract = new ethers.Contract(tokenIn, erc20Abi, sender)
                        const balance = await tokenContract.balanceOf(sender.address)
                        const allowance = await tokenContract.allowance(sender.address, routerAddress)

                        if (balance < amount) {
                            const deposit = await tokenContract.deposit({ value: amount })
                            await deposit.wait()

                            const depositReceipt = await this.check(deposit.hash)

                            if (depositReceipt.status !== 1) {
                                parentPort.postMessage({
                                    type: "failed",
                                    data: `${sender.address} HAS INSUFFICIENT AMOUNT`
                                })
                            }
                        }

                        if (allowance < amount) {
                            const approve = await tokenContract.approve(routerAddress, amount, {
                                nonce: nonce
                            })
                            await approve.wait()
                        }

                        const params = {
                            tokenIn: pharos.contractAddress,
                            tokenOut: tokenOut,
                            fee: 500,
                            recipient: sender.address,
                            amountIn: amount,
                            amountOutMinimum: 0n,
                            sqrtPriceLimitX96: 0n
                        }

                        const tx = await router.exactInputSingle(params, {
                            gasLimit: 300000,
                            nonce: nonce++
                        })

                        await tx.wait()
                        const receipt = await this.check(tx.hash, agent)

                        if (receipt.status !== 1) {
                            parentPort.postMessage({
                                type: "failed",
                                data: `${sender.address} FAILED VERIFYING TRANSACTION HASH`
                            })
                        }

                        parentPort.postMessage({
                            type: "success",
                            data: {
                                address: sender.address
                            }
                        })

                        break

                    case 1:
                        const pharosContract = new ethers.Contract(pharos.contractAddress, erc20Abi, sender)
                        const pharosBalance = await pharosContract.balanceOf(sender.address)
                        const amountToDeposit = ethers.parseUnits("0.00001", 18)

                        if (pharosBalance < amountToDeposit) {
                            parentPort.postMessage({
                                type: failed,
                                data: `${sender.address} HAS INSUFFICIENT BALANCE`
                            })
                        }

                        const deposit = await pharosContract.deposit({ value: amountToDeposit })
                        await deposit.wait()

                        const depositReceipt = await this.check(deposit.hash)

                        if (depositReceipt.status !== 1) {
                            parentPort.postMessage({
                                type: "failed",
                                data: `${sender.address} FAILED VERIFYING TRANSACTION HASH`
                            })
                        }

                        parentPort.postMessage({
                            type: "success",
                            data: {
                                address: sender.address
                            }
                        })
                }
            } catch (error) {
                skibidi.failed(`${sender.address} TRANSACTION REVERTED`)
                parentPort.postMessage({
                    type: "error",
                    data: error
                })
            }
            cycle++
            if (cycle === maxCycle) {
                break
            } else {
                skibidi.processing(`${sender.address} COMPLETED (${cycle}/${maxCycle}) CYCLE`)
                await new Promise(resolve => setTimeout(resolve, 100000))
            }
        }

        skibidi.success(`${sender.address} HAS SUCCESSFULLY COMPLETED (${cycle}/${maxCycle}) CYCLE`)
        parentPort.postMessage({
            type: "done"
        })
    }

    static async addLiquidity() {
        const { wallet } = workerData

        const signer = new ethers.Wallet(wallet, pharos.rpc)
        const abi = [
            {
                inputs: [
                    {
                        components: [
                            { internalType: 'address', name: 'token0', type: 'address' },
                            { internalType: 'address', name: 'token1', type: 'address' },
                            { internalType: 'uint24', name: 'fee', type: 'uint24' },
                            { internalType: 'int24', name: 'tickLower', type: 'int24' },
                            { internalType: 'int24', name: 'tickUpper', type: 'int24' },
                            { internalType: 'uint256', name: 'amount0Desired', type: 'uint256' },
                            { internalType: 'uint256', name: 'amount1Desired', type: 'uint256' },
                            { internalType: 'uint256', name: 'amount0Min', type: 'uint256' },
                            { internalType: 'uint256', name: 'amount1Min', type: 'uint256' },
                            { internalType: 'address', name: 'recipient', type: 'address' },
                            { internalType: 'uint256', name: 'deadline', type: 'uint256' },
                        ],
                        internalType: 'struct INonfungiblePositionManager.MintParams',
                        name: 'params',
                        type: 'tuple',
                    },
                ],
                name: 'mint',
                outputs: [
                    { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
                    { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
                    { internalType: 'uint256', name: 'amount0', type: 'uint256' },
                    { internalType: 'uint256', name: 'amount1', type: 'uint256' },
                ],
                stateMutability: 'payable',
                type: 'function'
            }
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

        skibidi.processing(`${signer.address} IS ADDING LIQUIDITY..`)
        const liqContract = new ethers.Contract(zenith.liqContract, abi, signer)

        let cycle = 0
        const maxCycle = maxCycleConfig

        while (cycle < maxCycle) {
            try {
                const randomPairIndex = Math.floor(Math.random() * pair.length)
                const randomPair = pair[randomPairIndex]
                const amount = "0.0001"

                const ad = await new Token(randomPair.from, wallet).decimals()
                const bd = await new Token(randomPair.to, wallet).decimals()

                const am = ethers.parseUnits(amount, ad)
                const bm = ethers.parseUnits(amount, bd)

                await new Token(randomPair.from, wallet).approve(liqContract, am)
                await new Token(randomPair.to, wallet).approve(liqContract, bm)

                let nonce = await pharos.rpc.getTransactionCount(signer.address, "pending")
                const d = Math.floor(Date.now() / 1000) + 1200
                const tl = -60000
                const th = 60000

                const params = {
                    token0: randomPair.from,
                    token1: randomPair.to,
                    fee: 500,
                    tickLower: tl,
                    tickUpper: th,
                    amount0Desired: am,
                    amount1Desired: bm,
                    amount0Min: 0,
                    amount1Min: 0,
                    recipient: signer.address,
                    deadline: d
                }

                const tx = await liqContract.mint(params, {
                    gasLimit: 500000,
                    nonce: nonce++
                })

                await tx.wait()

                const receipt = await pharos.rpc.getTransactionReceipt(tx.hash)

                if (receipt.status !== 1) {
                    parentPort.postMessage({
                        type: "failed",
                        data: `${sender.address} FAILED VERIFYING TRANSACTION HASH`
                    })
                }

                parentPort.postMessage({
                    type: "success",
                    data: {
                        address: signer.address
                    }
                })

            } catch (error) {
                skibidi.failed(`${signer.address} TRANSACTION REVERTED`)
                parentPort.postMessage({
                    type: "error",
                    data: error
                })
            }

            cycle++
            if (cycle === maxCycle) {
                break
            } else {
                skibidi.processing(`${sender.address} COMPLETED (${cycle}/${maxCycle}) CYCLE`)
                await new Promise(resolve => setTimeout(resolve, 100000))
            }
        }

        skibidi.success(`${sender.address} HAS SUCCESSFULLY COMPLETED (${cycle}/${maxCycle}) CYCLE`)
        parentPort.postMessage({
            type: "done"
        })
    }

    static async mintZenithUsdc() {
        const { wallet } = workerData

        const signer = new ethers.Wallet(wallet, pharos.rpc)

        const contract = new ethers.Contract("0x11de0e754f1df7c7b0d559721b334809a9c0dfb7", mintAbi, signer)
        const amount = ethers.parseUnits("1000", 18)

        try {
            const tx = await contract.mint(tokenArr.usdc, signer.address, amount)
            await tx.wait()
            console.log(tx)
            const receipt = await this.check(tx.hash)

            if (receipt.status !== 1) {
                parentPort.postMessage({
                    type: "failed",
                    data: `${sender.address} FAILED VERIFYING TRANSACTION HASH`
                })
            }

            parentPort.postMessage({
                type: "done",
                data: {
                    address: signer.address
                }
            })
        } catch (error) {
            skibidi.failed(`${signer.address} TRANSACTION REVERTED`)
            parentPort.postMessage({
                type: "error",
                data: chalk.red(error)
            })
        }
    }

    static async mintZenithUsdt() {
        const { wallet } = workerData

        const signer = new ethers.Wallet(wallet, pharos.rpc)

        const contract = new ethers.Contract("0x11de0e754f1df7c7b0d559721b334809a9c0dfb7", mintAbi, signer)
        const amount = ethers.parseUnits("1000", 18)

        try {
            const tx = await contract.mint(tokenArr.usdt, signer.address, amount)
            await tx.wait()

            const receipt = await this.check(tx.hash)

            if (receipt.status !== 1) {
                parentPort.postMessage({
                    type: "failed",
                    data: `${sender.address} FAILED VERIFYING TRANSACTION HASH`
                })
            }

            parentPort.postMessage({
                type: "done",
                data: {
                    address: signer.address
                }
            })
        } catch (error) {
            parentPort.postMessage({
                type: "error",
                data: chalk.red(error)
            })
        }
    }
}

module.exports = Transaction
