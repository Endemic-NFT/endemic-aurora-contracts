require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('@openzeppelin/hardhat-upgrades');
require('hardhat-contract-sizer');
require('hardhat-gas-reporter');
require('solidity-coverage');
require('dotenv').config();

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
      {
        version: '0.8.2',
        settings: {},
      },
    ],
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    aurora: {
      url: 'https://mainnet.aurora.dev',
      accounts: [`0x${process.env.MAINNET_PRIVATE_KEY}`],
      chainId: 1313161554,
      timeout: 80000,
    },
    aurora_testnet: {
      url: 'https://testnet.aurora.dev',
      accounts: [`0x${process.env.PRIVATE_KEY}`],
      chainId: 1313161555,
      gasPrice: 0,
      timeout: 80000,
    },
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 100,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    apiKey: {
      // aurora: process.env.ETHERSCAN_API_KEY,
      rinkeby: process.env.ETHERSCAN_API_KEY,
    },
  },
};
