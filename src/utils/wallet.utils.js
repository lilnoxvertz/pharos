const { ethers } = require("ethers")
const fs = require("fs")

class Wallet {
    static async generate(amount) {
        let i = 0
        console.log(`generating ${amount} wallet`)
        while (i < amount) {
            const wallet = ethers.Wallet.createRandom()
            fs.appendFileSync("wallet.txt", `${wallet.privateKey},${wallet.address}\n`)
            i++
        }

        console.log("done!")
    }

    static async load() {
        return fs.readFileSync("wallet.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => line.split(",")[0])
    }

    static async loadRecipientAddress() {
        return fs.readFileSync("recipient.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => line.trim())
    }
}

module.exports = Wallet