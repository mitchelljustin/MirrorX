import Stellar from 'stellar-sdk'

const passPhrase = Stellar.Networks[process.env.STELLAR_NETWORK]
Stellar.Network.use(new Stellar.Network(passPhrase))

const stellar = new Stellar.Server(process.env.STELLAR_HORIZON_URI)

export {stellar, Stellar}