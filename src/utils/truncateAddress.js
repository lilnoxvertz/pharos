const truncateAddress = (walletAddress) => {
    const start = walletAddress.slice(0, 5)
    const end = walletAddress.slice(37, 42)
    return `${start}....${end}`
}

module.exports = { truncateAddress }