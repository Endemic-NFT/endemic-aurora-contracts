const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying MetadataUpdater with the account:', deployer.address);

  const MetadataUpdater = await ethers.getContractFactory('MetadataUpdater');
  const metadataUpdater = await MetadataUpdater.deploy();
  await metadataUpdater.deployed();

  console.log('MetadataUpdater deployed to:', metadataUpdater.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
