const Wallet = require("../utils/wallet.utils")

async function generate(amount) {
    await Wallet.generate(amount)
}

generate(7000)