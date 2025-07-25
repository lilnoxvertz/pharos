const { ethers, namehash } = require("ethers")
const { skibidi } = require("../../config/config")
const { HttpsProxyAgent } = require("https-proxy-agent")

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
                    skibidi.failed(`[PNS] ${address} Failed checking username. retrying in 10 sec`)
                    await new Promise(r => setTimeout(r, 10000))
                    continue
                }

                const data = result.data

                if (data.domain) {
                    skibidi.failed(`[PNS] ${address} ${username} is already registered!`)
                    return {
                        registered: true
                    }
                }

                skibidi.success(`[PNS] ${address} ${username} isnt registered yet!`)
                checked = true
                return {
                    status: false,
                }
            } catch (error) {
                skibidi.failed(`[PNS]${address} Failed checking ${username} username: ${error}`)
                return {
                    status: true
                }
            }
        }

        if (!checked && attempt === maxAttempt) {
            skibidi.failed(`[PNS] ${address} Reached max attempt. failed checking username`)
            return {
                status: false
            }
        }

    }
}

module.exports = { Username }