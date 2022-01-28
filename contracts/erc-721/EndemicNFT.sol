// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "./ERC721Base.sol";

contract EndemicNFT is ERC721Base {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _tokenIdCounter;

    function __EndemicNFT_init(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) external initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC721_init_unchained(name, symbol);
        __ERC721Enumerable_init_unchained();
        __ERC721Burnable_init_unchained();
        __ERC721URIStorage_init_unchained();
        __Ownable_init_unchained();

        _setBaseURI(baseTokenURI);
    }

    event Mint(uint256 indexed tokenId, address artistId);

    function mint(address recipient, string calldata tokenURI)
        external
        returns (bool)
    {
        require(
            _msgSender() == owner() || isApprovedForAll(owner(), _msgSender()),
            "mint caller is not owner nor approved"
        );

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit Mint(tokenId, owner());

        return true;
    }

    uint256[50] private __gap;
}
