const chalk = require("chalk")

const constructMessage = (args) => {
    return args.join(" ")
}

const timezone = () => {
    return chalk.rgb(255, 116, 202)(`[${moment().tz("Asia/jakarta").format("HH:mm:ss")}]`)
}

const yap = {
    success: (...args) => {
        const msg = constructMessage(args)
        console.log(chalk.greenBright(msg))
    },

    error: (...args) => {
        const msg = constructMessage(args)
        console.log(chalk.redBright(msg))
    },

    warn: (...args) => {
        const msg = constructMessage(args)
        console.log(chalk.rgb(255, 163, 106)(msg))
    },

    delay: (...args) => {
        const msg = constructMessage(args)
        console.log(chalk.yellowBright(msg))
    }
}

module.exports = { yap }