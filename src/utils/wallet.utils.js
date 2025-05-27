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
            .map(line => line.trim().split(",")[0])
    }

    static async loadTreasuryWallet() {
        return fs.readFileSync("treasuryWallet.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => line.trim().split(",")[0])
    }

    static async loadRecipientAddress() {
        return fs.readFileSync("recipient.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => line.trim().split(",")[0])
    }

    static async loadUserAddress() {
        return fs.readFileSync("wallet.txt", "utf-8")
            .split("\n")
            .filter(line => line.trim())
            .map(line => line.split(",")[1])
    }
}

module.exports = Wallet