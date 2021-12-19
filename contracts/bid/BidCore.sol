// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "../erc-721/IERC721.sol";
import "../erc-721/IEndemicMasterNFT.sol";

abstract contract BidCore is PausableUpgradeable, OwnableUpgradeable {
    using SafeMathUpgradeable for uint256;
    using AddressUpgradeable for address;

    uint256 public MAX_BID_DURATION;
    uint256 public MIN_BID_DURATION;
    bytes4 public ERC721_Received;

    // Bid count by token address => token id => bid counts
    mapping(address => mapping(uint256 => uint256)) public bidCounterByToken;
    // Index of the bid at bidsByToken mapping by bid id => bid index
    mapping(bytes32 => uint256) public bidIndexByBidId;
    // Bid id by token address => token id => bidder address => bidId
    mapping(address => mapping(uint256 => mapping(address => bytes32)))
        public bidIdByTokenAndBidder;
    // Bid by token address => token id => bid index => bid
    mapping(address => mapping(uint256 => mapping(uint256 => Bid)))
        internal bidsByToken;

    uint256 public fee;
    address public feeClaimAddress;

    address masterNFTAddress;

    struct Bid {
        bytes32 id;
        address nftContract;
        uint256 tokenId;
        address bidder;
        uint256 price;
        uint256 expiresAt;
    }

    event BidCreated(
        bytes32 id,
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 price,
        uint256 expiresAt
    );

    event BidAccepted(
        bytes32 id,
        address indexed nftContract,
        uint256 indexed tokenId,
        address bidder,
        address indexed seller,
        uint256 price
    );

    event BidCancelled(
        bytes32 id,
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed bidder
    );

    function __BidCore___init_unchained(
        uint256 _fee,
        address _masterNFTAddress,
        address _feeClaimAddress
    ) internal initializer {
        fee = _fee;
        feeClaimAddress = _feeClaimAddress;
        masterNFTAddress = _masterNFTAddress;

        ERC721_Received = 0x150b7a02;
        MAX_BID_DURATION = 182 days;
        MIN_BID_DURATION = 1 minutes;
    }

    function placeBid(
        address nftContract,
        uint256 tokenId,
        uint256 duration
    ) external payable whenNotPaused {
        require(msg.value > 0, "Invalid value sent");

        IERC721 nft = IERC721(nftContract);
        address nftOwner = nft.ownerOf(tokenId);

        require(
            nftOwner != address(0) && nftOwner != _msgSender(),
            "Token is burned or owned by the sender"
        );

        require(duration >= MIN_BID_DURATION, "Bid duration too short");
        require(duration <= MAX_BID_DURATION, "Bid duration too long");

        uint256 expiresAt = block.timestamp.add(duration);

        bytes32 bidId = keccak256(
            abi.encodePacked(
                block.timestamp,
                _msgSender(),
                nftContract,
                tokenId,
                msg.value,
                duration
            )
        );

        uint256 bidIndex;

        require(
            !_bidderHasBid(nftContract, tokenId, _msgSender()),
            "Bid already exists"
        );

        bidIndex = bidCounterByToken[nftContract][tokenId];
        bidCounterByToken[nftContract][tokenId]++;

        bidsByToken[nftContract][tokenId][bidIndex] = Bid({
            id: bidId,
            bidder: _msgSender(),
            nftContract: nftContract,
            tokenId: tokenId,
            price: msg.value,
            expiresAt: expiresAt
        });

        emit BidCreated(
            bidId,
            nftContract,
            tokenId,
            _msgSender(),
            msg.value,
            expiresAt
        );
    }

    function getBidByBidder(
        address nftContract,
        uint256 tokenId,
        address _bidder
    )
        public
        view
        returns (
            uint256 bidIndex,
            bytes32 bidId,
            address bidder,
            uint256 price,
            uint256 expiresAt
        )
    {
        bidId = bidIdByTokenAndBidder[nftContract][tokenId][_bidder];
        bidIndex = bidIndexByBidId[bidId];
        (bidId, bidder, price, expiresAt) = getBidByToken(
            nftContract,
            tokenId,
            bidIndex
        );
        if (_bidder != bidder) {
            revert("Bidder has not an active bid for this token");
        }
    }

    function getBidByToken(
        address nftContract,
        uint256 tokenId,
        uint256 index
    )
        public
        view
        returns (
            bytes32,
            address,
            uint256,
            uint256
        )
    {
        Bid memory bid = _getBid(nftContract, tokenId, index);
        return (bid.id, bid.bidder, bid.price, bid.expiresAt);
    }

    function cancelBid(address nftContract, uint256 tokenId)
        external
        whenNotPaused
    {
        (uint256 bidIndex, bytes32 bidId, , uint256 price, ) = getBidByBidder(
            nftContract,
            tokenId,
            _msgSender()
        );

        _cancelBid(bidIndex, bidId, nftContract, tokenId, _msgSender(), price);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getFee(address actor) public view returns (uint256) {
        if (IEndemicMasterNFT(masterNFTAddress).balanceOf(actor) > 0) {
            return 0;
        }

        return fee;
    }

    function onERC721Received(
        address _from,
        address, /*_to*/
        uint256 _tokenId,
        bytes memory _data
    ) public whenNotPaused returns (bytes4) {
        bytes32 bidId = _bytesToBytes32(_data);
        uint256 bidIndex = bidIndexByBidId[bidId];

        Bid memory bid = _getBid(_msgSender(), _tokenId, bidIndex);

        require(
            bid.id == bidId && bid.expiresAt >= block.timestamp,
            "Invalid bid"
        );

        address bidder = bid.bidder;
        uint256 price = bid.price;

        delete bidsByToken[_msgSender()][_tokenId][bidIndex];
        delete bidIndexByBidId[bidId];
        delete bidIdByTokenAndBidder[_msgSender()][_tokenId][bidder];

        delete bidCounterByToken[_msgSender()][_tokenId];

        // Transfer token to bidder
        IERC721(_msgSender()).safeTransferFrom(address(this), bidder, _tokenId);

        uint256 saleShareAmount = 0;
        uint256 transactionFee = getFee(_from);

        if (transactionFee > 0) {
            saleShareAmount = price.mul(transactionFee).div(10000);

            (bool feeSuccess, ) = payable(feeClaimAddress).call{
                value: saleShareAmount
            }("");
            require(feeSuccess, "Fee Transfer failed.");
        }

        uint256 sellerProceeds = price.sub(saleShareAmount);

        // Transfer ETH from bidder to seller
        (bool success, ) = payable(_from).call{value: sellerProceeds}("");
        require(success, "Transfer failed.");

        emit BidAccepted(bidId, msg.sender, _tokenId, bidder, _from, price);

        return ERC721_Received;
    }

    function removeExpiredBids(
        address[] memory _tokenAddresses,
        uint256[] memory _tokenIds,
        address[] memory _bidders
    ) public {
        uint256 loopLength = _tokenAddresses.length;

        require(
            loopLength == _tokenIds.length,
            "Parameter arrays should have the same length"
        );
        require(
            loopLength == _bidders.length,
            "Parameter arrays should have the same length"
        );

        for (uint256 i = 0; i < loopLength; i++) {
            _removeExpiredBid(_tokenAddresses[i], _tokenIds[i], _bidders[i]);
        }
    }

    function _removeExpiredBid(
        address nftContract,
        uint256 tokenId,
        address bidder
    ) internal {
        (
            uint256 bidIndex,
            bytes32 bidId,
            ,
            uint256 price,
            uint256 expiresAt
        ) = getBidByBidder(nftContract, tokenId, bidder);

        require(
            expiresAt < block.timestamp,
            "The bid to remove should be expired"
        );

        _cancelBid(bidIndex, bidId, nftContract, tokenId, bidder, price);
    }

    function _cancelBid(
        uint256 bidIndex,
        bytes32 bidId,
        address nftContract,
        uint256 tokenId,
        address bidder,
        uint256 price
    ) internal {
        // Delete bid references
        delete bidIndexByBidId[bidId];
        delete bidIdByTokenAndBidder[nftContract][tokenId][bidder];

        // Check if the bid is at the end of the mapping
        uint256 lastBidIndex = bidCounterByToken[nftContract][tokenId].sub(1);
        if (lastBidIndex != bidIndex) {
            // Move last bid to the removed place
            Bid storage lastBid = bidsByToken[nftContract][tokenId][
                lastBidIndex
            ];
            bidsByToken[nftContract][tokenId][bidIndex] = lastBid;
            bidIndexByBidId[lastBid.id] = bidIndex;
        }

        delete bidsByToken[nftContract][tokenId][lastBidIndex];
        bidCounterByToken[nftContract][tokenId]--;

        (bool success, ) = payable(bidder).call{value: price}("");
        require(success, "Refund failed.");

        emit BidCancelled(bidId, nftContract, tokenId, bidder);
    }

    function _getBid(
        address nftContract,
        uint256 tokenId,
        uint256 index
    ) internal view returns (Bid memory) {
        require(
            index < bidCounterByToken[nftContract][tokenId],
            "Invalid index"
        );
        return bidsByToken[nftContract][tokenId][index];
    }

    function _bidderHasBid(
        address nftContract,
        uint256 tokenId,
        address bidder
    ) internal view returns (bool) {
        bytes32 bidId = bidIdByTokenAndBidder[nftContract][tokenId][bidder];
        uint256 bidIndex = bidIndexByBidId[bidId];

        if (bidIndex < bidCounterByToken[nftContract][tokenId]) {
            Bid memory bid = bidsByToken[nftContract][tokenId][bidIndex];
            return bid.bidder == bidder;
        }
        return false;
    }

    function _bytesToBytes32(bytes memory data)
        internal
        pure
        returns (bytes32)
    {
        require(data.length == 32, "The data should be 32 bytes length");

        bytes32 bidId;
        assembly {
            bidId := mload(add(data, 0x20))
        }

        return bidId;
    }

    uint256[50] private __gap;
}
