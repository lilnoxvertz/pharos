const fs = require("fs")
const { yap } = require("./logger")

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
                    yap.error(`${parts} IS A INVALID PROXY FORMAT!`)
                    yap.error("IT SHOULD BE EITHER IP:PORT:USERNAME:PASSWORD OR IP:PORT")
                }
            })
    }

    static get(array, index) {
        const proxy = array.length === 0 ? "" : array[index % array.length]
        return proxy
    }
}

module.exports = { Proxy }