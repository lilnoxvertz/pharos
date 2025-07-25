const { Wallet, parseEther } = require("ethers");
const { skibidi, pharos } = require("../../config/config");
const { Username } = require("./username");
const { workerData, parentPort } = require("worker_threads");
const { getSplittedAddress } = require("../../utils/splitAddress");
const { Domain } = require("./domain");

const delay = async () => {
    const ms = 60000
    return new Promise(r => setTimeout(r, ms))
}

async function mint() {
    const { privateKey, proxy } = workerData
    const wallet = new Wallet(privateKey, pharos.rpc)
    const truncatedAddress = getSplittedAddress(wallet.address)

    let minted = false
    let attempt = 0
    const maxAttempt = 3

    while (!minted && attempt < maxAttempt) {
        attempt++
        try {
            skibidi.processing(`[PNS] ${truncatedAddress} is generating a username`)
            const username = Username.generateUsername()
            const isRegistered = await Username.check(truncatedAddress, username, proxy)

            if (isRegistered.status) {
                skibidi.failed(`[PNS] ${truncatedAddress} Returned a registered username or didnt actually return anything! Repeating process..`)
                await new Promise(r => setTimeout(r, 10000))
                continue
            }

            skibidi.warn(`[PNS] ${truncatedAddress} is minting ${username} domain..`)
            const pns = new Domain(privateKey, username)

            const balance = await pharos.rpc.getBalance(wallet.address)
            const price = await pns.getPrice(proxy)
            const priceInWei = parseEther(price.usernamePrice)

            if (!price.status) {
                skibidi.failed(`[PNS] ${truncatedAddress} Returned a registered username or didnt actually return anything! Repeating process..`)
                await new Promise(r => setTimeout(r, 10000))
                continue
            }

            if (balance < priceInWei) {
                throw new Error(`[PNS] ${truncatedAddress} has insufficient balance to mint domain`)
            }

            const commit = await pns.commit()

            if (!commit.status) {
                skibidi.failed(`[PNS] ${truncatedAddress} Returned a registered username or didnt actually return anything! Repeating process..`)
                await new Promise(r => setTimeout(r, 10000))
                continue
            }

            skibidi.processing(`[PNS] ${truncatedAddress} Waiting 70 second before registering username`)
            await delay()
            const register = await pns.register(commit.secret, commit.bytes, price.usernamePrice)

            if (!register.status) {
                skibidi.failed(`[PNS] ${truncatedAddress} Returned a registered username or didnt actually return anything! Repeating process..`)
                await new Promise(r => setTimeout(r, 10000))
                continue
            }

            minted = true
            parentPort.postMessage({
                type: "done"
            })
        } catch (error) {
            skibidi.failed(`[PNS] ${truncatedAddress} Error when trying to mint domain: ${error}`)
            parentPort.postMessage({
                type: "error",
                data: error
            })
        }
    }

    if (!minted && attempt === maxAttempt) {
        skibidi.failed(`[PNS] ${truncatedAddress} Reached max attempt. failed minting username`)
        parentPort.postMessage({
            type: "failed"
        })
    }
}

module.exports = { mint }