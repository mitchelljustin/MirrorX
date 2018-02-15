module.exports = {
    networks: {
        development: {
            host: "localhost",
            port: 7545,
            network_id: "*" // Match any network id
        },
        ropsten: {
            host: "localhost",
            port: 8545,
            network_id: 3,
            gas: 187632,
        },
        rinkeby: {
            host: "localhost",
            port: 8545,
            network_id: 4,
        },
    }
};
