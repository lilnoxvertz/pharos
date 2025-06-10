const { ethers } = require("ethers")
const fs = require("fs")
const { skibidi } = require("../config/config")

class Wallet {
    static async generate(amount) {
        let i = 0
        skibidi.processing(`GENERATING ${amount} WALLET`)
        while (i < amount) {
            const wallet = ethers.Wallet.createRandom()
            fs.appendFileSync("wallet.txt", `${wallet.privateKey},${wallet.address}\n`)
            i++
        }

        skibidi.success(`DONE GENERATING WALLET`)
    }

    static load() {
        return fs.readFileSync("wallet.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => line.trim().split(",")[0])
    }

    static loadRecipientAddress() {
        return fs.readFileSync("recipient.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => line.trim().split(",")[0])
    }
}

module.exports = Wallet