const { parseEther, ethers } = require("ethers");
const { Transaction } = require("../transaction");
const { provider, dexList } = require("../../config");
const { yap } = require("../../utils/logger");
const { Contract } = require("ethers");

const abi = [
    "function claim(address _receiver, uint256 _quantity, address _currency, uint256 _pricePerToken, (bytes32[],uint256,uint256,address) _allowlistProof, bytes _data)"
]

const grandlineContract = dexList.contract.grandLine.pharosNftContract

const amountToMint = parseEther("1")
const zeroAddress = ethers.ZeroAddress

class Grandline extends Transaction {
    constructor(wallet) {
        const contract = new Contract(grandlineContract, abi, wallet)
        const webName = "GRANDLINE"
        super(wallet, contract, webName)
    }

    async mint() {
        try {
            yap.delay(`[GRANDLINE] ${this.truncatedAddress} is constructing mint calldata`)

            const balance = provider.getBalance(this.wallet.address)
            if (balance < amountToMint) {
                yap.error(`[GRANDLINE] ${this.truncatedAddress} has a balance less than the amount required (1 PHRS)`)
                return false
            }

            this.txData = {
                functionName: "claim",
                args: [
                    this.wallet.address,
                    1,
                    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                    amountToMint,
                    [[], 0, ethers.MaxUint256, zeroAddress],
                    "0x"
                ],
                overrides: {
                    gasLimit: 800000,
                    value: amountToMint
                },
                method: "minting nft"
            }

            return this
        } catch (error) {
            yap.error(`[${this.webName}] ${this.truncatedAddress} Error when construction mint transaction: ${error}`)
        }
    }
}

module.exports = { Grandline }