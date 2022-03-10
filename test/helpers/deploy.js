const { ethers, upgrades } = require('hardhat');

const deployEndemicRewards = async (endemicTokenAddress) => {
  const EndemicRewards = await ethers.getContractFactory('EndemicRewards');

  const endemicRewards = await EndemicRewards.deploy(endemicTokenAddress);
  await endemicRewards.deployed();
  return endemicRewards;
};

const deployEndemicToken = async (deployer) => {
  const EndemicToken = await ethers.getContractFactory('EndemicToken');

  const endemicToken = await EndemicToken.deploy(deployer.address);
  await endemicToken.deployed();
  return endemicToken;
};

const deployEndemicNFT = async () => {
  const EndemicNFT = await ethers.getContractFactory('EndemicNFT');
  const nftContract = await upgrades.deployProxy(
    EndemicNFT,
    ['NftLazyTest', 'NFTL', 'ipfs://'],
    {
      initializer: '__EndemicNFT_init',
    }
  );
  await nftContract.deployed();
  return nftContract;
};

const deployEndemicERC1155 = async () => {
  const EndemicERC1155 = await ethers.getContractFactory('EndemicERC1155');
  const nftContract = await upgrades.deployProxy(
    EndemicERC1155,
    ['Endemic ERC 1155', 'ENDR', 'ipfs://'],
    {
      initializer: '__EndemicERC1155_init',
    }
  );
  await nftContract.deployed();
  return nftContract;
};

const deployMarketplace = async (
  feeProviderAddress,
  royaltiesProviderAddress,
  masterNFTAddress
) => {
  const Marketplace = await ethers.getContractFactory('Marketplace');
  const marketplaceContract = await upgrades.deployProxy(
    Marketplace,
    [
      feeProviderAddress,
      masterNFTAddress,
      royaltiesProviderAddress,
      '0x1d1C46273cEcC00F7503AB3E97A40a199bcd6b31',
    ],
    {
      initializer: '__Marketplace_init',
    }
  );
  await marketplaceContract.deployed();
  return marketplaceContract;
};

const deployMarketplaceWithDeps = async (
  makerFee = 0,
  takerFee = 0,
  initialFee = 0
) => {
  const contractRegistryContract = await deployContractRegistry();
  const masterNftContract = await deployEndemicMasterNFT();

  const royaltiesProviderContract = await deployRoyaltiesProvider();

  const feeProviderContract = await deployFeeProvider(
    masterNftContract.address,
    contractRegistryContract.address,
    makerFee,
    takerFee,
    initialFee
  );
  const marketplace = await deployMarketplace(
    feeProviderContract.address,
    royaltiesProviderContract.address,
    masterNftContract.address
  );

  return {
    contractRegistryContract,
    masterNftContract,
    feeProviderContract,
    royaltiesProviderContract,
    marketplace,
  };
};

const deployEndemicMasterNFT = async () => {
  const EndemicMasterNFT = await ethers.getContractFactory('EndemicMasterNFT');
  const masterNftContract = await upgrades.deployProxy(
    EndemicMasterNFT,
    ['https://tokenbase.com/master/'],
    {
      initializer: '__EndemicMasterNFT_init',
    }
  );
  await masterNftContract.deployed();
  return masterNftContract;
};

const deployOffer = async (feeProviderAddress, royaltiesProviderAddress) => {
  const Offer = await ethers.getContractFactory('Offer');
  const offer = await upgrades.deployProxy(
    Offer,
    [
      feeProviderAddress,
      royaltiesProviderAddress,
      '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD',
    ],
    {
      initializer: '__Offer_init',
    }
  );
  await offer.deployed();
  return offer;
};

const deployCollectionBid = async (
  feeProviderAddress,
  royaltiesProviderAddress,
  masterNFTAddress
) => {
  const CollectionBid = await ethers.getContractFactory('CollectionBid');
  const collectionBidContract = await upgrades.deployProxy(
    CollectionBid,
    [
      feeProviderAddress,
      masterNFTAddress,
      royaltiesProviderAddress,
      '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD',
    ],
    {
      initializer: '__CollectionBid_init',
    }
  );
  await collectionBidContract.deployed();
  return collectionBidContract;
};

const deployRoyaltiesProvider = async () => {
  const RoyaltiesProvider = await ethers.getContractFactory(
    'RoyaltiesProvider'
  );
  const royaltiesProviderProxy = await upgrades.deployProxy(
    RoyaltiesProvider,
    [],
    {
      initializer: '__RoyaltiesProvider_init',
    }
  );
  await royaltiesProviderProxy.deployed();
  return royaltiesProviderProxy;
};

const deployFeeProvider = async (
  masterNFTAddress,
  contractRegistryAddress,
  makerFee = 250, // 2.5% maker fee
  takerFee = 300, // 3% taker fee
  initialFee = 2200 // 22% initial sale fee
) => {
  const FeeProvider = await ethers.getContractFactory('FeeProvider');
  const feeProviderContract = await upgrades.deployProxy(
    FeeProvider,
    [
      initialFee,
      makerFee,
      takerFee,
      500,
      masterNFTAddress,
      contractRegistryAddress,
    ],
    {
      initializer: '__FeeProvider_init',
    }
  );

  await feeProviderContract.deployed();
  return feeProviderContract;
};

const deployContractRegistry = async () => {
  const ContractRegistry = await ethers.getContractFactory('ContractRegistry');
  const contractRegistryContracat = await upgrades.deployProxy(
    ContractRegistry,
    [],
    {
      initializer: '__ContractRegistry_init',
    }
  );

  await contractRegistryContracat.deployed();
  return contractRegistryContracat;
};

const deployTipjar = async () => {
  const Tipjar = await ethers.getContractFactory('Tipjar');
  const tipjarContract = await Tipjar.deploy();
  
  await tipjarContract.deployed();
  return tipjarContract;
};

module.exports = {
  deployEndemicToken,
  deployEndemicNFT,
  deployMarketplaceWithDeps,
  deployEndemicMasterNFT,
  deployOffer,
  deployCollectionBid,
  deployEndemicRewards,
  deployEndemicERC1155,
  deployFeeProvider,
  deployContractRegistry,
  deployRoyaltiesProvider,
  deployTipjar
};
