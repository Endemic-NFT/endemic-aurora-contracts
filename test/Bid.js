const { expect } = require('chai');
const { ethers, network, upgrades } = require('hardhat');
const BN = require('bignumber.js');
const {
  deployEndemicNFT,
  deployBid,
  deployEndemicMasterNFT,
  deployContractRegistry,
  deployFeeProvider,
} = require('./helpers/deploy');

describe('Bid', function () {
  let bidContract,
    masterNftContract,
    nftContract,
    nftContract2,
    feeProviderContract,
    contractRegistryContract;

  let owner, user1, user2, user3;

  async function mint(id, recipient) {
    await nftContract
      .connect(owner)
      .mint(
        recipient,
        user1.address,
        'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
      );
  }

  async function safeTransferWithBytes(sender, from, to, tokenId, data) {
    return await nftContract
      .connect(sender)
      ['safeTransferFrom(address,address,uint256,bytes)'](
        from,
        to,
        tokenId,
        data
      );
  }
  async function deploy(makerFee = 300, takerFee = 300, initialFee = 2200) {
    [owner, user1, user2, user3, minter, signer, ...otherSigners] =
      await ethers.getSigners();

    contractRegistryContract = await deployContractRegistry(owner);
    masterNftContract = await deployEndemicMasterNFT(owner);

    feeProviderContract = await deployFeeProvider(
      owner,
      masterNftContract.address,
      contractRegistryContract.address,
      makerFee,
      takerFee,
      initialFee
    );

    bidContract = await deployBid(
      owner,
      feeProviderContract.address,
      masterNftContract.address
    );

    nftContract = await deployEndemicNFT(owner);
    nftContract2 = await deployEndemicNFT(user1);

    await contractRegistryContract.addSaleContract(bidContract.address);

    await mint(1, user1.address);
    await mint(2, user1.address);
  }

  describe('Initial State', () => {
    beforeEach(deploy);

    it('should start with owner set', async () => {
      const ownerAddr = await bidContract.owner();
      expect(ownerAddr).to.equal(owner.address);
    });
  });

  describe('Create bid', () => {
    beforeEach(deploy);

    it('should successfully create a bid', async () => {
      const placeBidTx = await bidContract.placeBid(
        nftContract.address,
        1,
        1000,
        {
          value: ethers.utils.parseUnits('0.5'),
        }
      );

      const activeBid = await bidContract.getBidByBidder(
        nftContract.address,
        1,
        owner.address
      );

      await expect(placeBidTx)
        .to.emit(bidContract, 'BidCreated')
        .withArgs(
          activeBid.bidId,
          nftContract.address,
          1,
          owner.address,
          activeBid.price,
          activeBid.expiresAt
        );

      expect(activeBid.bidIndex).to.equal(0);
      expect(activeBid.bidder).to.equal(owner.address);
      expect(activeBid.price).to.equal(ethers.utils.parseUnits('0.485'));
      expect(activeBid.priceWithFee).to.equal(ethers.utils.parseUnits('0.5'));
    });

    it('should fail to bid multiple times on same token', async () => {
      await bidContract.placeBid(nftContract.address, 1, 1000, {
        value: ethers.utils.parseUnits('0.5'),
      });

      await expect(
        bidContract.placeBid(nftContract.address, 1, 1000, {
          value: ethers.utils.parseUnits('0.6'),
        })
      ).to.be.revertedWith('Bid already exists');

      const activeBid = await bidContract.getBidByBidder(
        nftContract.address,
        1,
        owner.address
      );

      expect(activeBid.bidIndex).to.equal(0);
      expect(activeBid.bidder).to.equal(owner.address);
      expect(activeBid.price).to.equal(ethers.utils.parseUnits('0.485'));
      expect(activeBid.priceWithFee).to.equal(ethers.utils.parseUnits('0.5'));
    });

    it('should fail to create bid with no eth sent', async () => {
      await expect(
        bidContract.placeBid(nftContract.address, 1, 1000, {
          value: 0,
        })
      ).to.be.revertedWith('Invalid value sent');
    });

    it('should fail to bid on token owned by bidder', async () => {
      await expect(
        bidContract.connect(user1).placeBid(nftContract.address, 1, 1000, {
          value: ethers.utils.parseUnits('0.5'),
        })
      ).to.be.revertedWith('Token is burned or owned by the sender');
    });

    it('should fail to bid with invalid duration', async () => {
      await expect(
        bidContract.placeBid(nftContract.address, 1, 1, {
          value: ethers.utils.parseUnits('0.5'),
        })
      ).to.be.revertedWith('Bid duration too short');

      await expect(
        bidContract.placeBid(nftContract.address, 1, 9999999999, {
          value: ethers.utils.parseUnits('0.5'),
        })
      ).to.be.revertedWith('Bid duration too long');
    });

    it('should fail to create bid when paused', async () => {
      await bidContract.pause();

      await expect(
        bidContract.placeBid(nftContract.address, 1, 1000, {
          value: ethers.utils.parseUnits('0.5'),
        })
      ).to.be.revertedWith('Pausable: paused');
    });
  });

  describe('Cancel bid', () => {
    beforeEach(deploy);

    it('should be able to cancel bid', async () => {
      await bidContract.placeBid(nftContract.address, 1, 1000, {
        value: ethers.utils.parseUnits('0.5'),
      });

      const activeBid = await bidContract.getBidByBidder(
        nftContract.address,
        1,
        owner.address
      );

      const ownerBalance1 = await owner.getBalance();
      const cancelTx = await bidContract.cancelBid(nftContract.address, 1);

      await expect(cancelTx)
        .to.emit(bidContract, 'BidCancelled')
        .withArgs(activeBid.bidId, nftContract.address, 1, owner.address);

      const ownerBalance2 = await owner.getBalance();
      expect(ownerBalance2.sub(ownerBalance1)).to.be.closeTo(
        ethers.utils.parseUnits('0.5'),
        ethers.utils.parseUnits('0.001') //gas fees
      );

      await expect(
        bidContract.getBidByBidder(nftContract.address, 1, owner.address)
      ).to.be.revertedWith('Invalid index');
    });

    it('should not be able to cancel other bids', async () => {
      await bidContract.placeBid(nftContract.address, 1, 1000, {
        value: ethers.utils.parseUnits('0.5'),
      });

      await bidContract.connect(user2).placeBid(nftContract.address, 1, 1000, {
        value: ethers.utils.parseUnits('0.3'),
      });

      const ownerBalance1 = await owner.getBalance();
      await bidContract.cancelBid(nftContract.address, 1);

      const ownerBalance2 = await owner.getBalance();
      expect(ownerBalance2.sub(ownerBalance1)).to.be.closeTo(
        ethers.utils.parseUnits('0.5'),
        ethers.utils.parseUnits('0.001') //gas fees
      );

      await expect(
        bidContract.getBidByBidder(nftContract.address, 1, owner.address)
      ).to.be.revertedWith('Bidder has not an active bid for this token');

      const activeBid = await bidContract.getBidByBidder(
        nftContract.address,
        1,
        user2.address
      );

      expect(activeBid.bidIndex).to.equal(0);
    });

    it('should fail to cancel bid when paused', async () => {
      await bidContract.placeBid(nftContract.address, 1, 1000, {
        value: ethers.utils.parseUnits('0.5'),
      });

      await bidContract.pause();

      await expect(
        bidContract.cancelBid(nftContract.address, 1)
      ).to.be.revertedWith('Pausable: paused');
    });

    it('should remove expired bid', async () => {
      await bidContract.placeBid(nftContract.address, 1, 100, {
        value: ethers.utils.parseUnits('0.5'),
      });

      await bidContract.connect(user2).placeBid(nftContract.address, 2, 100, {
        value: ethers.utils.parseUnits('0.5'),
      });

      await bidContract.connect(user2).placeBid(nftContract.address, 1, 500, {
        value: ethers.utils.parseUnits('0.4'),
      });

      await network.provider.send('evm_increaseTime', [200]);
      await network.provider.send('evm_mine');

      await bidContract.removeExpiredBids(
        [nftContract.address, nftContract.address],
        [1, 2],
        [owner.address, user2.address]
      );

      await expect(
        bidContract.getBidByBidder(nftContract.address, 1, owner.address)
      ).to.be.revertedWith('Bidder has not an active bid for this token');

      await expect(
        bidContract.getBidByBidder(nftContract.address, 2, user2.address)
      ).to.be.revertedWith('Invalid index');

      const bid = await bidContract.getBidByBidder(
        nftContract.address,
        1,
        user2.address
      );

      expect(bid.bidder).to.equal(user2.address);
      expect(bid.priceWithFee).to.equal(ethers.utils.parseUnits('0.4'));
    });
  });

  describe('Accept bid', () => {
    beforeEach(deploy);

    it('should be able to accept bid', async () => {
      // sending 0.5 eth
      // taker fee is 3% = 0.015 eth
      // owner of nft sees bid with 0.485 eth
      // maker initial sale fee is 22% = 0.1067 eth
      // owner will get 0.3783 eth
      // total fee is 0.1217
      await bidContract.placeBid(nftContract.address, 1, 1000000, {
        value: ethers.utils.parseUnits('0.5'),
      });

      const user1Balance1 = await user1.getBalance();

      const bidId = (
        await bidContract.getBidByToken(nftContract.address, 1, 0)
      )[0];

      const transferTx = await safeTransferWithBytes(
        user1,
        user1.address,
        bidContract.address,
        1,
        bidId
      );

      await expect(transferTx)
        .to.emit(bidContract, 'BidAccepted')
        .withArgs(
          bidId,
          nftContract.address,
          1,
          owner.address,
          user1.address,
          ethers.utils.parseUnits('0.485')
        );

      const user1Balance2 = await user1.getBalance();

      expect(user1Balance2.sub(user1Balance1)).to.be.closeTo(
        ethers.utils.parseUnits('0.378'),
        ethers.utils.parseUnits('0.001') //gas
      );

      expect(await nftContract.ownerOf(1)).to.equal(owner.address);

      const feeBalance = await nftContract.provider.getBalance(
        '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD'
      );

      expect(feeBalance).to.equal(ethers.utils.parseUnits('0.1217'));
    });

    it('should not charge maker fee if seller is owner of master nft', async () => {
      await masterNftContract.mintNFT(user1.address);

      await bidContract.placeBid(nftContract.address, 1, 1000000, {
        value: ethers.utils.parseUnits('0.5'),
      });

      const user1Balance1 = await user1.getBalance();

      const bidId = (
        await bidContract.getBidByToken(nftContract.address, 1, 0)
      )[0];

      const feeBalanceBefore = await nftContract.provider.getBalance(
        '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD'
      );

      await safeTransferWithBytes(
        user1,
        user1.address,
        bidContract.address,
        1,
        bidId
      );

      expect(await nftContract.ownerOf(1)).to.equal(owner.address);

      const user1Balance2 = await user1.getBalance();
      expect(user1Balance2.sub(user1Balance1)).to.be.closeTo(
        ethers.utils.parseUnits('0.485'),
        ethers.utils.parseUnits('0.001') //gas
      );

      const feeBalanceAfter = await nftContract.provider.getBalance(
        '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD'
      );
      expect(feeBalanceAfter.sub(feeBalanceBefore)).to.equal(
        ethers.utils.parseUnits('0.015')
      );
    });

    it('should not charge taker fee if buyer is owner of master nft', async () => {
      await masterNftContract.mintNFT(owner.address);

      await bidContract.placeBid(nftContract.address, 1, 1000000, {
        value: ethers.utils.parseUnits('0.5'),
      });

      const user1Balance1 = await user1.getBalance();

      const bidId = (
        await bidContract.getBidByToken(nftContract.address, 1, 0)
      )[0];

      const feeBalanceBefore = await nftContract.provider.getBalance(
        '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD'
      );

      await safeTransferWithBytes(
        user1,
        user1.address,
        bidContract.address,
        1,
        bidId
      );

      expect(await nftContract.ownerOf(1)).to.equal(owner.address);

      const user1Balance2 = await user1.getBalance();
      expect(user1Balance2.sub(user1Balance1)).to.be.closeTo(
        ethers.utils.parseUnits('0.39'),
        ethers.utils.parseUnits('0.001') //gas
      );

      const feeBalanceAfter = await nftContract.provider.getBalance(
        '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD'
      );
      expect(feeBalanceAfter.sub(feeBalanceBefore)).to.equal(
        ethers.utils.parseUnits('0.11')
      );
    });

    it('should not charge fees if buyer and saler and owners of master nft', async () => {
      await masterNftContract.mintNFT(owner.address);
      await masterNftContract.mintNFT(user1.address);

      await bidContract.placeBid(nftContract.address, 1, 1000000, {
        value: ethers.utils.parseUnits('0.5'),
      });

      const user1Balance1 = await user1.getBalance();
      const feeBalanceBefore = await nftContract.provider.getBalance(
        '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD'
      );

      const bidId = (
        await bidContract.getBidByToken(nftContract.address, 1, 0)
      )[0];

      await safeTransferWithBytes(
        user1,
        user1.address,
        bidContract.address,
        1,
        bidId
      );

      expect(await nftContract.ownerOf(1)).to.equal(owner.address);

      const user1Balance2 = await user1.getBalance();
      expect(user1Balance2.sub(user1Balance1)).to.be.closeTo(
        ethers.utils.parseUnits('0.5'),
        ethers.utils.parseUnits('0.001') //gas
      );

      const feeBalanceAfter = await nftContract.provider.getBalance(
        '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD'
      );
      expect(feeBalanceAfter.sub(feeBalanceBefore)).to.equal(
        ethers.utils.parseUnits('0')
      );
    });
  });
});
