let XMSwap = artifacts.require("./XMSwap.sol");

module.exports = function(deployer) {
  deployer.deploy(XMSwap);
};
