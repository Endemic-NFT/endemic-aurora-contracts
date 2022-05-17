.PHONY: deployArtMinter
deployArtMinter:
	npx hardhat run scripts/minter/deploy-art-minter.js --network ${network}

.PHONY: deployContractImporter
deployContractImporter:
	npx hardhat run scripts/import/deploy-contract-importer.js --network ${network}

.PHONY: deployMetadataUpdater
deployMetadataUpdater:
	npx hardhat run scripts/import/deploy-metadata-updater.js --network ${network}

.PHONY: deployContractRegistry
deployContractRegistry:
	npx hardhat run scripts/contract-registry/deploy-contract-registry.js --network ${network}

.PHONY: deployMasterKeysCollection
deployMasterKeysCollection:
	npx hardhat run scripts/erc-721/deploy-master-nft.js --network ${network}

.PHONY: deployFeeProvider
deployFeeProvider:
	npx hardhat run scripts/fee-provider/deploy-fee-provider.js --network ${network}

.PHONY: deployRoyaltiesProvider
deployRoyaltiesProvider:
	npx hardhat run scripts/royalties-provider/deploy-royalties-provider.js --network ${network}

.PHONY: deployEndemicErc721
deployEndemicErc721:
	npx hardhat run scripts/erc-721/deploy-endemic-erc721.js --network ${network}

.PHONY: deployMarketplace
deployMarketplace:
	npx hardhat run scripts/marketplace/deploy-marketplace.js --network ${network}

.PHONY: deployBeacon
deployBeacon:
	npx hardhat run scripts/erc-721/deploy-beacon.js --network ${network}

.PHONY: deployEndemicErc721Factory
deployEndemicErc721Factory:
	npx hardhat run scripts/erc-721/deploy-endemic-erc721-factory.js --network ${network}

.PHONY: deployOffer
deployOffer:
	npx hardhat run scripts/offer/deploy-offer.js --network ${network}

.PHONY: deployCollectionOffer
deployCollectionOffer:
	npx hardhat run scripts/offer/deploy-collection-offer.js --network ${network}

.PHONY: deployEndemicErc20
deployEndemicErc20:
	npx hardhat run scripts/erc-20/deploy-endemic-erc20.js --network ${network}

.PHONY: deployInitialERC1155
deployInitialERC1155:
	npx hardhat run scripts/erc-1155/deploy-erc1155-initial.js --network ${network}
	
.PHONY: deployERC1155Beacon
deployERC1155Beacon:
	npx hardhat run scripts/erc-1155/deploy-erc1155-beacon.js --network ${network}

.PHONY: deployERC1155Factory
deployERC1155Factory:
	npx hardhat run scripts/erc-1155/deploy-erc1155-factory.js --network ${network}

.PHONY: upgradeErc721
upgradeErc721:
	npx hardhat run scripts/erc-721/upgrade-erc721-proxy.js --network ${network}

.PHONY: upgradeMarketplace
upgradeMarketplace:
	npx hardhat run scripts/marketplace/upgrade-marketplace-proxy.js --network ${network}

.PHONY: upgradeFeeProvider
upgradeFeeProvider:
	npx hardhat run scripts/fee-provider/upgrade-fee-provider-proxy.js --network ${network}

.PHONY: upgradeOffer
upgradeOffer:
	npx hardhat run scripts/offer/upgrade-offer-proxy.js --network ${network}

.PHONY: verify
verify:
	npx hardhat verify --network ${network} ${address}