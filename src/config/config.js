const { JsonRpcProvider } = require("ethers")
const { timestamp } = require("../utils/timestamp")
const chalk = require("chalk")

const refferralCode = "PIeu5IbkQuQfH7zd"

const skibidi = {
    success: (msg) => {
        console.log(timestamp(), chalk.greenBright(msg))
    },
    failed: (msg) => {
        console.log(timestamp(), chalk.redBright(msg))
    },
    processing: (msg) => {
        console.log(timestamp(), chalk.yellowBright(msg))
    },
    warn: (msg) => {
        console.log(timestamp(), chalk.rgb(255, 165, 0)(msg))
    }
}

const rateLimitConfig = {
    maxAttempt: 3
}

const maxSuccessTransaction = 10// change this line

const pharos = {
    rpc: new JsonRpcProvider("https://api.zan.top/node/v1/pharos/testnet/b59d50439860470d84f87ee95a4c7484"),
    contractAddress: "0x76aaada469d23216be5f7c596fa25f282ff9b364",
    pnsContract: "0x51be1ef20a1fd5179419738fc71d95a8b6f8a175"
}

const zenith = {
    liqContract: "0xF8a1D4FF0f9b9Af7CE58E1fc1833688F3BFd6115"
}

const aquaflux = {
    contract: "0xCc8cF44E196CaB28DBA2d514dc7353af0eFb370E"
}

const faroswap = {
    contract: "0x3541423f25a1ca5c98fdbcf478405d3f0aad1164",
    liqContract: "0xf05af5e9dc3b1dd3ad0c087bd80d7391283775e0",
    dvmContract: "0x95a11BD0e5441786Bc290Ed4c5FC3f1147e5B784"
}

const routerAddress = "0x1a4de519154ae51200b0ad7c90f7fac75547888a"

const tokenArr = {
    usdc: "0xad902cf99c2de2f1ba5ec4d642fd7e49cae9ee37",
    usdt: "0xed59de2d7ad9c043442e381231ee3646fc3c2939",
    wPHRS: "0x76aaada469d23216be5f7c596fa25f282ff9b364",
    PHRS: "0x76aaada469d23216be5f7c596fa25f282ff9b364",
    wETH: "0xb056a6b9f61b2c0ebf4906aac341bd118a1763fe",
    nUsdt: "0xD4071393f8716661958F766DF660033b3d35fD29",
    nUsdc: "0x72df0bcd7276f2dFbAc900D1CE63c272C4BCcCED",
    nWPHRS: "0x3019b247381c850ab53dc0ee53bce7a07ea9155f"
}

const authHeader = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Dnt': '1',
    'Origin': 'https://testnet.pharosnetwork.xyz',
    'Pragma': 'no-cache',
    'Priority': 'u=1, i',
    'Referer': 'https://testnet.pharosnetwork.xyz/',
    'Sec-Ch-Ua': '"Chromium";v="136", "Microsoft Edge";v="136", "Not:A-Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0'
}

module.exports = { refferralCode, rateLimitConfig, pharos, faroswap, authHeader, routerAddress, tokenArr, zenith, maxSuccessTransaction, skibidi, aquaflux }
