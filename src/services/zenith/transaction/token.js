const { ethers } = require("ethers");
const { pharos } = require("../../../config/config");

const abi = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) public returns (bool)',
    "function deposit() payable",
    'function decimals() view returns (uint8)'
]

class Token {
    constructor(tokenAddress, wallet) {
        this.wallet = new ethers.Wallet(wallet, pharos.rpc),
            this.contractAddress = tokenAddress,
            this.contract = new ethers.Contract(this.contractAddress, abi, this.wallet)
    }

    async balanceOf() {
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
}

module.exports = Token