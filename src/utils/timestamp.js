const chalk = require("chalk")
const moment = require("moment-timezone")

const timestamp = () => {
    return chalk.rgb(170, 84, 255)(`[${moment().tz('Asia/Jakarta').format('HH:mm:ss')}]`)
}

module.exports = { timestamp }