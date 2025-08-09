const { Wallet } = require("../utils/wallet");

async function generate(amount) {
    console.clear()
    await Wallet.generate(amount)
}

const amountTogenerate = 10 // change this amount
generate(amountTogenerate)