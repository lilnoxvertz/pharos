const fs = require("fs")
const { yap } = require("./logger")
const { ethers } = require("ethers")

class Wallet {
    static load() {
        return fs.readFileSync("wallet.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => line.trim().split(",")[0])
    }

    static async generate(amount) {
        yap.warn(`Generating ${amount} wallet`)

        for (let i = 0; i < amount; i++) {
            const wallet = ethers.Wallet.createRandom()
            fs.appendFileSync("wallet.txt", `${wallet.privateKey},${wallet.address}\n`, "utf-8")
        }

        yap.success(`Successfully creating ${amount} wallet`)
    }

    static async loadRecipientAddress() {
        return fs.readFileSync("recipient.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => line.trim().split(",")[0])
    }

    static loadTwitterUsername() {
        return fs.readFileSync("twitterUsername.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => line.trim().split(",")[0])
    }
}

module.exports = { Wallet }