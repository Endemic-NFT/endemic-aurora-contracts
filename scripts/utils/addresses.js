const aurora_testnet = {
  contractRegistryProxy: '0x1BE1744a1d718C1E42dA5BD1e79639Ae6DFbEb58',
  endemicMasterKeyProxy: '0x6D27C84EC245A7865718e1CDb7D1aE0EF4B6f08E',
  feeProviderProxy: '0xb00BB669eb0953144caE73cf4049F59B6d358203',
  royaltiesProviderProxy: '0xe34Ec7b3A3aB22B2422a37ad6726E7A76e5C2787',
  endemicNftProxy: '0x599F825A6cBAdA1c8eB972F2ebb6780576d11B96',
  endemicCollection: '0x1F081B956f670D0fbf6d02b0439e802540bA1aBD',
  marketplaceProxy: '0x74f43bE6944154CF4da1731E3ad472dFe34E372B',
  endemicNftBeacon: '0xaFf28326DB64f2f02a7788A047E525B047c0A525',
  endemicNftFactory: '0xFe7F3f28b5963b5447ECb37F1d9710f453BDFB21',
  bidProxy: '0x247001fBCE8166ECDeD545a1a52E52041838f87C',
  contractImporter: '0x44317C983Ada8176801B40f98650cf1A1c3E4DcC',
  artMinter: '0xa82aF2fb626752171e8BeC3c652fB881EB9297db',

  endemicErc20: '',

  endemicERC1155Proxy: '',
  endemicERC1155Beacon: '',
  endemicERC1155Factory: '',
};

const aurora = {
  contractRegistryProxy: '0xB2d6c6D02f9b6C68c8Aa5fdb455f0feB008D3107',
  endemicMasterKeyProxy: '0x97cb197f862173a0f4c0B9Fda3272b56464578cc',
  feeProviderProxy: '0x3853676279Ada77826afDEdE6a815D5250A1867A',
  royaltiesProviderProxy: '0xE6a3541995E78600A949049C41A1C310634C57cc',
  endemicNftProxy: '0xCd75e540157E04b0a7f1E347d21dED2FF748AD0f',
  endemicCollection: '0x329b61bF16aDd14863c1C154614888F14303169c',
  endemicNftBeacon: '0xAfAF30cB1215e344088296e058c7694bAeBAe1E9',
  marketplaceProxy: '0x2f6A8241d4F34EA22B9c122bE9DDdFDaaf3121E7',
  endemicNftFactory: '0x7e4fD7d4bb0e31A14B76a396F840b6FE08A51da3',
  bidProxy: '',
  contractImporter: '0x427f522121534EB79d40Cbeeb5C62e172c05979d',
  artMinter: '0x6B7340fDd8974b3fa275C51Fb5074f8774dC8d8f',

  endemicErc20: '',

  endemicERC1155Proxy: '',
  endemicERC1155Beacon: '',
  endemicERC1155Factory: '',
};

const networks = {
  aurora_testnet,
  aurora,
};

const getForNetwork = (network) => networks[network];

exports.getForNetwork = getForNetwork;
