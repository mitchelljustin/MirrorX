import Stellar from "stellar-sdk"

Stellar.Network.useTestNetwork()

const stellar = new Stellar.Server('https://horizon-testnet.stellar.org')

export {stellar, Stellar}