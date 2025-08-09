const { workerData, parentPort } = require("worker_threads")
const { tasks, provider, refferralCode, transactionLimitConfig, maxLevel, minLevel } = require("../../config")
const { Wallet } = require("ethers")
const { Pharos } = require("../../services/pharos/pharos")
const { Zenith } = require("../../services/zenith/zenith")
const { Faroswap } = require("../../services/faroswap/faroswap")
const { Aquaflux } = require("../../services/aquaflux/aquaflux")
const { yap } = require("../../utils/logger")
const { Primus } = require("../../services/primus/primus")
const { truncateAddress } = require("../../utils/truncateAddress")
const { delay } = require("../../utils/delay")

const { privateKey, proxy, index } = workerData
const wallet = new Wallet(privateKey, provider)

let token = null

if (!wallet) {
    yap.error(`index: ${index} has no wallet instance`)
}

const truncatedAddress = truncateAddress(wallet.address)

const pharos = new Pharos(wallet)
const zenith = new Zenith(wallet)
const faroswap = new Faroswap(wallet, proxy)
const primus = new Primus(wallet)
const aquaflux = new Aquaflux(wallet, proxy)


const getToken = async () => {
    const login = await Pharos.login(privateKey, refferralCode, proxy)

    if (!login.status) {
        return false
    }

    token = login.authToken
    return true
}

let transactionCount = 0

const taskHandlers = {
    checkin: async () => {
        try {
            const checkin = await Pharos.checkin(wallet.address, token, proxy)

            if (!checkin.status) {
                parentPort.postMessage({
                    type: "failed"
                })
            }

            parentPort.postMessage({
                type: "done"
            })
        } catch (error) {
            yap.error(`[MAIN] ${truncatedAddress} Error when working on check in task: ${error}`)
            parentPort.postMessage({
                type: "error",
                data: error
            })
        }
    },

    faucet: async () => {
        try {
            const faucet = await Pharos.getFaucet(wallet.address, token, proxy)

            if (!faucet.status) {
                parentPort.postMessage({
                    type: "failed"
                })
            }

            parentPort.postMessage({
                type: "done"
            })
        } catch (error) {
            yap.error(`[MAIN] ${truncatedAddress} Error when working on faucet task: ${error}`)
            parentPort.postMessage({
                type: "error",
                data: error
            })
        }
    },

    send: {
        pharos: async () => {
            while (transactionCount < transactionLimitConfig) {
                transactionCount++
                try {
                    const send = await pharos.sendPHRS()

                    if (!send.status) {
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }


                    yap.delay(`[PHAROS] ${this.truncatedAddress} Verifying task`)
                    const taskId = 103
                    const verify = await Pharos.verifyTask(wallet.address, token, proxy, send.hash, taskId)

                    if (!verify) {
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    parentPort.postMessage({
                        type: "done"
                    })
                } catch (error) {
                    yap.error(`[MAIN] ${truncatedAddress} Error when working on send task: ${error}`)
                    parentPort.postMessage({
                        type: "error",
                        data: error
                    })
                }

                await delay(5)
            }
        },

        primus: async () => {
            while (transactionCount < transactionLimitConfig) {
                transactionCount++
                try {
                    const constructedSendCalldata = await primus.tip()

                    if (!constructedSendCalldata) {
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    const executedTransaction = await primus.executeWithContractCall()

                    if (!executedTransaction) {
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    parentPort.postMessage({
                        type: "done"
                    })
                } catch (error) {
                    yap.error(`[MAIN] ${truncatedAddress} Error when working on send task: ${error}`)
                    parentPort.postMessage({
                        type: "error",
                        data: error
                    })
                }

                await delay(5)
            }
        }
    },

    swap: {
        zenith: async () => {
            while (transactionCount < transactionLimitConfig) {
                transactionCount++
                try {
                    const constructedSwapCalldata = await zenith.swap()

                    if (!constructedSwapCalldata) {
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    const executedTransaction = await zenith.executeWithWallet()

                    if (!executedTransaction) {
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    parentPort.postMessage({
                        type: "done"
                    })
                } catch (error) {
                    yap.error(`[MAIN] ${truncatedAddress} Error when working on swap task: ${error}`)
                    parentPort.postMessage({
                        type: "error",
                        data: error
                    })
                }

                await delay(5)
            }
        },

        faroswap: async () => {
            while (transactionCount < transactionLimitConfig) {
                transactionCount++
                try {
                    const constructedSwapCalldata = await faroswap.swap()

                    if (!constructedSwapCalldata) {
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    const executedTransaction = await faroswap.executeWithWallet()

                    if (!executedTransaction) {
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    parentPort.postMessage({
                        type: "done"
                    })
                } catch (error) {
                    yap.error(`[MAIN] ${truncatedAddress} Error when working on swap task: ${error}`)
                    parentPort.postMessage({
                        type: "error",
                        data: error
                    })
                }

                await delay(5)
            }
        }
    },

    liq: {
        zenith: async () => {
            while (transactionCount < transactionLimitConfig) {
                transactionCount++
                try {
                    const constructedLiqCalldata = await zenith.addLiquidity()

                    if (!constructedLiqCalldata) {
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    const executedTransaction = await zenith.executeWithWallet()

                    if (!executedTransaction) {
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    parentPort.postMessage({
                        type: "done"
                    })
                } catch (error) {
                    yap.error(`[MAIN] ${truncatedAddress} Error when working on liq task: ${error}`)
                    parentPort.postMessage({
                        type: "error",
                        data: error
                    })
                }

                await delay(5)
            }
        },

        faroswap: async () => {
            while (transactionCount < transactionLimitConfig) {
                transactionCount++
                try {
                    const constructedLiqCalldata = await faroswap.addLiquidity()

                    if (!constructedLiqCalldata) {
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    const executedTransaction = await faroswap.executeWithWallet()

                    if (!executedTransaction) {
                        parentPort.postMessage({
                            type: "failed"
                        })
                    }

                    parentPort.postMessage({
                        type: "done"
                    })
                } catch (error) {
                    yap.error(`[MAIN] ${truncatedAddress} Error when working on liq task: ${error}`)
                    parentPort.postMessage({
                        type: "error",
                        data: error
                    })
                }

                await delay(5)
            }
        }
    },
    rwa: async () => {
        while (transactionCount < transactionLimitConfig) {
            transactionCount++
            try {
                const constructedSplitCalldata = await aquaflux.split()

                if (!constructedSplitCalldata) {
                    parentPort.postMessage({
                        type: "failed"
                    })
                }

                const executedSplitTransaction = await aquaflux.executeWithContractCall()

                if (!executedSplitTransaction) {
                    parentPort.postMessage({
                        type: "failed"
                    })
                }

                const constructedCraftCalldata = await aquaflux.craft()

                if (!constructedCraftCalldata) {
                    parentPort.postMessage({
                        type: "failed"
                    })
                }

                const executedCraftTransaction = await aquaflux.executeWithWallet()

                if (!executedCraftTransaction) {
                    parentPort.postMessage({
                        type: "failed"
                    })
                }

                const constructedNftCalldata = await aquaflux.claimReward()

                if (!constructedNftCalldata) {
                    parentPort.postMessage({
                        type: "failed"
                    })
                }

                const executedNftTransaction = await aquaflux.executeWithWallet()

                if (!executedNftTransaction) {
                    parentPort.postMessage({
                        type: "failed"
                    })
                }

                parentPort.postMessage({
                    type: "done"
                })
            } catch (error) {
                yap.error(`[MAIN] ${truncatedAddress} Error when working on rwa task: ${error}`)
                parentPort.postMessage({
                    type: "error",
                    data: error
                })
            }

            await delay(5)
        }
    }
}

const levelChecker = (point) => {
    if (point <= 1000) {
        return level = 1
    } else if (point >= 1001 && point <= 3500) {
        return level = 2
    } else if (point >= 3501 && point <= 6000) {
        return level = 3
    } else if (point >= 6001 && point <= 10000) {
        return level = 4
    } else if (point >= 10001) {
        return level = 5
    }
}

async function main() {
    const randomSecond = Math.floor(Math.random() * 30) + 10
    yap.delay(`[MAIN] ${truncatedAddress} waiting ${randomSecond} second before starting any task`)
    await delay(randomSecond)

    if (!token) {
        const tokenStatus = await getToken()

        if (!tokenStatus) {
            parentPort.postMessage({
                type: "failed"
            })
        }
    }

    const availableTask = []
    let point = await Pharos.getPoint(wallet.address, token, proxy)
    const level = levelChecker(Number(point))

    let isPrioritized

    if (level <= maxLevel && level >= minLevel) {
        yap.warn(`[MAIN] ${truncatedAddress} will be included since it was lower than the prioritized level [${level}]`)
        isPrioritized = true
    } else {
        yap.warn(`[MAIN] ${truncatedAddress} will be excluded since it was higher than the prioritized level [${level}]`)
        isPrioritized = false
    }

    const filterTask = (task, currentPath = "") => {
        for (const key in task) {

            if (!task.hasOwnProperty(key)) continue

            const newPath = currentPath ? `${currentPath}.${key}` : key
            const value = task[key]

            if (typeof value === "object" && value !== null) {
                filterTask(value, newPath)
            } else if (value === true) {
                availableTask.push(newPath)
            }
        }
    }

    filterTask(tasks)

    while (isPrioritized && availableTask.length > 0) {

        transactionCount = 0
        try {
            const task = availableTask.shift()
            const taskPart = task.split(".")
            const currentTask = taskPart[0]
            const currentWeb = taskPart[1] ?? null

            switch (currentTask) {
                case "checkin": {
                    await taskHandlers.checkin()
                    break
                }

                case "faucet": {
                    await taskHandlers.faucet()
                    break
                }

                case "send": {
                    if (currentWeb === "pharos") {
                        await taskHandlers.send.pharos()
                    } else if (currentWeb === "primus") {
                        await taskHandlers.send.primus()
                    }

                    break
                }

                case "swap": {
                    if (currentWeb === "zenith") {
                        await taskHandlers.swap.zenith()
                    } else if (currentWeb === "faroswap") {
                        await taskHandlers.swap.faroswap()
                    }

                    break
                }

                case "liq": {
                    if (currentWeb === "zenith") {
                        await taskHandlers.liq.zenith()
                    } else if (currentWeb === "faroswap") {
                        await taskHandlers.liq.faroswap()
                    }

                    break
                }

                case "rwa": {
                    await taskHandlers.rwa()
                }
            }
        } catch (error) {
            yap.error(`[MAIN] Error when working on ${currentTask}: ${error}`)
            parentPort.postMessage({
                type: "error",
                data: error
            })
        }

        if (availableTask.length === 0) {
            break
        } else {
            yap.delay(`[MAIN] ${truncatedAddress} waiting before starting next task`)
            await delay(60)
        }
    }

    parentPort.postMessage({
        type: "complete",
        data: truncatedAddress
    })
}

main()
