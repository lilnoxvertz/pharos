const { ethers } = require("ethers")

const refferralCode = "PIeu5IbkQuQfH7zd"

const rateLimitConfig = {
    maxAttempt: 3
}

const maxCycleConfig = 100 // ganti cycle disini

const pharos = {
    rpc: new ethers.JsonRpcProvider("https://testnet.dplabs-internal.com"),
    contractAddress: "0x76aaada469d23216be5f7c596fa25f282ff9b364"
}

const zenith = {
    liqContract: "0xF8a1D4FF0f9b9Af7CE58E1fc1833688F3BFd6115"
}

const routerAddress = "0x1a4de519154ae51200b0ad7c90f7fac75547888a"

const tokenArr = {
    usdc: "0xad902cf99c2de2f1ba5ec4d642fd7e49cae9ee37",
    usdt: "0xed59de2d7ad9c043442e381231ee3646fc3c2939",
    wPHRS: "0x76aaada469d23216be5f7c596fa25f282ff9b364",
    PHRS: "0x76aaada469d23216be5f7c596fa25f282ff9b364"
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

module.exports = { refferralCode, rateLimitConfig, pharos, authHeader, routerAddress, tokenArr, zenith, maxCycleConfig }
