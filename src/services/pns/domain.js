const { hexlify, randomBytes, id, keccak256, parseEther, ethers } = require("ethers")
const { Transaction } = require("../transaction")
const { Username } = require("./username")
const { Interface } = require("ethers")
const { AbiCoder } = require("ethers")
const { yap } = require("../../utils/logger")
const { Contract } = require("ethers")
const { dexList, rateLimitConfig, provider } = require("../../config")
const { delay } = require("../../utils/delay")

const abi = [
    "function commit(bytes32 commitment)",
    "function register(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] calldata data, bool reverseRecord, uint16 ownerControlledFuses) payable"
]

const pnsContractAddress = dexList.contract.pharos.pnsContract

const oneYear = 31536000
const resolverAddress = "0x9a43dca1c3bb268546b98eb2ab1401bfc5b58505"
const reverseRecord = true
const ownerControlledFuses = 0
const coinType = 2148182576

const setAddrIface = new Interface([
    "function setAddr(bytes32 node, uint256 coinType, bytes memory a)"
])

class Domain extends Transaction {
    /**
     * @param {import("ethers").Wallet} wallet 
     * @param {import("ethers").Contract} contract 
     * @param {String} username 
     */
    constructor(wallet, username, price) {
        const contract = new Contract(pnsContractAddress, abi, wallet)
        const webName = "PNS"
        super(wallet, contract, webName)
        this.username = username
        this.label = username.trim().split(".")[0]
        this.price = price
        this.bytes = null
        this.secret = hexlify(randomBytes(32))
    }

    commit() {
        try {
            yap.delay(`[PNS] ${this.truncatedAddress} is constructing commit calldata`)
            const labelHash = id(this.label)
            const node = Username.hash(this.username)

            const setAddrData = [
                node, coinType, this.wallet.address
            ]

            const encodedBytes = setAddrIface.encodeFunctionData("setAddr", setAddrData)
            this.bytes = [encodedBytes]

            const params = [
                "bytes32", "address", "uint256", "bytes32", "address", "bytes[]", "bool", "uint16"
            ]

            const paramsData = [
                labelHash, this.wallet.address, oneYear, this.secret, resolverAddress, this.bytes, reverseRecord, ownerControlledFuses
            ]

            const encodedParams = AbiCoder.defaultAbiCoder().encode(params, paramsData)
            const _calldata = keccak256(encodedParams)

            this.txData = {
                functionName: "commit",
                args: [_calldata],
                method: "committing hash"
            }

            return this
        } catch (error) {
            yap.error(`[${this.webName}] ${this.truncatedAddress} Error when constructing commit hash: ${error}`)
            return false
        }
    }

    register() {
        try {
            yap.delay(`[PNS] ${this.truncatedAddress} is constructing register calldata`)
            const registerFee = parseEther(String(this.price))
            this.txData = {
                functionName: "register",
                args: [
                    this.label,
                    this.wallet.address,
                    oneYear,
                    this.secret,
                    resolverAddress,
                    this.bytes,
                    reverseRecord,
                    ownerControlledFuses,
                ],
                overrides: {
                    value: registerFee,
                    gasLimit: 800000
                },
                method: "registering domain"
            }

            return this
        } catch (error) {
            yap.error(`[${this.webName}] ${this.truncatedAddress} Error when constructing register calldata: ${error}`)
            return false
        }
    }
}

module.exports = { Domain }