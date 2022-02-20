const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  deployEndemicMasterNFT,
  deployEndemicNFT,
} = require('../helpers/deploy');

describe('EndemicNFT', function () {
  let nftContract;
  let owner, user, user2, user3;

  beforeEach(async function () {
    [owner, user, user2, user3] = await ethers.getSigners();

    nftContract = await deployEndemicNFT();
  });

  it('should have correct initial data', async function () {
    const name = await nftContract.name();
    expect(name).to.equal('NftLazyTest');

    const symbol = await nftContract.symbol();
    expect(symbol).to.equal('NFTL');

    const ownerAddress = await nftContract.owner();
    expect(ownerAddress).to.equal(owner.address);
  });

  describe('Mint', function () {
    it('should mint an NFT if owner', async function () {
      const tokenId = 1;
      const mintTx = await nftContract
        .connect(owner)
        .mint(
          user.address,
          'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
        );

      await expect(mintTx)
        .to.emit(nftContract, 'Mint')
        .withArgs(tokenId.toString(), owner.address);

      const nftOwnerAddress = await nftContract.ownerOf(tokenId);
      expect(nftOwnerAddress).to.equal(user.address);

      const tokenUri = await nftContract.tokenURI(tokenId);
      expect(tokenUri).to.equal(
        'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
      );
    });

    it('should mint an NFT if default approval', async function () {
      const tokenId = 1;

      await nftContract.connect(owner).setDefaultApproval(user.address, true);

      const mintTx = await nftContract
        .connect(user)
        .mint(
          user.address,
          'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
        );

      await expect(mintTx)
        .to.emit(nftContract, 'Mint')
        .withArgs(tokenId.toString(), owner.address);

      const nftOwnerAddress = await nftContract.ownerOf(tokenId);
      expect(nftOwnerAddress).to.equal(user.address);

      const tokenUri = await nftContract.tokenURI(tokenId);
      expect(tokenUri).to.equal(
        'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
      );
    });

    it('should not mint an NFT if not owner', async function () {
      await expect(
        nftContract
          .connect(user)
          .mint(
            user.address,
            'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
          )
      ).to.be.revertedWith('mint caller is not owner nor approved');
    });

    it('should mint an NFT after burn', async function () {
      const tokenId = 1;

      await nftContract.connect(owner).setDefaultApproval(user.address, true);

      await nftContract
        .connect(user)
        .mint(
          user.address,
          'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
        );

      await nftContract.connect(user).burn(1);

      await nftContract
        .connect(user)
        .mint(
          user.address,
          'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
        );

      const nftOwnerAddress = await nftContract.ownerOf(2);
      expect(nftOwnerAddress).to.equal(user.address);

      const tokenUri = await nftContract.tokenURI(2);
      expect(tokenUri).to.equal(
        'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
      );

      expect(await nftContract.totalSupply()).to.equal('1');
    });
  });
});
