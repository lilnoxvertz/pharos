const { ethers } = require("ethers")
const { workerData, parentPort } = require("worker_threads")
const { pharos, skibidi, refferralCode } = require("../../config/config")
const { getRandomIndex } = require("../../utils/randomIndex")
const { getSplittedAddress } = require("../../utils/splitAddress")
const Auth = require("../../services/pharos/auth.services")
const PharosClient = require("../../services/pharos/pharos.services")
const Transaction = require("../../services/zenith/transaction/transaction.services")
const FaroDex = require("../../services/faroswap/transaction/transaction")

async function main() {
    const { privateKey, proxy } = workerData
    const wallet = new ethers.Wallet(privateKey, pharos.rpc)

    const taskList = [
        //"checkin",
        //"faucet",
        //"send",
        "swap",
        //"liq"
    ]

    const dex = [
        "zenith",
        "faroswap"
    ]

    const address = getSplittedAddress(wallet.address)
    const getToken = async () => {
        let tokenFound = false
        let attempt = 0
        const maxAttempt = 3

        while (!tokenFound && attempt < maxAttempt) {
            const auth = await Auth.login(wallet.privateKey, refferralCode, proxy)

            if (!auth.authToken) {
                skibidi.failed(`${address} FAILED RETRIEVING AUTH TOKEN. RESTARTING PROCESS (${attempt}/${maxAttempt})`)
                await new Promise(r => setTimeout(r, 10000))
                continue
            }

            tokenFound = true
            return auth.authToken
        }

        skibidi.failed(`${address} Failed retrieving auth token`)
    }

    const token = await getToken()

    while (true) {
        skibidi.processing(`${address} IS CHOOSING A TASK..`)
        let currentTask = taskList.shift()

        skibidi.warn(`${address} IS WORKING ON ${currentTask.toUpperCase()} TASK`)

        switch (currentTask) {
            case "checkin":
                try {
                    const checkin = await PharosClient.checkIn(token, wallet.address, proxy)

                    if (!checkin.status) {
                        skibidi.failed(checkin.msg)
                        parentPort.postMessage({
                            type: "failed"
                        })
                        break
                    }

                    skibidi.warn(`${address} SUCCESSFULLY COMPLETED ${currentTask.toUpperCase()} TASK!`)

                    parentPort.postMessage({
                        type: "success"
                    })
                } catch (error) {
                    skibidi.failed(`${address} ERROR: ${error}`)
                    parentPort.postMessage({
                        type: "error"
                    })
                }

                break

            case "faucet":
                try {
                    const isClaimable = await PharosClient.getFaucetStatus(wallet.address, token, proxy)

                    if (!isClaimable) {
                        skibidi.failed(`${address} ALREADY CLAIMED PHRS FAUCET TODAY`)
                        break
                    }

                    const faucet = await PharosClient.getFaucet(wallet.address, token, proxy)

                    if (!faucet.status) {
                        skibidi.failed(faucet.msg)
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    skibidi.warn(`${address} SUCCESSFULLY COMPLETED ${currentTask.toUpperCase()} TASK!`)
                    parentPort.postMessage({
                        type: "success"
                    })
                } catch (error) {
                    skibidi.failed(`${address} ERROR: ${error}`)
                    parentPort.postMessage({
                        type: "error"
                    })
                }

                break

            case "send":
                try {
                    if (token === "") {
                        skibidi.warn(`${address} NO AUTH TOKEN FOUND! TRYING TO GET THE TOKEN`)
                        await getToken()
                    }

                    await Transaction.sendToken(wallet.privateKey, proxy, token)

                    skibidi.warn(`${address} SUCCESSFULLY COMPLETED ${currentTask.toUpperCase()} TASK!`)

                    parentPort.postMessage({
                        type: "success"
                    })
                } catch (error) {
                    skibidi.failed(`${address} ERROR: ${error}`)
                    parentPort.postMessage({
                        type: "error"
                    })
                }

                break

            case "swap":
                try {
                    const randomDex = "zenith"//dex[Math.floor(Math.random() * dex.length)]

                    if (randomDex === "zenith") {
                        await Transaction.swapToken(wallet.privateKey)
                    } else if (randomDex === "faroswap") {
                        await FaroDex.swapToken(wallet.privateKey, proxy)
                    }

                    skibidi.warn(`${address} SUCCESSFULLY COMPLETED ${currentTask.toUpperCase()} TASK ON ${randomDex}!`)

                    parentPort.postMessage({
                        type: "success"
                    })
                } catch (error) {
                    skibidi.failed(`${address} ERROR: ${error}`)
                    parentPort.postMessage({
                        type: "error"
                    })
                }

                break

            case "liq":
                try {
                    const randomDex = dex[Math.floor(Math.random() * dex.length)]

                    if (randomDex === "zenith") {
                        await Transaction.addLiquidity(wallet.privateKey)
                    } else if (randomDex === "faroswap") {
                        await FaroDex.addLiquidity(wallet.privateKey)
                    }

                    skibidi.warn(`${address} SUCCESSFULLY COMPLETED ${currentTask.toUpperCase()} TASK ON ${randomDex}!`)

                    parentPort.postMessage({
                        type: "success"
                    })
                } catch (error) {
                    skibidi.failed(`${address} ERROR: ${error}`)
                    parentPort.postMessage({
                        type: "error"
                    })
                }

                break
        }

        if (taskList.length === 0) {
            break
        } else {
            const delay = Math.floor(Math.random() * (10000 + 5000 - 1)) + 7000
            const second = Math.floor(delay / 1000)
            skibidi.warn(`${address} WAITING ${second} SECOND BEFORE REPEATING PROCESS`)
            await new Promise(r => setTimeout(r, delay))
        }
    }

    parentPort.postMessage({
        type: "done"
    })
}

main()
