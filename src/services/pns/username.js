const { namehash, ethers } = require("ethers")
const { yap } = require("../../utils/logger")
const { HttpsProxyAgent } = require("https-proxy-agent")
const { rateLimitConfig, provider } = require("../../config")
const { AbiCoder } = require("ethers")
const { delay } = require("../../utils/delay")
const { truncateAddress } = require("../../utils/truncateAddress")

class Username {
    static generateUsername() {
        const character = "abcdefghijklmnopqrstuvwxyz0123456789"
        let username = ""

        for (let i = 0; i < 10; i++) {
            const randomIndex = character[Math.floor(Math.random() * character.length)]
            username += randomIndex
        }

        return `${username}.phrs`
    }

    static hash(username) {
        const hashedUsername = namehash(username)
        return hashedUsername
    }

    static async check(address, username, proxy) {
        const url = "https://graphql.pharosname.com/"
        const hashedUsername = this.hash(username)
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined
        const truncatedAddress = truncateAddress(address)

        const header = {
            'accept': '*/*',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.9',
            'content-type': 'application/json',
            'origin': 'https://test.pharosname.com',
            'priority': 'u=1, i',
            'referer': 'https://test.pharosname.com/',
            'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        }

        const payload = JSON.stringify({
            operationName: "getSubgraphRecords",
            query: "query getSubgraphRecords($id: String!) {\n  domain(id: $id) {\n    name\n    isMigrated\n    createdAt\n    resolver {\n      texts\n      coinTypes\n    }\n    id\n  }\n}",
            variables: {
                id: hashedUsername
            }
        })

        let checked = false
        let attempt = 0
        const maxAttempt = 3

        while (!checked && attempt < maxAttempt) {
            attempt++
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: header,
                    body: payload,
                    agent
                })

                const result = await response.json()

                if (!response.ok) {
                    yap.error(`[PNS] ${truncatedAddress} Failed checking username. retrying in 10 sec`)
                    await new Promise(r => setTimeout(r, 10000))
                    continue
                }

                const data = result.data

                if (data.domain) {
                    yap.error(`[PNS] ${truncatedAddress} ${username} is already registered!`)
                    return {
                        registered: true
                    }
                }

                yap.success(`[PNS] ${truncatedAddress} ${username} isnt registered yet!`)
                checked = true
                return {
                    status: false,
                }
            } catch (error) {
                yap.error(`[PNS]${truncatedAddress} Failed checking ${username} username: ${error}`)
                return {
                    status: true
                }
            }
        }

        if (!checked && attempt === maxAttempt) {
            yap.error(`[PNS] ${truncatedAddress} Reached max attempt. failed checking username`)
            return {
                status: false
            }
        }
    }

    static async getPrice(label, address) {
        const oneYear = 31536000

        let priceFound = false
        let attempt = 0
        const maxAttempt = rateLimitConfig.api
        const truncatedAddress = truncateAddress(address)

        while (!priceFound && attempt < maxAttempt) {
            attempt++
            try {
                yap.warn(`[PNS] ${truncatedAddress} is fetching username price`)

                const createWrapperCalldata = () => {
                    const internalSelector = "0x83e7f6ff"
                    const internalEncodedParams = AbiCoder.defaultAbiCoder().encode(
                        ['string', 'uint256'],
                        [label, oneYear]
                    );
                    const internalCalldata = internalSelector + internalEncodedParams.slice(2)

                    const instructionObject = [
                        "0x51bE1EF20a1fD5179419738FC71D95A8b6f8A175",
                        true,
                        internalCalldata
                    ];

                    const mainSelector = "0x82ad56cb"
                    const mainEncodedParams = AbiCoder.defaultAbiCoder().encode(
                        ['(address,bool,bytes)[]'],
                        [[instructionObject]]
                    );

                    const finalCalldata = mainSelector + mainEncodedParams.slice(2)

                    return finalCalldata
                }

                const calldata = createWrapperCalldata()

                const _price = await provider.call({
                    to: "0x663bf72dc7477772d8bafb01118d885359b17d07",
                    data: calldata
                })

                if (!_price || _price === "0x") {
                    yap.error(`[PNS] ${truncatedAddress} Failed fetching username price. retrying in 10 sec`)
                    await delay(10)
                    continue
                }

                const getReadableAmount = (hex) => {
                    const start = 2 + (6 * 64)
                    const priceHex = "0x" + hex.substring(start, start + 64)
                    const priceInWei = ethers.toBigInt(priceHex)
                    const readableAmount = ethers.formatEther(priceInWei)

                    return readableAmount
                }

                priceFound = true
                const _usernamePrice = getReadableAmount(_price)

                return {
                    status: true,
                    usernamePrice: _usernamePrice
                }
            } catch (error) {
                yap.error(`[PNS] ${truncatedAddress} Error when fething price: ${error}`)
                continue
            }
        }

        if (!priceFound && attempt === maxAttempt) {
            return {
                status: false
            }
        }
    }
}

module.exports = { Username }