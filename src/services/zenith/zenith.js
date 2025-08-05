const { Contract, parseEther } = require("ethers");
const { Transaction } = require("../transaction");
const { dexList, transactionLimitConfig, tokenList } = require("../../config");
const { Token } = require("../token");
const { yap } = require("../../utils/logger");
const { Interface } = require("ethers");

const zenithContract = dexList.contract.zenith

class Zenith extends Transaction {
    /**
     * @param {import("ethers").Wallet} wallet 
     * @param {import("ethers").Contract} contract 
     */

    constructor(wallet) {
        const contract = undefined
        const webName = "zenith"
        super(wallet, contract, webName)
    }

    async swap() {
        yap.delay(`[ZENITH] ${this.truncatedAddress} is constructing swap calldata`)
        const multicallAbi = [
            "function multicall(uint256 deadline, bytes[] data) payable returns (bytes[] results)"
        ]
        const exactInputSingleAbi = [
            "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)"
        ]

        const pairList = [
            {
                from: tokenList.zWPHRS,
                to: tokenList.oldUsdc,
            },
            {
                from: tokenList.zWPHRS,
                to: tokenList.oldUsdt,
            },
            {
                from: tokenList.zWPHRS,
                to: tokenList.newUsdt,
            },
            {
                from: tokenList.zWPHRS,
                to: tokenList.newUsdc,
            },
            {
                from: tokenList.oldUsdc,
                to: tokenList.zWPHRS,
            },
            {
                from: tokenList.oldUsdt,
                to: tokenList.zWPHRS,
            },
            {
                from: tokenList.newUsdt,
                to: tokenList.zWPHRS,
            },
            {
                from: tokenList.newUsdc,
                to: tokenList.zWPHRS,
            }
        ]

        try {
            const pair = pairList[Math.floor(Math.random() * pairList.length)]

            const tokenInContract = new Token(pair.from, this.wallet)
            const tokenInBalance = await tokenInContract.balance()

            if (tokenInBalance === 0n && pair.from === tokenList.zWPHRS) {
                const amountTodeposit = parseEther("0.01")
                const deposit = await tokenInContract.deposit(amountTodeposit)

                if (!deposit) {
                    return false
                }
            } else if (tokenInBalance === 0n) {
                yap.error(`[${this.webName}] ${this.truncatedAddress} has insufficient balance`)
                return false
            }

            const allowance = await tokenInContract.allowance(this.wallet.address, zenithContract.swapContract)
            const amountToSwap = (tokenInBalance * 1n) / 10000n

            if (allowance < amountToSwap) {
                yap.warn(`[${this.webName}] ${this.truncatedAddress} has smaller allowance than the mount to swap. approving more token`)
                await tokenInContract.approve(zenithContract.swapContract, amountToSwap)
            }

            const exactInputSingleIface = new Interface(exactInputSingleAbi)
            const multicallIface = new Interface(multicallAbi)
            const deadline = Math.floor(Date.now() / 1000) + 1200

            const exactInputSingleParams = {
                tokenIn: pair.from,
                tokenOut: pair.to,
                fee: 500,
                recipient: this.wallet.address,
                amountIn: amountToSwap,
                amountOutMinimum: 0n,
                sqrtPriceLimitX96: 0n
            }

            const params = exactInputSingleIface.encodeFunctionData("exactInputSingle", [exactInputSingleParams])
            const data = [params]
            const _calldata = multicallIface.encodeFunctionData("multicall", [deadline, data])

            this.txData = {
                target: zenithContract.swapContract,
                calldata: _calldata,
                method: "swapping"
            }

            return this
        } catch (error) {
            yap.error(`[${this.webName}] ${this.truncatedAddress} Error when constructing swap calldata: ${error}`)
            return false
        }
    }

    async addLiquidity() {
        yap.delay(`[ZENITH] ${this.truncatedAddress} is constructing liq calldata`)
        const mintAbi = [
            "function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline) params) payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"
        ]

        const multicallAbi = [
            "function multicall(bytes[] datas) payable returns (bytes[] results)"
        ]

        const pairList = [
            {
                from: tokenList.zWPHRS,
                to: tokenList.oldUsdc,
                fee: 3000
            },
            {
                from: tokenList.oldUsdc,
                to: tokenList.zWPHRS,
                fee: 3000
            },
            {
                from: tokenList.zWPHRS,
                to: tokenList.oldUsdt,
                fee: 3000
            },
            {
                from: tokenList.oldUsdt,
                to: tokenList.zWPHRS,
                fee: 3000
            },
            {
                from: tokenList.zWPHRS,
                to: tokenList.newUsdc,
                fee: 3000
            },
            {
                from: tokenList.newUsdc,
                to: tokenList.zWPHRS,
                fee: 3000
            },
            {
                from: tokenList.zWPHRS,
                to: tokenList.newUsdt,
                fee: 3000
            },
            {
                from: tokenList.newUsdt,
                to: tokenList.zWPHRS,
                fee: 3000
            }
        ]

        try {
            const pair = pairList[Math.floor(Math.random() * pairList.length)]

            const tokens = [pair.from, pair.to].sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)
            const token0Address = tokens[0]
            const token1Address = tokens[1]

            const token0Contract = new Token(token0Address, this.wallet)
            const token1Contract = new Token(token1Address, this.wallet)

            const balance0 = await token0Contract.balance()
            const balance1 = await token1Contract.balance()

            if (balance0 === 0n || balance1 === 0n) {
                yap.error(`[${this.webName}] ${this.truncatedAddress} has insufficient balance for liq pair`)
                return false
            }

            const allowance0 = await token0Contract.allowance(this.wallet.address, zenithContract.liqContract)
            const allowance1 = await token1Contract.allowance(this.wallet.address, zenithContract.liqContract)

            let amount0Desired = (balance0 * 1n) / 1000n
            let amount1Desired = (balance1 * 1n) / 1000n

            if (allowance0 < amount0Desired) {
                await token0Contract.approve(zenithContract.liqContract, amount0Desired)
            }

            if (allowance1 < amount1Desired) {
                await token1Contract.approve(zenithContract.liqContract, amount1Desired)
            }

            if (token0Address !== pair.from) {
                [amount0Desired, amount1Desired] = [amount1Desired, amount0Desired]
            }

            const _deadline = Math.floor(Date.now() / 1000) + 1200
            const minTick = -887220
            const maxTick = 887220

            const mintIface = new Interface(mintAbi)
            const multicallIface = new Interface(multicallAbi)

            const params = {
                token0: token0Address,
                token1: token1Address,
                fee: pair.fee,
                tickLower: minTick,
                tickUpper: maxTick,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: 0n,
                amount1Min: 0n,
                recipient: this.wallet.address,
                deadline: _deadline
            }

            const mintData = mintIface.encodeFunctionData("mint", [params])
            const data = [mintData, "0x12210e8a"]
            const _calldata = multicallIface.encodeFunctionData("multicall", [data])

            this.txData = {
                target: zenithContract.liqContract,
                calldata: _calldata,
                method: "adding liquidity"
            }

            return this
        } catch (error) {
            yap.error(`[${this.webName}] ${this.truncatedAddress} Error when constructing liq calldata: ${error}`)
            return false
        }
    }
}

module.exports = { Zenith }