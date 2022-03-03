const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const {
  deployOffer,
  deployContractRegistry,
  deployFeeProvider,
  deployRoyaltiesProvider,
  deployEndemicNFT,
  deployEndemicMasterNFT,
} = require('./helpers/deploy');

describe('Offer', function () {
  let offerContract,
    nftContract,
    feeProviderContract,
    royaltiesProviderContract,
    masterNftContract,
    contractRegistryContract;
  let owner, user1, user2, user3, royaltiesRecipient;

  async function mint(recipient) {
    await nftContract
      .connect(owner)
      .mint(
        recipient,
        'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
      );
  }

  async function deploy(makerFee = 300, takerFee = 300, initialFee = 2200) {
    [
      owner,
      user1,
      user2,
      user3,
      minter,
      signer,
      royaltiesRecipient,
      ...otherSigners
    ] = await ethers.getSigners();

    masterNftContract = await deployEndemicMasterNFT();
    contractRegistryContract = await deployContractRegistry();
    royaltiesProviderContract = await deployRoyaltiesProvider();
    feeProviderContract = await deployFeeProvider(
      masterNftContract.address,
      contractRegistryContract.address,
      makerFee,
      takerFee,
      initialFee
    );
    offerContract = await deployOffer(
      feeProviderContract.address,
      royaltiesProviderContract.address
    );

    nftContract = await deployEndemicNFT();

    await contractRegistryContract.addSaleContract(offerContract.address);

    await mint(user1.address);
    await mint(user1.address);

    await nftContract.connect(user1).approve(offerContract.address, 1);
    await nftContract.connect(user1).approve(offerContract.address, 2);
  }

  describe('Initial State', () => {
    beforeEach(deploy);

    it('should start with owner set', async () => {
      const ownerAddr = await offerContract.owner();
      expect(ownerAddr).to.equal(owner.address);
    });
  });

  describe('Create offer', () => {
    beforeEach(deploy);

    it('should successfully create a offer', async () => {
      const placeOfferTx = await offerContract.placeOffer(
        nftContract.address,
        1,
        100000,
        {
          value: ethers.utils.parseUnits('0.515'),
        }
      );

      const activeOffer = await offerContract.getOffer(1);

      await expect(placeOfferTx)
        .to.emit(offerContract, 'OfferCreated')
        .withArgs(
          1,
          nftContract.address,
          1,
          owner.address,
          activeOffer.price,
          activeOffer.expiresAt
        );
      expect(activeOffer.id).to.equal('1');
      expect(activeOffer.offerder).to.equal(owner.address);
      expect(activeOffer.price).to.equal(ethers.utils.parseUnits('0.5'));
      expect(activeOffer.priceWithFee).to.equal(
        ethers.utils.parseUnits('0.515')
      );
    });

    it('should fail to offer multiple times on same token', async () => {
      await offerContract.placeOffer(nftContract.address, 1, 100000, {
        value: ethers.utils.parseUnits('0.515'),
      });
      await expect(
        offerContract.placeOffer(nftContract.address, 1, 100000, {
          value: ethers.utils.parseUnits('0.616'),
        })
      ).to.be.revertedWith('OfferExists');

      const activeOffer = await offerContract.getOffer(1);
      expect(activeOffer.offerder).to.equal(owner.address);
      expect(activeOffer.price).to.equal(ethers.utils.parseUnits('0.5'));
      expect(activeOffer.priceWithFee).to.equal(
        ethers.utils.parseUnits('0.515')
      );
    });

    it('should fail to create offer with no eth sent', async () => {
      await expect(
        offerContract.placeOffer(nftContract.address, 1, 100000, {
          value: 0,
        })
      ).to.be.revertedWith('InvalidValueSent');
    });

    it('should fail to offer on token owned by offerder', async () => {
      await expect(
        offerContract
          .connect(user1)
          .placeOffer(nftContract.address, 1, 100000, {
            value: ethers.utils.parseUnits('0.5'),
          })
      ).to.be.revertedWith('InvalidTokenOwner');
    });

    it('should fail to offer with invalid duration', async () => {
      await expect(
        offerContract.placeOffer(nftContract.address, 1, 1, {
          value: ethers.utils.parseUnits('0.5'),
        })
      ).to.be.revertedWith('DurationTooShort');
    });

    it('should fail to create offer when paused', async () => {
      await offerContract.pause();
      await expect(
        offerContract.placeOffer(nftContract.address, 1, 100000, {
          value: ethers.utils.parseUnits('0.5'),
        })
      ).to.be.revertedWith('Pausable: paused');
    });

    it('should successfully create multiple offers on same token', async () => {
      await offerContract.placeOffer(nftContract.address, 1, 100000, {
        value: ethers.utils.parseUnits('0.515'),
      });
      await offerContract
        .connect(user2)
        .placeOffer(nftContract.address, 1, 100000, {
          value: ethers.utils.parseUnits('0.616'),
        });
      await offerContract
        .connect(user3)
        .placeOffer(nftContract.address, 1, 100000, {
          value: ethers.utils.parseUnits('0.717'),
        });
      const activeOffer1 = await offerContract.getOffer(1);

      expect(activeOffer1.offerder).to.equal(owner.address);
      const activeOffer2 = await offerContract.getOffer(2);
      expect(activeOffer2.offerder).to.equal(user2.address);
      const activeOffer3 = await offerContract.getOffer(3);
      expect(activeOffer3.offerder).to.equal(user3.address);
    });
  });

  describe('Cancel offer', () => {
    beforeEach(deploy);

    it('should be able to cancel offer', async () => {
      await offerContract.placeOffer(nftContract.address, 1, 100000, {
        value: ethers.utils.parseUnits('0.5'),
      });
      const activeOffer = await offerContract.getOffer(1);
      const ownerBalance1 = await owner.getBalance();
      const cancelTx = await offerContract.cancelOffer(1);
      await expect(cancelTx)
        .to.emit(offerContract, 'OfferCancelled')
        .withArgs(activeOffer.id, nftContract.address, 1, owner.address);
      const ownerBalance2 = await owner.getBalance();
      expect(ownerBalance2.sub(ownerBalance1)).to.be.closeTo(
        ethers.utils.parseUnits('0.5'),
        ethers.utils.parseUnits('0.001') //gas fees
      );
      await expect(offerContract.getOffer(1)).to.be.revertedWith(
        'NoActiveOffer'
      );
    });

    it('should not be able to cancel other offers', async () => {
      await offerContract.placeOffer(nftContract.address, 1, 100000, {
        value: ethers.utils.parseUnits('0.5'),
      });
      await offerContract
        .connect(user2)
        .placeOffer(nftContract.address, 1, 100000, {
          value: ethers.utils.parseUnits('0.3'),
        });
      const ownerBalance1 = await owner.getBalance();
      await offerContract.cancelOffer(1);
      const ownerBalance2 = await owner.getBalance();
      expect(ownerBalance2.sub(ownerBalance1)).to.be.closeTo(
        ethers.utils.parseUnits('0.5'),
        ethers.utils.parseUnits('0.001') //gas fees
      );
      await expect(offerContract.getOffer(1)).to.be.revertedWith(
        'NoActiveOffer'
      );
      const activeOffer = await offerContract.getOffer(2);
      expect(activeOffer.offerder).to.equal(user2.address);
    });

    it('should fail to cancel offer when paused', async () => {
      await offerContract.placeOffer(nftContract.address, 1, 100000, {
        value: ethers.utils.parseUnits('0.5'),
      });
      await offerContract.pause();
      await expect(offerContract.cancelOffer(1)).to.be.revertedWith(
        'Pausable: paused'
      );
    });

    it('should remove expired offer', async () => {
      await offerContract.placeOffer(nftContract.address, 1, 100000, {
        value: ethers.utils.parseUnits('0.5'),
      });
      await offerContract
        .connect(user2)
        .placeOffer(nftContract.address, 2, 100000, {
          value: ethers.utils.parseUnits('0.5'),
        });
      await offerContract
        .connect(user2)
        .placeOffer(nftContract.address, 1, 300000, {
          value: ethers.utils.parseUnits('0.4'),
        });
      await network.provider.send('evm_increaseTime', [200000]);
      await network.provider.send('evm_mine');
      await offerContract.removeExpiredOffers(
        [nftContract.address, nftContract.address],
        [1, 2],
        [owner.address, user2.address]
      );
      await expect(offerContract.getOffer(1)).to.be.revertedWith(
        'NoActiveOffer'
      );
      await expect(offerContract.getOffer(2)).to.be.revertedWith(
        'NoActiveOffer'
      );
      const offer = await offerContract.getOffer(3);
      expect(offer.offerder).to.equal(user2.address);
      expect(offer.priceWithFee).to.equal(ethers.utils.parseUnits('0.4'));
    });

    it('should be able to cancel offer where there are multiple offers on same token', async () => {
      await offerContract.placeOffer(nftContract.address, 1, 100000, {
        value: ethers.utils.parseUnits('0.515'),
      });
      await offerContract
        .connect(user2)
        .placeOffer(nftContract.address, 1, 100000, {
          value: ethers.utils.parseUnits('0.616'),
        });
      await offerContract
        .connect(user3)
        .placeOffer(nftContract.address, 1, 100000, {
          value: ethers.utils.parseUnits('0.717'),
        });
      const activeOffer1 = await offerContract.getOffer(1);
      expect(activeOffer1.offerder).to.equal(owner.address);
      const activeOffer2 = await offerContract.getOffer(2);
      expect(activeOffer2.offerder).to.equal(user2.address);
      const activeOffer3 = await offerContract.getOffer(3);
      expect(activeOffer3.offerder).to.equal(user3.address);
      const cancelTx1 = await offerContract.cancelOffer(activeOffer1.id);
      await expect(cancelTx1)
        .to.emit(offerContract, 'OfferCancelled')
        .withArgs(activeOffer1.id, nftContract.address, 1, owner.address);
      const cancelTx2 = await offerContract
        .connect(user2)
        .cancelOffer(activeOffer2.id);
      await expect(cancelTx2)
        .to.emit(offerContract, 'OfferCancelled')
        .withArgs(activeOffer2.id, nftContract.address, 1, user2.address);
    });
  });

  describe('Accept offer', () => {
    beforeEach(deploy);

    it('should be able to accept offer', async () => {
      // sending wants to offer 0.5 eth
      // taker fee is 3% = 0.015 eth
      // user sends 0.515 e th
      // owner of nft sees offer with 0.5 eth
      // maker initial sale fee is 22% = 0.11 eth
      // owner will get 0.39 eth
      // total fee is 0.125
      const feeBalance1 = await nftContract.provider.getBalance(
        '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD'
      );

      await offerContract.placeOffer(nftContract.address, 1, 100000000, {
        value: ethers.utils.parseUnits('0.515'),
      });
      const user1Balance1 = await user1.getBalance();
      const offer = await offerContract.getOffer(1);
      const transferTx = await offerContract
        .connect(user1)
        .acceptOffer(offer.id);
      await expect(transferTx)
        .to.emit(offerContract, 'OfferAccepted')
        .withArgs(
          offer.id,
          nftContract.address,
          1,
          owner.address,
          user1.address,
          ethers.utils.parseUnits('0.5')
        );
      const user1Balance2 = await user1.getBalance();
      expect(user1Balance2.sub(user1Balance1)).to.be.closeTo(
        ethers.utils.parseUnits('0.39'),
        ethers.utils.parseUnits('0.001') //gas
      );
      expect(await nftContract.ownerOf(1)).to.equal(owner.address);
      const feeBalance2 = await nftContract.provider.getBalance(
        '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD'
      );
      expect(feeBalance2.sub(feeBalance1).toString()).to.equal(
        ethers.utils.parseUnits('0.125')
      );
    });

    it('should be able to accept offer after purchase', async () => {
      await offerContract.placeOffer(nftContract.address, 1, 100000, {
        value: ethers.utils.parseUnits('0.515'),
      });
      await offerContract
        .connect(user2)
        .placeOffer(nftContract.address, 1, 100000, {
          value: ethers.utils.parseUnits('0.616'),
        });
      const offer1 = await offerContract.getOffer(1);
      const offer2 = await offerContract.getOffer(2);
      await offerContract.connect(user1).acceptOffer(offer1.id);
      await nftContract.approve(offerContract.address, 1);
      await offerContract.acceptOffer(offer2.id);
    });
  });

  describe('Royalties', () => {
    beforeEach(async () => {
      await deploy();
      await royaltiesProviderContract.setRoyaltiesForCollection(
        nftContract.address,
        royaltiesRecipient.address,
        1000
      );
    });

    it('should distribute royalties', async () => {
      // sending wants to offer 0.5 eth
      // taker fee is 3% = 0.015 eth
      // user sends 0.515 eth
      // owner of nft sees offer with 0.5 eth
      // maker initial sale fee is 22% = 0.11 eth
      // royalties are 10% = 0.05 ETH
      // owner will get 0.34 eth
      // total fee is 0.125
      await offerContract.placeOffer(nftContract.address, 1, 100000000, {
        value: ethers.utils.parseUnits('0.515'),
      });
      const feeBalance1 = await nftContract.provider.getBalance(
        '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD'
      );
      const user1Balance1 = await user1.getBalance();
      const royaltiesRecipientBalance1 = await royaltiesRecipient.getBalance();
      const offer = await offerContract.getOffer(1);
      const transferTx = await offerContract
        .connect(user1)
        .acceptOffer(offer.id);
      await expect(transferTx)
        .to.emit(offerContract, 'OfferAccepted')
        .withArgs(
          offer.id,
          nftContract.address,
          1,
          owner.address,
          user1.address,
          ethers.utils.parseUnits('0.5')
        );
      const user1Balance2 = await user1.getBalance();
      expect(user1Balance2.sub(user1Balance1)).to.be.closeTo(
        ethers.utils.parseUnits('0.34'),
        ethers.utils.parseUnits('0.001') //gas
      );
      const feeBalance2 = await nftContract.provider.getBalance(
        '0x1D96e9bA0a7c1fdCEB33F3f4C71ca9117FfbE5CD'
      );
      expect(feeBalance2.sub(feeBalance1)).to.equal(
        ethers.utils.parseUnits('0.125')
      );
      const royaltiesRecipientBalance2 = await royaltiesRecipient.getBalance();
      expect(
        royaltiesRecipientBalance2.sub(royaltiesRecipientBalance1)
      ).to.equal(ethers.utils.parseUnits('0.05'));
    });
  });
});
