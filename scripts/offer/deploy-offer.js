const { ethers, upgrades, network } = require('hardhat');
const { getForNetwork } = require('../utils/addresses');

async function main() {
  const [deployer] = await ethers.getSigners();
  const { feeProviderProxy, royaltiesProviderProxy } = getForNetwork(
    network.name
  );

  console.log('Deploying Offer with the account:', deployer.address);

  const Offer = await ethers.getContractFactory('Offer');
  const offerProxy = await upgrades.deployProxy(
    Offer,
    [
      feeProviderProxy,
      royaltiesProviderProxy,
      '0x813201fe76De0622223492D2467fF5Fd38cF2320',
    ],
    {
      deployer,
      initializer: '__Offer_init',
    }
  );
  await offerProxy.deployed();

  console.log('Offer deployed to:', offerProxy.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
