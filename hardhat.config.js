require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@nomiclabs/hardhat-etherscan");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    hardhat:{
      forking:{
        url:`https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
        blockNumber:14486904
      }
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/vJGdxlD1-wyt4XcCO6XNTlbnI9VFAITZ`,
      accounts: [`${process.env.PRIVATE_KEY}`]
    }
  },
  etherscan: {
    apiKey: '31WXEYFAGW4JBBSRRJZRJQB2GB5D6MB48W',
  },
  gasReporter: {
    enabled: true,
    outputFile:"gas-report.txt",
    currency: "USD",
    noColors:true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  },
};
