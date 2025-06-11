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

    static async sendToken(wallet, proxy, token) {
        const recipients = Wallet.loadRecipientAddress()
        if (recipients.length === 0) {
            skibidi.failed("No recipient addresses found in recipient.txt. Skipping send task.")
            return { success: 0, reverted: 0 };
        }

        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const sender = new ethers.Wallet(wallet, pharos.rpc)
        const address = getSplittedAddress(sender.address)

        const balance = await pharos.rpc.getBalance(sender.address);
        const minBalance = ethers.parseEther("0.0002");
        if (balance < minBalance) {
            skibidi.warn(`${address} balance is too low for sending. Skipping send task.`);
            return { success: 0, reverted: 0 };
        }

        const amountToSend = (balance * 1n) / 1000n;

        if (amountToSend === 0n) {
            skibidi.warn(`${address} 0.1% of balance is too small to send. Skipping send task.`);
            return { success: 0, reverted: 0 };
        }

        const stats = {
            success: 0,
            reverted: 0
        }

        while (stats.success < maxSuccessTransaction && stats.reverted < maxSuccessTransaction) {
            const randomRecipientIndex = Math.floor(Math.random() * recipients.length)
            const recipient = recipients[randomRecipientIndex]
            const sr = getSplittedAddress(recipient)

            try {
                skibidi.processing(`${address} IS SENDING ${ethers.formatEther(amountToSend)} PHRS TO ${sr}`)
                const tx = await sender.sendTransaction({
                    to: recipient,
                    value: amountToSend
                })

                await tx.wait()

                const txStatus = await this.check(tx.hash, agent)

                if (txStatus.status !== 1) {
                    throw new Error(`${address} FAILED VERIFYING HASH`)
                }

                skibidi.success(`${address} SUCCESSFULLY SENT ${ethers.formatEther(amountToSend)} PHRS TO ${sr}. REPORTING`)
                stats.success++

                const report = await PharosClient.reportSendTokenTask(sender.address, token, tx.hash, agent)

                if (!report.status) {
                    throw new Error(`${address} SUCCESSFULLY SENT TOKEN BUT FAILED TO REPORT IT.`)
                }
            } catch (error) {
                skibidi.failed(`${address} ERROR: ${error.message}`)
                stats.reverted++
            }

            if (stats.success < maxSuccessTransaction) {
                await new Promise(resolve => setTimeout(resolve, 20000))
            }
        }

        skibidi.success(`${address} HAS SUCCESSFULLY COMPLETED (${stats.success}/${maxSuccessTransaction}) SEND TRANSACTIONS`)
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
            "function multicall(uint256 deadline, bytes[] data) payable returns (bytes[] results)"
        ]

        const exactInputSingle = [
            "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)"
        ]

        const swapMode = ["swap", "deposit"]
        const tokens = [tokenArr.usdc, tokenArr.usdt, tokenArr.wPHRS]
        const stats = { success: 0, reverted: 0 }

        while (stats.success < maxSuccessTransaction && stats.reverted < maxSuccessTransaction) {
            const modeIndex = Math.floor(Math.random() * swapMode.length)
            const mode = swapMode[modeIndex];
            skibidi.processing(`${address} IS TRYING TO ${mode.toUpperCase()} A TOKEN`)

            try {
                switch (mode) {
                    case "swap":
                        const randomTokenIndex = Math.floor(Math.random() * tokens.length)
                        let tokenInAddress = tokens[randomTokenIndex]
                        let tokenOutAddress = tokens[Math.floor(Math.random() * tokens.length)]
                        if (tokenInAddress === tokenOutAddress) {
                            tokenOutAddress = tokens[(randomTokenIndex + 1) % tokens.length];
                        }

                        const tokenInContract = new ethers.Contract(tokenInAddress, erc20Abi, sender)
                        const tokenInBalance = await tokenInContract.balanceOf(sender.address)

                        if (tokenInBalance === 0n) {
                            skibidi.warn(`${address} has no balance of the selected token to swap. Skipping attempt.`)
                            continue;
                        }

                        const amountToSwap = (tokenInBalance * 1n) / 100n;

                        if (amountToSwap === 0n) {
                            skibidi.warn(`${address} 1% of token balance is too small to swap. Skipping.`)
                            continue;
                        }

                        const allowance = await tokenInContract.allowance(sender.address, routerAddress)
                        if (allowance < amountToSwap) {
                            const approveTx = await tokenInContract.approve(routerAddress, amountToSwap)
                            await approveTx.wait()
                        }

                        const exactInputSingleInterface = new ethers.Interface(exactInputSingle)
                        const multicallInterface = new ethers.Interface(multicallAbi)
                        const deadline = Math.floor(Date.now() / 1000) + 15 * 60;
                        const exactInputSingleParams = {
                            tokenIn: tokenInAddress,
                            tokenOut: tokenOutAddress,
                            fee: 500,
                            recipient: sender.address,
                            amountIn: amountToSwap,
                            amountOutMinimum: 0n,
                            sqrtPriceLimitX96: 0n
                        }
                        const param1 = exactInputSingleInterface.encodeFunctionData("exactInputSingle", [exactInputSingleParams])
                        const data = [param1]
                        const multicall = multicallInterface.encodeFunctionData("multicall", [deadline, data])
                        const tx = await sender.sendTransaction({ to: routerAddress, data: multicall, gasLimit: 300000 })
                        await tx.wait()

                        const receipt = await this.check(tx.hash)
                        if (receipt.status !== 1) {
                            throw new Error("Swap transaction failed to confirm or reverted.")
                        }

                        stats.success++
                        skibidi.success(`${address} SUCCESSFULLY SWAPPED A TOKEN`)
                        break

                    case "deposit":
                        const ethBalance = await pharos.rpc.getBalance(sender.address)
                        if (ethBalance < ethers.parseEther("0.0001")) {
                            skibidi.warn(`${address} has insufficient ETH to wrap. Skipping deposit attempt.`)
                            continue;
                        }

                        const amountToDeposit = (ethBalance * 1n) / 100n;
                        if (amountToDeposit === 0n) {
                            skibidi.warn(`${address} 1% of ETH balance is too small to wrap. Skipping.`)
                            continue;
                        }

                        const pharosContract = new ethers.Contract(pharos.contractAddress, erc20Abi, sender)
                        const depositTx = await pharosContract.deposit({ value: amountToDeposit })
                        await depositTx.wait()

                        const depositReceipt = await this.check(depositTx.hash)
                        if (depositReceipt.status !== 1) {
                            throw new Error("Deposit (wrap) transaction failed to confirm or reverted.")
                        }
                        stats.success++
                        skibidi.success(`${address} SUCCESSFULLY SWAPPED A TOKEN (WRAPPED ETH)`)
                        break
                }
            } catch (error) {
                skibidi.failed(`${address} TRANSACTION FAILED: ${error.message}`)
                stats.reverted++
            }

            if (stats.success < maxSuccessTransaction) {
                skibidi.processing(`${address} COMPLETED (${stats.success}/${maxSuccessTransaction}) SWAP TRANSACTION. Waiting...`)
                await new Promise(resolve => setTimeout(resolve, 20000))
            }
        }

        skibidi.success(`${address} HAS SUCCESSFULLY COMPLETED (${stats.success}/${maxSuccessTransaction}) SWAP TASK`)
        return { success: stats.success, reverted: stats.reverted }
    }

    static async addLiquidity(wallet) {
        const signer = new ethers.Wallet(wallet, pharos.rpc)
        const address = getSplittedAddress(signer.address)

        const mintAbi = [
            "function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline) params) payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"
        ]

        const multicallAbi = [
            "function multicall(bytes[] datas) payable returns (bytes[] results)"
        ]

        const pair = [
            { from: tokenArr.wPHRS, to: tokenArr.usdc, fee: 3000 },
            { from: tokenArr.usdc, to: tokenArr.wPHRS, fee: 3000 },
            { from: tokenArr.wPHRS, to: tokenArr.usdt, fee: 3000 },
            { from: tokenArr.usdt, to: tokenArr.wPHRS, fee: 3000 }
        ]

        const stats = { success: 0, reverted: 0 }

        while (stats.success < maxSuccessTransaction && stats.reverted < maxSuccessTransaction) {
            skibidi.processing(`${address} IS TRYING TO ADD LIQUIDITY..`)
            try {
                const randomPairIndex = Math.floor(Math.random() * pair.length)
                const randomPair = pair[randomPairIndex];


                const tokens = [randomPair.from, randomPair.to].sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);
                const token0Address = tokens[0];
                const token1Address = tokens[1];

                const token0Contract = new Token(token0Address, wallet);
                const token1Contract = new Token(token1Address, wallet);

                const balance0 = await token0Contract.balanceOf(signer.address);
                const balance1 = await token1Contract.balanceOf(signer.address);

                let amount0Desired = (balance0 * 1n) / 1000n;
                let amount1Desired = (balance1 * 1n) / 1000n;

                if (token0Address !== randomPair.from) {
                    [amount0Desired, amount1Desired] = [amount1Desired, amount0Desired];
                }

                if (amount0Desired === 0n || amount1Desired === 0n) {
                    skibidi.warn(`${address} INSUFFICIENT BALANCE FOR LIQUIDITY PAIR. SKIPPING.`);
                    stats.reverted++;
                    continue;
                }

                skibidi.processing(`${address} Approving ${ethers.formatUnits(amount0Desired, await token0Contract.decimals())} and ${ethers.formatUnits(amount1Desired, await token1Contract.decimals())}`);

                await token0Contract.approve(zenith.liqContract, amount0Desired);
                await token1Contract.approve(zenith.liqContract, amount1Desired);

                const d = Math.floor(Date.now() / 1000) + 1200

                const mintInterface = new ethers.Interface(mintAbi)
                const multicallInterface = new ethers.Interface(multicallAbi)

                const fee = 3000;
                const tickSpacing = 60;
                const minTick = -887220;
                const maxTick = 887220;

                const params = {
                    token0: token0Address,
                    token1: token1Address,
                    fee: fee,
                    tickLower: minTick,
                    tickUpper: maxTick,
                    amount0Desired: amount0Desired,
                    amount1Desired: amount1Desired,
                    amount0Min: 0n,
                    amount1Min: 0n,
                    recipient: signer.address,
                    deadline: d
                }

                const mint = mintInterface.encodeFunctionData("mint", [params])
                const data = [mint, "0x12210e8a"]
                const multicall = multicallInterface.encodeFunctionData("multicall", [data])

                const tx = await signer.sendTransaction({
                    to: zenith.liqContract,
                    data: multicall,
                    gasLimit: 600000
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
                skibidi.failed(`${address} TRANSACTION REVERTED: ${error.message}`)
                stats.reverted++
            }

            if (stats.success < maxSuccessTransaction) {
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