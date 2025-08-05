const { Contract, parseEther } = require("ethers");
const { dexList, provider } = require("../../config");
const { Transaction } = require("../transaction");
const { Wallet } = require("../../utils/wallet");
const { yap } = require("../../utils/logger");

const primusContract = dexList.contract.primus

const abi = [
    "function tip((uint32,address) token, (string,string,uint256,uint256[]) recipient)",
    "function tipBatch(tuple(uint32 chainId, address tokenAddress) token, tuple(string handle, string note, uint256 amount, uint256[] nftTokenIds)[] recipients)"
]

class Primus extends Transaction {
    constructor(wallet) {
        const webName = "PRIMUS"
        const contract = new Contract(primusContract.tipContract, abi, wallet)
        super(wallet, contract, webName)
    }

    async tip() {
        try {
            yap.delay(`[PRIMUS] ${this.truncatedAddress} is constructing tip calldata`)
            const balance = await provider.getBalance(this.wallet.address)
            const amountToSend = parseEther("0.00001")

            if (balance < amountToSend) {
                return false
            }

            const recipientList = Wallet.loadTwitterUsername()
            const recipient = recipientList[Math.floor(Math.random() * recipientList.length)]
            const username = recipient.slice(1)

            yap.warn(`[PRIMUS] ${this.truncatedAddress} is trying to tip ${recipient}`)
            const tokenParams = [
                1,
                "0x0000000000000000000000000000000000000000"
            ]

            const recipientParams = [
                "x",
                username,
                amountToSend,
                []
            ]

            this.txData = {
                functionName: "tip",
                args: [tokenParams, recipientParams],
                overrides: {
                    value: amountToSend,
                    gasLimit: 800000
                },
                method: "tipping"
            }

            return this
        } catch (error) {
            yap.error(`[${this.webName}] ${this.truncatedAddress} Error when constructing tip calldata: ${error}`)
            return false
        }
    }
}

module.exports = { Primus }