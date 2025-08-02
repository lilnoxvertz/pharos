const { Wallet } = require("ethers");
const { pharos, aquaflux } = require("../../../config/config");
const { Contract } = require("ethers");

const abi = []

class Aquaflux {
    constructor(privateKey) {
        this.wallet = new Wallet(privateKey, pharos.rpc);
        this.contract = new Contract(aquaflux.contract, abi, this.wallet)
    }

    async claimToken() {

    }

    async craft(strategy) {

    }

    async mint() {

    }
}