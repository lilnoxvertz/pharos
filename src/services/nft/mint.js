const { ethers } = require("ethers")
const { pharos, skibidi } = require("../../config/config")
const { Contract } = require("ethers")
const Transaction = require("../zenith/transaction/transaction.services")
const { workerData, parentPort } = require("worker_threads")
const { getSplittedAddress } = require("../../utils/splitAddress")

const contractAddress = "0x1da9f40036bee3fda37ddd9bff624e1125d8991d"

const nftContract = [
    "function claim(address _receiver, uint256 _quantity, address _currency, uint256 _pricePerToken, (bytes32[],uint256,uint256,address) _allowlistProof, bytes _data)"
]

const zeroAddress = "0x0000000000000000000000000000000000000000"
const amount = ethers.parseEther("1")

async function mint() {
    const { privateKey } = workerData
    const minter = new ethers.Wallet(privateKey, pharos.rpc)
    const contract = new Contract(contractAddress, nftContract, minter)
    const truncatedAddress = getSplittedAddress(minter.address)
    try {
        const balance = pharos.rpc.getBalance(minter.address)

        if (balance < 1n) {
            skibidi.failed(`[GRANDLINE] ${truncatedAddress} Didn't have enough balance for minting nft (1 PHRS)`)
            parentPort.postMessage({
                type: "done"
            })
        }

        skibidi.processing(`[GRANDLINE] ${truncatedAddress} is minting an nft`)
        const tx = await contract.claim(
            minter.address,
            1,
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            amount,
            [[], 0, ethers.MaxUint256, zeroAddress],
            "0x",
            {
                gasLimit: 300000,
                value: amount
            }
        )

        await tx.wait()

        const receipt = await Transaction.check(tx.hash)

        if (receipt.status !== 1) {
            throw new Error(`[GRANDLINE] ${truncatedAddress} Failed verifying tx hash!`)
        }

        skibidi.success(`[GRANDLINE] ${truncatedAddress} Successfully minted PHRS nft`)
        parentPort.postMessage({
            type: "success"
        })
    } catch (error) {
        skibidi.failed(`[GRANDLINE] ${truncatedAddress} Error when minting nft: ${error}`)
        parentPort.postMessage({
            type: "error",
            data: error
        })
    }

    parentPort.postMessage({
        type: "done"
    })
}

module.exports = mint