const { JsonRpcProvider } = require("ethers")

// set the task value to false if you didnt want to include it
const tasks = {
    faucet: false,
    checkin: false,
    send: {
        pharos: false,
        primus: false
    },
    swap: {
        zenith: false,
        faroswap: false,
    },
    liq: {
        zenith: false,
        faroswap: false
    },
    rwa: {
        aquaflux: true
    }
}

const refferralCode = "PIeu5IbkQuQfH7zd"

let maxWorker = 10

const rateLimitConfig = {
    api: 3,
    domain: 3
}

const transactionLimitConfig = 10

const provider = new JsonRpcProvider("https://testnet.dplabs-internal.com")

const dexList = {
    contract: {
        pharos: {
            pnsContract: "0x51be1ef20a1fd5179419738fc71d95a8b6f8a175",
        },
        zenith: {
            swapContract: "0x1a4de519154ae51200b0ad7c90f7fac75547888a",
            liqContract: "0xF8a1D4FF0f9b9Af7CE58E1fc1833688F3BFd6115"
        },
        faroswap: {
            swapContract: "0x3541423f25a1ca5c98fdbcf478405d3f0aad1164",
            liqContract: "0xf05af5e9dc3b1dd3ad0c087bd80d7391283775e0"
        },
        grandLine: {
            pharosNftContract: "0x1da9f40036bee3fda37ddd9bff624e1125d8991d"
        },
        aquaflux: {
            mintContract: "0xCc8cF44E196CaB28DBA2d514dc7353af0eFb370E"
        },
        primus: {
            tipContract: "0xd17512b7ec12880bd94eca9d774089ff89805f02"
        }
    }
}

const tokenList = {
    oldUsdc: "0xad902cf99c2de2f1ba5ec4d642fd7e49cae9ee37",
    oldUsdt: "0xed59de2d7ad9c043442e381231ee3646fc3c2939",
    zWPHRS: "0x76aaada469d23216be5f7c596fa25f282ff9b364",
    zPHRS: "0x76aaada469d23216be5f7c596fa25f282ff9b364",
    wETH: "0xb056a6b9f61b2c0ebf4906aac341bd118a1763fe",
    newUsdt: "0xD4071393f8716661958F766DF660033b3d35fD29",
    newUsdc: "0x72df0bcd7276f2dFbAc900D1CE63c272C4BCcCED",
    fPHRS: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    fWPHRS: "0x3019b247381c850ab53dc0ee53bce7a07ea9155f",
}

module.exports = {
    refferralCode,
    rateLimitConfig,
    transactionLimitConfig,
    tasks,
    provider,
    dexList,
    tokenList,
    maxWorker
}