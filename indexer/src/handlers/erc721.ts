import { log, BigInt } from '@graphprotocol/graph-ts';
import {
  Transfer,
  Mint,
} from '../../generated/templates/EndemicNFT/EndemicNFT';

import { NFT, NFTContract } from '../../generated/schema';
import {
  getERC721TokenURI,
  getNFTId,
  readTokenMetadataFromIPFS,
  isBurnEvent,
  isMintEvent,
} from '../modules/nft';
import { createAccount } from '../modules/account';
import { createERC721TransferActivity } from '../modules/activity';
import { createThirdPartyNFTContract } from '../modules/nftContract';
import { addContractCount, removeContractCount } from '../modules/count';
import { deleteOwnership, getOrCreateOwnership } from '../modules/ownership';

export function handleTransfer(event: Transfer): void {
  if (event.params.tokenId.toString() == '') {
    return;
  }

  let id = getNFTId(
    event.address.toHexString(),
    event.params.tokenId.toString()
  );
  let tokenURI = getERC721TokenURI(event.address, event.params.tokenId);
  let nft = NFT.load(id);

  if (!nft) {
    nft = new NFT(id);
    nft.type = 'ERC-721';
  }

  let contract = NFTContract.load(event.address.toHexString());
  if (!contract) {
    // Contract is not created via our factory, it's third party
    contract = createThirdPartyNFTContract(
      event.address,
      event.block.timestamp
    );
  }

  nft.tokenId = event.params.tokenId;
  nft.contract = event.address.toHexString();
  nft.updatedAt = event.block.timestamp;
  nft.price = BigInt.fromI32(0);
  nft.burned = false;
  nft.isOnSale = false;

  if (isMintEvent(event.params.from)) {
    nft.createdAt = event.block.timestamp;
    nft.category = contract.category;
    nft.contractId = event.address;
    nft.contractName = contract.name;
    nft.tokenURI = tokenURI;
    nft.supply = BigInt.fromI32(1);

    addContractCount(
      event.address.toHexString(),
      BigInt.fromI32(1),
      BigInt.fromI32(0)
    );

    let metaData = readTokenMetadataFromIPFS(tokenURI);
    if (metaData != null) {
      nft.image = metaData.image;
      nft.name = metaData.name;
      nft.description = metaData.description;
    } else {
      log.warning('TokenURI: {} not available', [tokenURI]);
    }
  } else if (isBurnEvent(event.params.to)) {
    nft.burned = true;
    removeContractCount(
      event.address.toHexString(),
      BigInt.fromI32(1),
      BigInt.fromI32(0)
    );
  }

  nft.save();

  let nftOwnership = getOrCreateOwnership(nft, event.params.to);
  nftOwnership.value = BigInt.fromI32(1);
  nftOwnership.nftBurned = nft.burned;
  nftOwnership.nftIsOnSale = nft.isOnSale;
  nftOwnership.save();

  if (!isMintEvent(event.params.from)) {
    deleteOwnership(id, event.params.from);
  }

  createAccount(event.params.to);
  createERC721TransferActivity(nft, event);
}

export function handleMint(event: Mint): void {
  let id = getNFTId(
    event.address.toHexString(),
    event.params.tokenId.toString()
  );
  let nft = <NFT>NFT.load(id);

  nft.artist = event.params.artistId.toHex();
  nft.artistId = event.params.artistId;

  nft.save();
}