// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../erc-721/IERC721.sol";

contract ArtMinter is OwnableUpgradeable {
    function __ArtMinter_init() external initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
    }

    struct MintData {
        address recipient;
        string tokenURI;
    }

    function mint(address contractAddress, MintData[] calldata data)
        external
        onlyOwner
    {
        IERC721 targetContract = IERC721(contractAddress);

        for (uint256 i = 0; i < data.length; i++) {
            targetContract.mint(data[i].recipient, data[i].tokenURI);
        }
    }

    uint256[50] private __gap;
}
