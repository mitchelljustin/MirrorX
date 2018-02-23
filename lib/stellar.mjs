import Stellar from 'stellar-sdk'

Stellar.Network.use(Stellar.Networks[process.env.STELLAR_NETWORK])

const stellar = new Stellar.Server(process.env.STELLAR_HORIZON_URI)

export {stellar, Stellar}