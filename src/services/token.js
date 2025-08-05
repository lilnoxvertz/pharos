const { Contract } = require("ethers")
const { tokenList } = require("../config")
const { yap } = require("../utils/logger")
const { truncateAddress } = require("../utils/truncateAddress")
const { Transaction } = require("./transaction")

const erc20abi = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) public returns (bool)',
    "function deposit() payable",
    'function decimals() view returns (uint8)'
]

class Token {
    /**
     * @param {String} tokenAddress 
     * @param {import("ethers").Wallet} wallet 
     */
    constructor(tokenAddress, wallet) {
        this.wallet = wallet
        this.truncatedAddress = truncateAddress(wallet.address)
        this.contract = new Contract(tokenAddress, erc20abi, wallet)
    }

    async balance() {
        const balance = await this.contract.balanceOf(this.wallet.address)
        return balance
    }

    async decimals() {
        const decimal = await this.contract.decimals()
        return decimal
    }

    async approve(spender, amount) {
        const approve = await this.contract.approve(spender, amount)
        await approve.wait()
    }

    async allowance(address, spender) {
        const allowance = this.contract.allowance(address, spender)
        return allowance
    }

    async deposit(amount) {
        const contractAddress = await this.contract.getAddress()
        if (contractAddress !== tokenList.zWPHRS) {
            yap.error(`[DEPOSIT] ${this.truncatedAddress} ${contractAddress} cant be wrapped!`)
            return false
        }

        try {
            const tx = await this.contract.deposit({ value: amount })
            await tx.wait()

            const receipt = await new Transaction().check(tx.hash)

            if (!receipt.status) {
                yap.error(`[DEPOSIT] ${this.truncatedAddress} Failed confirming tx hash`)
                return false
            }

            yap.success(`[DEPOSIT] ${this.truncatedAddress} Successfully deposited PHRS token`)
            return true
        } catch (error) {
            yap.error(`[DEPOSIT] ${this.truncatedAddress} Error when trying to deposit token: ${error}`)
            return false
        }
    }
}

module.exports = { Token }