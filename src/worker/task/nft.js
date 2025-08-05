const { Wallet } = require("ethers")
const { workerData, parentPort } = require("worker_threads")
const { provider } = require("../../config")
const { Grandline } = require("../../services/grandline/grandline")
const { yap } = require("../../utils/logger")

async function mintNft() {
    const { privateKey } = workerData
    const wallet = new Wallet(privateKey, provider)
    const grandline = new Grandline(wallet)

    try {
        const constructedMintCalldata = await grandline.mint()

        if (!constructedMintCalldata) {
            yap.error(`[GRANDLINE] ${grandline.truncatedAddress} Failed constructing calldata`)
            parentPort.postMessage({
                type: "failed"
            })
        }

        const mint = await constructedMintCalldata.executeWithContractCall()

        if (!mint) {
            yap.error(`[GRANDLINE] ${grandline.truncatedAddress} Failed minting nft`)
            parentPort.postMessage({
                type: "failed"
            })
        }

        parentPort.postMessage({
            type: "done"
        })
    } catch (error) {
        yap.error(`[GRANDLINE] ${grandline.truncatedAddress} Error when working on nft task: ${error}`)
        parentPort.postMessage({
            type: "error",
            data: error
        })
    }
}

mintNft()