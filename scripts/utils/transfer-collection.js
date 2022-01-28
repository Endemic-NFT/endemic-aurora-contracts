const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Transfering ownership');

  const newOwner = '0x39ae7756f7e9a9dcfc848316482db90253f30b15';
  const address = '0xbb8f36263de92f009781e0cdb6f7f8daab175e9a';

  const EndemicNFT = await ethers.getContractFactory('EndemicNFT');
  const nft = await EndemicNFT.attach(address);
  const tx1 = await nft.setDefaultApproval(
    '0xcF96Ed58395d55d6bd0c470f7ed064741119cbC5',
    true
  );

  await tx1.wait();

  const tx = await nft.transferOwnership(newOwner);
  console.log(await tx.wait());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
