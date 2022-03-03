const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  deployEndemicNFT,
  deployMarketplaceWithDeps,
  deployOffer,
} = require('./helpers/deploy');
const { ERC721_ASSET_CLASS } = require('./helpers/ids');
const safeTransferWithBytes = require('./helpers/safeTransferWithBytes');

describe('NftTrade', function () {
  let marketplace,
    offer,
    masterNftContract,
    nftContract,
    feeProviderContract,
    contractRegistryContract,
    royaltiesProviderContract;

  let owner, user1, user2, user3, minter, signer;

  async function mint(id, recipient) {
    await nftContract
      .connect(owner)
      .mint(
        recipient,
        'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
      );
  }

  async function deploy(makerFee = 0, takerFee, initialFee = 0) {
    [owner, user1, user2, user3, minter, signer, ...otherSigners] =
      await ethers.getSigners();

    const result = await deployMarketplaceWithDeps(
      makerFee,
      takerFee,
      initialFee
    );

    contractRegistryContract = result.contractRegistryContract;
    masterNftContract = result.masterNftContract;
    feeProviderContract = result.feeProviderContract;
    marketplace = result.marketplace;
    royaltiesProviderContract = result.royaltiesProviderContract;

    offer = await deployOffer(
      feeProviderContract.address,
      royaltiesProviderContract.address
    );

    nftContract = await deployEndemicNFT();

    await contractRegistryContract.addSaleContract(marketplace.address);
    await contractRegistryContract.addSaleContract(offer.address);

    await mint(1, owner.address);
  }

  beforeEach(deploy);

  it('should be able to accept offer after buying NFT', async () => {
    // owner set auctions for 1 ETH
    await nftContract.approve(marketplace.address, 1);
    await marketplace.createAuction(
      nftContract.address,
      1,
      ethers.utils.parseUnits('1'),
      ethers.utils.parseUnits('1'),
      60,
      1,
      ERC721_ASSET_CLASS
    );

    const auctionId = await marketplace.createAuctionId(
      nftContract.address,
      1,
      owner.address
    );

    //user1 offers 0.9 ETH
    await offer.connect(user1).placeOffer(nftContract.address, 1, 100000, {
      value: ethers.utils.parseUnits('0.9'),
    });

    const user1Offer = await offer.getOffer(1);

    //user2 buys NFT
    await marketplace.connect(user2).bid(auctionId, 1, {
      value: ethers.utils.parseUnits('1'),
    });

    expect(await nftContract.ownerOf(1)).to.equal(user2.address);

    //user2 accepts offer from user1

    await nftContract.connect(user2).approve(offer.address, 1);

    await offer.connect(user2).acceptOffer(1);

    expect(await nftContract.ownerOf(1)).to.equal(user1.address);
  });
});
