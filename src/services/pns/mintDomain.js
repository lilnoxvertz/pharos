const { workerData, parentPort } = require("worker_threads")
const { provider, rateLimitConfig } = require("../../config")
const { truncateAddress } = require("../../utils/truncateAddress")
const { Wallet, parseEther } = require("ethers")
const { yap } = require("../../utils/logger")
const { Username } = require("./username")
const { Domain } = require("./domain")
const { delay } = require("../../utils/delay")

async function mintDomain() {
    const { privateKey, proxy } = workerData

    const wallet = new Wallet(privateKey, provider)
    const truncatedAddress = truncateAddress(wallet.address)

    let minted = false
    let attempt = 0
    const maxAttempt = rateLimitConfig.domain

    while (!minted && attempt < maxAttempt) {
        attempt++
        try {
            yap.warn(`[PNS] ${truncatedAddress} is generating a username`)
            const username = Username.generateUsername()
            const isUsernameRegistered = await Username.check(wallet.address, username, proxy)

            if (isUsernameRegistered.status) {
                yap.error(`[PNS] ${truncatedAddress} Returned a registered username or didnt actually return anything. Repeating process`)
                await delay(10)
                continue
            }

            yap.warn(`[PNS] ${truncatedAddress} is trying to mint ${username} domain`)
            const balance = await provider.getBalance(wallet.address)
            const label = username.trim().split(".")[0]
            const price = await Username.getPrice(label, truncatedAddress)
            const priceInWei = parseEther(price?.usernamePrice)

            if (!price.status) {
                yap.error(`[PNS] ${truncatedAddress} failed fetching username price`)
                await delay(10)
                continue
            }

            const pns = new Domain(wallet, username, price.usernamePrice)

            if (balance < priceInWei) {
                yap.error(`[PNS] ${truncatedAddress} has insufficient balance`)
                parentPort.postMessage({
                    type: "error",
                    data: error
                })
            }

            const constructedCommitCalldata = pns.commit()

            if (!constructedCommitCalldata) {
                yap.error(`[PNS] ${truncatedAddress} Failed construction hash`)
                parentPort.postMessage({
                    type: "error",
                    data: error
                })
            }

            await constructedCommitCalldata.executeWithContractCall()

            yap.delay(`[PNS] ${truncatedAddress} waiting 70 second before registering username`)
            await delay(70)

            yap.warn(`[PNS] ${truncatedAddress} is registering username`)
            const constructedRegisterCalldata = pns.register()

            if (!constructedRegisterCalldata) {
                yap.error(`[PNS] Failed registering username`)
                parentPort.postMessage({
                    type: "error",
                    data: error
                })
            }

            await constructedRegisterCalldata.executeWithContractCall()

            minted = true
            parentPort.postMessage({
                type: "done"
            })
        } catch (error) {
            yap.error(`[PNS] ${truncatedAddress} Error when trying to mint domain: ${error}`)
            parentPort.postMessage({
                type: "error",
                data: error
            })
        }
    }
}

module.exports = { mintDomain }