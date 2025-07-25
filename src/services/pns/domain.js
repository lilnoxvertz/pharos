const { Contract, hexlify, randomBytes, ethers, parseEther, keccak256, id, namehash } = require("ethers");
const { Wallet } = require("ethers");
const { pharos, skibidi } = require("../../config/config");
const { getSplittedAddress } = require("../../utils/splitAddress");
const Transaction = require("../zenith/transaction/transaction.services");
const { Interface } = require("ethers");
const { AbiCoder } = require("ethers");


const abi = [
    "function commit(bytes32 commitment)",
    "function register(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] calldata data, bool reverseRecord, uint16 ownerControlledFuses) payable"
]

const oneYear = 31536000
const resolverAddress = "0x9a43dca1c3bb268546b98eb2ab1401bfc5b58505"
const reverseRecord = true
const ownerControlledFuses = 0
const coinType = 2148182576

const iface = new Interface([
    "function setAddr(bytes32 node, uint256 coinType, bytes memory a)"
])

class Domain {
    constructor(privateKey, username) {
        this.wallet = new Wallet(privateKey, pharos.rpc);
        this.contract = new Contract(pharos.pnsContract, abi, this.wallet);
        this.username = username;
        this.label = this.username.trim().split(".")[0]
        this.truncatedAddress = getSplittedAddress(this.wallet.address)
    }

    async commit() {
        try {
            const _secret = hexlify(randomBytes(32))
            const labelHash = id(this.label)
            const node = namehash(this.username)

            const encodedBytes = iface.encodeFunctionData("setAddr", [
                node, coinType, this.wallet.address
            ])

            const _bytes = [encodedBytes]

            const encoded = AbiCoder.defaultAbiCoder().encode(
                ['bytes32', 'address', 'uint256', 'bytes32', 'address', 'bytes[]', 'bool', 'uint16'],
                [labelHash, this.wallet.address, oneYear, _secret, resolverAddress, _bytes, reverseRecord, ownerControlledFuses]
            )

            const commitHash = keccak256(encoded)

            skibidi.processing(`[PNS] ${this.truncatedAddress} Sending commit hash..`)

            const tx = await this.contract.commit(commitHash, {
                gasLimit: 300000
            })

            await tx.wait()

            const receipt = await Transaction.check(tx.hash)

            if (receipt.status !== 1) {
                skibidi.failed(`[PNS] ${this.truncatedAddress} Failed verifting tx hash!`)
                return {
                    status: false
                }
            }

            skibidi.success(`[PNS] ${this.truncatedAddress} Successfully committing username!`)
            return {
                status: true,
                secret: _secret,
                bytes: _bytes
            }
        } catch (error) {
            skibidi.failed(`[PNS] ${this.truncatedAddress} Error when committing username: ${error}`)
            return {
                status: false
            }
        }
    }

    async register(secret, bytes, price) {
        try {
            const amount = parseEther(String(price))

            const tx = await this.contract.register(
                this.label,
                this.wallet.address,
                oneYear,
                secret,
                resolverAddress,
                bytes,
                reverseRecord,
                ownerControlledFuses,
                {
                    value: amount,
                    gasLimit: 800000
                }
            )

            await tx.wait()
            const receipt = await Transaction.check(tx.hash)

            if (receipt.status !== 1) {
                skibidi.failed(`[PNS] ${this.truncatedAddress} Failed when verifying tx hash`)
                return {
                    status: false
                }
            }

            skibidi.success(`[PNS] ${this.truncatedAddress} Successfully registered ${this.username} as username`)
            return {
                status: true
            }
        } catch (error) {
            skibidi.failed(`[PNS] ${this.truncatedAddress} Error when registering username: ${error}`)
            return {
                status: false
            }
        }
    }

    async getPrice() {
        let priceFound = false
        let attempt = 0
        const maxAttempt = 3

        while (!priceFound && attempt < maxAttempt) {
            attempt++
            try {
                skibidi.processing(`[PNS] ${this.truncatedAddress} is fetching username price..`)

                const createWrapperCalldata = () => {
                    const internalSelector = "0x83e7f6ff"
                    const internalEncodedParams = AbiCoder.defaultAbiCoder().encode(
                        ['string', 'uint256'],
                        [this.label, oneYear]
                    );
                    const internalCalldata = internalSelector + internalEncodedParams.slice(2)

                    const instructionObject = [
                        "0x51bE1EF20a1fD5179419738FC71D95A8b6f8A175",
                        true,
                        internalCalldata
                    ];

                    const mainSelector = "0x82ad56cb"
                    const mainEncodedParams = AbiCoder.defaultAbiCoder().encode(
                        ['(address,bool,bytes)[]'],
                        [[instructionObject]]
                    );

                    const finalCalldata = mainSelector + mainEncodedParams.slice(2)

                    return finalCalldata
                }

                const calldata = createWrapperCalldata()

                const _price = await pharos.rpc.call({
                    to: "0x663bf72dc7477772d8bafb01118d885359b17d07",
                    data: calldata
                })

                if (!_price || _price === "0x") {
                    skibidi.failed(`[PNS] ${this.truncatedAddress} Failed fetching username price. retrying in 10 sec`)
                    await new Promise(r => setTimeout(r, 10000))
                    continue
                }

                const getReadableAmount = (hex) => {
                    const start = 2 + (6 * 64)
                    const priceHex = "0x" + hex.substring(start, start + 64)
                    const priceInWei = ethers.toBigInt(priceHex)
                    const readableAmount = ethers.formatEther(priceInWei)

                    return readableAmount
                }

                priceFound = true
                const _usernamePrice = getReadableAmount(_price)

                return {
                    status: true,
                    usernamePrice: _usernamePrice
                }
            } catch (error) {
                skibidi.failed(`[PNS] ${this.truncatedAddress} Error when fething price: ${error}`)
                continue
            }
        }

        if (!priceFound && attempt === maxAttempt) {
            return {
                status: false
            }
        }
    }
}

module.exports = { Domain }