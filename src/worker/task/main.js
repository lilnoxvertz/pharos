const { ethers } = require("ethers")
const { workerData, parentPort } = require("worker_threads")
const { pharos, skibidi, refferralCode } = require("../../config/config")
const { getRandomIndex } = require("../../utils/randomIndex")
const { getSplittedAddress } = require("../../utils/splitAddress")
const { HttpsProxyAgent } = require("https-proxy-agent")
const Auth = require("../../services/pharos/auth.services")
const PharosClient = require("../../services/pharos/pharos.services")
const Transaction = require("../../services/zenith/transaction/transaction.services")

async function main() {
    const { privateKey, proxy } = workerData
    const wallet = new ethers.Wallet(privateKey, pharos.rpc)

    const walletStats = {
        address: wallet.address,
        token: "",
        task: {
            checkin: {
                isCheckIn: false
            },
            faucet: {
                isClaimed: false
            },
            send: {
                success: 0,
                reverted: 0,
                isDone: false
            },
            swap: {
                success: 0,
                reverted: 0,
                isDone: false
            },
            liq: {
                success: 0,
                failed: 0,
                isDone: false
            }
        },
        totalTaskCompleted: 0,
        totalAddressTx: 0
    }

    const taskList = [
        "checkin",
        "faucet",
        "send",
        "swap",
        "liq"
    ]

    const getToken = async () => {
        let token = false
        let attempt = 0
        const maxAttempt = 3

        while (!token && attempt < maxAttempt) {
            const auth = await Auth.login(wallet.privateKey, refferralCode, proxy)

            if (!auth.authToken) {
                skibidi.failed(`${address} FAILED RETRIEVING AUTH TOKEN. RESTARTING PROCESS (${attempt}/${maxAttempt})`)
                await new Promise(r => setTimeout(r, 10000))
                continue
            }

            token = true
            walletStats.token = auth.authToken
            break
        }

        return
    }

    const address = getSplittedAddress(wallet.address)

    while (true) {
        skibidi.processing(`${address} IS CHOOSING A TASK..`)
        const randomTaskIndex = getRandomIndex(taskList.length)
        let currentTask = "liq"//taskList[randomTaskIndex]

        skibidi.warn(`${address} IS WORKING ON ${currentTask.toUpperCase()} TASK`)

        switch (currentTask) {
            case "checkin":
                try {
                    if (walletStats.token === "") {
                        skibidi.warn(`${address} NO AUTH TOKEN FOUND! TRYING TO GET THE TOKEN`)
                        await getToken()
                    }

                    const checkin = await PharosClient.checkIn(walletStats.token, wallet.address, proxy)

                    if (!checkin.status) {
                        skibidi.failed(checkin.msg)
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    skibidi.warn(`${address} SUCCESSFULLY COMPLETED ${currentTask.toUpperCase()} TASK!`)
                    walletStats.task.checkin.isCheckIn = true

                    skibidi.warn(`${address} REMOVING CHECK IN TASK IN ORDER TO CONTINUE INFINITE LOOPS`)
                    taskList.splice(currentTask, 1)
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
                    if (walletStats.token === "") {
                        skibidi.warn(`${address} NO AUTH TOKEN FOUND! TRYING TO GET THE TOKEN`)
                        await getToken()
                    }

                    const isClaimable = await PharosClient.getFaucetStatus(wallet.address, walletStats.token, proxy)

                    if (!isClaimable) {
                        skibidi.failed(`${address} ALREADY CLAIMED PHRS FAUCET TODAY`)
                        skibidi.warn(`${address} REMOVING FAUCET TASK IN ORDER TO CONTINUE INFINITE LOOPS`)
                        taskList.splice(currentTask, 1)
                        break
                    }

                    const faucet = await PharosClient.getFaucet(wallet.address, walletStats.token, proxy)

                    if (!faucet.status) {
                        skibidi.failed(faucet.msg)
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    skibidi.warn(`${address} SUCCESSFULLY COMPLETED ${currentTask.toUpperCase()} TASK!`)
                    walletStats.task.faucet.isClaimed = true

                    skibidi.warn(`${address} REMOVING FAUCET TASK IN ORDER TO CONTINUE INFINITE LOOPS`)
                    taskList.splice(currentTask, 1)
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
                    if (walletStats.token === "") {
                        skibidi.warn(`${address} NO AUTH TOKEN FOUND! TRYING TO GET THE TOKEN`)
                        await getToken()
                    }

                    const send = await Transaction.sendToken(wallet.privateKey, proxy, walletStats.token)

                    walletStats.task.send.success = send.success
                    walletStats.task.send.reverted = send.reverted

                    skibidi.warn(`${address} SUCCESSFULLY COMPLETED ${currentTask.toUpperCase()} TASK!`)
                    walletStats.task.send.success = send.success
                    walletStats.task.send.reverted = send.reverted
                    walletStats.task.send.isDone = true

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
                    const swap = await Transaction.swapToken(wallet.privateKey)

                    walletStats.task.swap.success = swap.success
                    walletStats.task.swap.reverted = swap.reverted

                    skibidi.warn(`${address} SUCCESSFULLY COMPLETED ${currentTask.toUpperCase()} TASK!`)
                    walletStats.task.swap.success = swap.success
                    walletStats.task.swap.reverted = swap.reverted
                    walletStats.task.swap.isDone = true

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
                    const liq = await Transaction.addLiquidity(wallet.privateKey)

                    walletStats.task.liq.success = liq.success
                    walletStats.task.liq.reverted = liq.reverted

                    skibidi.warn(`${address} SUCCESSFULLY COMPLETED ${completedTask.length} TASK! COMPLETING REMAINING ${taskList.length}  TASK`)
                    walletStats.task.liq.success = liq.success
                    walletStats.task.liq.reverted = liq.reverted
                    walletStats.task.liq.isDone = true

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

        const delay = Math.floor(Math.random() * (30000 + 20000 - 1)) + 20000
        const second = Math.floor(delay / 1000)
        skibidi.warn(`${address} WAITING ${second} SECOND BEFORE REPEATING PROCESS`)
        await new Promise(r => setTimeout(r, delay))
    }

    parentPort.postMessage({
        type: "done"
    })
}

main()
