const { ethers, network, upgrades } = require('hardhat');
const { getForNetwork } = require('../utils/addresses');

async function main() {
  const [deployer] = await ethers.getSigners();
  const { offerProxy } = getForNetwork(network.name);

  const Offer = await ethers.getContractFactory('Offer');
  await upgrades.upgradeProxy(offerProxy, Offer, { deployer });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
