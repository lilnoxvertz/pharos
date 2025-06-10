const fs = require("fs")
const { skibidi } = require("../config/config")

class Proxy {
    static load() {
        return fs.readFileSync("proxy.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => {
                const parts = line.trim().split(":")

                if (parts.length === 4) {
                    const [ip, port, username, password] = parts
                    return `https://${username}:${password}@${ip}:${port}`
                } else if (parts.length === 2) {
                    const [ip, port] = parts
                    return `https://${ip}:${port}`
                } else {
                    skibidi.failed(`${parts} IS A INVALID PROXY FORMAT!`)
                    skibidi.failed("IT SHOULD BE EITHER IP:PORT:USERNAME:PASSWORD OR IP:PORT")
                }
            })
    }

    static async get(array, index) {
        const proxy = array.length === 0 ? "" : array[index % array.length]
        return proxy
    }
}

module.exports = Proxy