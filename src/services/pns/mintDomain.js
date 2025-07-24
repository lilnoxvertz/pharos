const { Wallet } = require("ethers");
const { skibidi, pharos } = require("../../config/config");
const { Username } = require("./username");
const { workerData } = require("worker_threads");
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

    try {
        const username = Username.generateUsername()
        const isRegistered = Username.check(username, proxy)


        if (isRegistered) {
            skibidi.failed(`${truncatedAddress} Didnt return any username! repeating process..`)
            await new Promise(r => setTimeout(r, 10000))
        }

        skibidi.warn(`${truncatedAddress} is minting ${username} domain..`)
        const pns = new Domain(privateKey, username)

        const commit = await pns.commit()

        if (!commit.status) {
            skibidi.failed(`${truncatedAddress} Failed committing username!`)
            return
        }

        skibidi.processing(`${truncatedAddress} Waiting 60 second before registering username`)
        await delay()
        const register = pns.register(commit.secret)

        if (!register.status) {
            skibidi.failed(`${truncatedAddress} Failed registering username!`)
            return
        }

        skibidi.success(`${truncatedAddress} Successfully registered a username`)
        return
    } catch (error) {
        skibidi.failed(`${truncatedAddress} Error when trying to mint domain: ${error}`)
        return
    }
}

module.exports = { mint }