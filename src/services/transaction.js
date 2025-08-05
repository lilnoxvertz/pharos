const { provider } = require("../config");
const { yap } = require("../utils/logger");
const { truncateAddress } = require("../utils/truncateAddress");
const { Wallet } = require("../utils/wallet");

class Transaction {
    /**
     * @param {import("ethers").Wallet} wallet 
     * @param {import("ethers").Contract} contract 
     * @param {String} webName 
     */

    constructor(wallet, contract, webName) {
        this.webName = webName.toUpperCase()

        if (!wallet) {
            yap.error(`[${this.webName}] Error: No Wallet Instance Found!`)
            return
        }

        this.wallet = wallet
        this.contract = contract ?? undefined
        this.txData = null
        this.truncatedAddress = truncateAddress(this.wallet.address)
    }

    async check(txHash) {
        const receipt = await provider.getTransactionReceipt(txHash)
        const transactionStatus = receipt.status === 1 ? true : false
        return {
            status: transactionStatus
        }
    }

    async executeWithWallet() {
        try {
            if (!this.txData) {
                yap.error(`[${this.webName}] ${this.truncatedAddress} No tx data was found!`)
                return false
            }

            const { target, calldata, method } = this.txData

            yap.warn(`[${this.webName}] ${this.truncatedAddress} is ${method}`)

            const tx = await this.wallet.sendTransaction({
                to: target,
                data: calldata,
                gasLimit: 500000
            })

            yap.delay(`[${this.webName}] ${this.truncatedAddress} is confirming transaction`)
            await tx.wait()

            const receipt = await this.check(tx.hash)
            if (!receipt.status) {
                yap.error(`[${this.webName}] ${this.truncatedAddress} Failed ${method}`)
                return false
            }

            yap.success(`[${this.webName}] ${this.truncatedAddress} Successfully ${method}`)
            return true
        } catch (error) {
            yap.error(`[${this.webName}] ${this.truncatedAddress} Failed executing transaction: ${error}`)
            return false
        }
    }

    async executeWithContractCall() {
        try {
            if (!this.txData) {
                yap.error(`[${this.webName}] ${this.truncatedAddress} No tx data was found!`)
                return false
            }

            const { functionName, args, overrides, method } = this.txData

            yap.warn(`[${this.webName}] ${this.truncatedAddress} is ${method}`)

            let tx

            if (overrides) {
                tx = await this.contract[functionName](...args, overrides)
                await tx.wait()
            } else {
                tx = await this.contract[functionName](...args)
                await tx.wait()
            }

            yap.delay(`[${this.webName}] ${this.truncatedAddress} is confirming transaction`)

            const receipt = await this.check(tx.hash)
            if (!receipt.status) {
                yap.error(`[${this.webName}] ${this.truncatedAddress} Failed ${method}`)
                return false
            }

            yap.success(`[${this.webName}] ${this.truncatedAddress} Successfully ${method}`)
            return true
        } catch (error) {
            yap.error(`[${this.webName}] ${this.truncatedAddress} Failed executing transaction: ${error}`)
            return false
        }
    }
}

module.exports = { Transaction }