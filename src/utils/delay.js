const delay = (second) => {
    const ms = second * 1000
    return new Promise(r => setTimeout(r, ms))
}

module.exports = { delay }