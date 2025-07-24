const { Contract, hexlify, randomBytes, solidityPackedKeccak256, ethers, getBytes, parseEther, keccak256, parseUnits } = require("ethers");
const { Wallet } = require("ethers");
const { pharos, skibidi } = require("../../config/config");
const { getSplittedAddress } = require("../../utils/splitAddress");
const Transaction = require("../zenith/transaction/transaction.services");
const { Username } = require("./username");
const { Interface } = require("ethers");
const { AbiCoder } = require("ethers");

const abi = [
    "function commit(bytes32 commitment)",
    "function register(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] calldata data, bool reverseRecord, uint16 ownerControlledFuses) payable"
]

const oneYear = 31536000n
const resolverAddress = "0x9a43dca1c3bb268546b98eb2ab1401bfc5b58505"
const coinType = 60n
const registerSelector = "0x74694a2b"
const reverseRecord = true
const ownerControlledFuses = 0n

const iface = new Interface([
    "function setAddr(bytes32 node, uint256 coinType, bytes memory a)"
])

class Domain {
    constructor(privateKey, username) {
        this.wallet = new Wallet(privateKey, pharos.rpc);
        this.contract = new Contract(pharos.pnsContract, abi, this.wallet);
        this.username = username;
        this.hashedUsername = Username.hash(username)
        this.truncatedAddress = getSplittedAddress(this.wallet.address)
    }

    async commit() {
        try {
            const label = this.username.trim().split(".")[0]
            const _secret = hexlify(randomBytes(32))
            const _addressBytes = getBytes(this.wallet.address)
            const encodedBytes = iface.encodeFunctionData("setAddr", [
                this.hashedUsername, coinType, this.wallet.address
            ])

            const _bytes = []

            const encoded = AbiCoder.defaultAbiCoder().encode(
                ['string', 'address', 'uint256', 'bytes32', 'address', 'bytes[]', 'bool', 'uint16'],
                [this.username, this.wallet.address, oneYear, _secret, resolverAddress, _bytes, reverseRecord, ownerControlledFuses]
            )

            const commitHash = keccak256(encoded)

            skibidi.processing(`${this.truncatedAddress} Sending commit hash..`)
            const tx = await this.contract.commit(commitHash, {
                gasLimit: 300000
            })

            await tx.wait()

            const receipt = await Transaction.check(tx.hash)

            if (receipt.status !== 1) {
                skibidi.failed(`${this.truncatedAddress} Failed verifting tx hash!`)
                return {
                    status: false
                }
            }

            skibidi.success(`${this.truncatedAddress} Successfully committing username!`)
            return {
                status: true,
                secret: _secret,
                bytes: _bytes
            }
        } catch (error) {
            skibidi.failed(`${this.truncatedAddress} Error when committing username: ${error}`)
            return {
                status: false
            }
        }
    }

    async register(secret, bytes) {
        try {
            const label = this.username.trim().split(".")[0]
            const amount = parseEther("0.0032")

            const tx = await this.contract.register(
                this.username,
                this.wallet.address,
                oneYear,
                secret,
                resolverAddress,
                bytes,
                reverseRecord,
                ownerControlledFuses,
                {
                    value: amount,
                    gasLimit: 800000,
                    maxFeePerGas: parseUnits("20", "gwei"),
                    maxPriorityFeePerGas: parseUnits("2", "gwei")
                }
            )

            console.log("receipt:", tx)
            await tx.wait()
            const receipt = await Transaction.check(tx.hash)

            if (receipt.status !== 1) {
                skibidi.failed(`${this.truncatedAddress} Failed when verifying tx hash`)
                return {
                    status: false
                }
            }

            skibidi.success(`${this.truncatedAddress} Successfully registered ${this.username} as username`)
            return {
                status: true
            }
        } catch (error) {
            skibidi.failed(`${this.truncatedAddress} Error when registering username: ${error}`)
            return {
                status: false
            }
        }
    }
}

module.exports = { Domain }