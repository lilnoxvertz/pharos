const getSplittedAddress = (address) => {
    return `${address.slice(0, 5)}....${address.slice(37, 42)}`
}

module.exports = { getSplittedAddress }