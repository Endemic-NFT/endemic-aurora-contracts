// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../fee/IFeeProvider.sol";
import "../royalties/IRoyaltiesProvider.sol";

error InvalidValueSent();
error InvalidTokenOwner();
error Accept();
error DurationTooShort();
error AcceptFromSelf();
error OfferExists();
error NoActiveOffer();

abstract contract OfferCore is
    PausableUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using AddressUpgradeable for address;

    uint256 public MIN_BID_DURATION;
    bytes4 public ERC721_Received;

    uint256 private nextOfferId;

    mapping(uint256 => Offer) internal offersById;

    // Offer by token address => token id => offerder => offerId
    mapping(address => mapping(uint256 => mapping(address => uint256)))
        internal offerIdsByBidder;

    address feeClaimAddress;

    IFeeProvider feeProvider;
    IRoyaltiesProvider royaltiesProvider;

    struct Offer {
        uint256 id;
        address nftContract;
        uint256 tokenId;
        address bidder;
        uint256 price;
        uint256 priceWithFee;
        uint256 expiresAt;
    }

    event OfferCreated(
        uint256 id,
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 price,
        uint256 expiresAt
    );

    event OfferAccepted(
        uint256 id,
        address indexed nftContract,
        uint256 indexed tokenId,
        address bidder,
        address indexed seller,
        uint256 price,
        uint256 totalFees
    );

    event OfferCancelled(
        uint256 id,
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed bidder
    );

    function __OfferCore___init_unchained(
        address _feeProvider,
        address _royaltiesProvider,
        address _feeClaimAddress
    ) internal initializer {
        feeProvider = IFeeProvider(_feeProvider);
        royaltiesProvider = IRoyaltiesProvider(_royaltiesProvider);
        feeClaimAddress = _feeClaimAddress;

        ERC721_Received = 0x150b7a02;
        MIN_BID_DURATION = 1 hours;

        nextOfferId = 1;
    }

    function placeOffer(
        address nftContract,
        uint256 tokenId,
        uint256 duration
    ) external payable whenNotPaused nonReentrant {
        if (msg.value <= 0) {
            revert InvalidValueSent();
        }

        IERC721 nft = IERC721(nftContract);
        address nftOwner = nft.ownerOf(tokenId);

        if (nftOwner == address(0) || nftOwner == _msgSender()) {
            revert InvalidTokenOwner();
        }

        if (duration < MIN_BID_DURATION) {
            revert DurationTooShort();
        }

        uint256 offerId = nextOfferId++;
        uint256 takerFee = feeProvider.getTakerFee(_msgSender());

        if (_offerderHasOffer(nftContract, tokenId, _msgSender())) {
            revert OfferExists();
        }

        uint256 price = (msg.value * (10000)) / (takerFee + 10000);
        uint256 expiresAt = block.timestamp + duration;

        offerIdsByBidder[nftContract][tokenId][_msgSender()] = offerId;
        offersById[offerId] = Offer({
            id: offerId,
            bidder: _msgSender(),
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            priceWithFee: msg.value,
            expiresAt: expiresAt
        });

        emit OfferCreated(
            offerId,
            nftContract,
            tokenId,
            _msgSender(),
            price,
            expiresAt
        );
    }

    function cancelOffer(uint256 offerId) external whenNotPaused nonReentrant {
        Offer memory offer = offersById[offerId];
        _cancelOffer(offer);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function acceptOffer(uint256 offerId) external whenNotPaused nonReentrant {
        Offer memory offer = offersById[offerId];

        require(
            offer.id == offerId && offer.expiresAt >= block.timestamp,
            "Invalid offer"
        );

        if (offer.bidder == _msgSender()) revert AcceptFromSelf();

        delete offersById[offer.id];
        delete offerIdsByBidder[offer.nftContract][offer.tokenId][offer.bidder];

        uint256 totalCut = _calculateCut(
            offer.nftContract,
            offer.tokenId,
            _msgSender(),
            offer.price,
            offer.priceWithFee
        );

        (
            address royaltiesRecipient,
            uint256 royaltiesCut
        ) = _calculateRoyalties(offer.nftContract, offer.tokenId, offer.price);

        // sale happened
        feeProvider.onInitialSale(offer.nftContract, offer.tokenId);

        // Transfer token to bidder
        IERC721(offer.nftContract).safeTransferFrom(
            _msgSender(),
            offer.bidder,
            offer.tokenId
        );

        // transfer fees
        if (totalCut > 0) {
            _transferFees(totalCut);
        }

        // transfer rolayties
        if (royaltiesCut > 0) {
            _transferRoyalties(royaltiesRecipient, royaltiesCut);
        }

        // Transfer ETH from bidder to seller
        _transferFundsToSeller(
            _msgSender(),
            offer.priceWithFee - totalCut - royaltiesCut
        );

        emit OfferAccepted(
            offerId,
            offer.nftContract,
            offer.tokenId,
            offer.bidder,
            _msgSender(),
            offer.price,
            totalCut
        );
    }

    function getOffer(uint256 offerId) external view returns (Offer memory) {
        Offer memory offer = offersById[offerId];
        if (offer.id != offerId) {
            revert NoActiveOffer();
        }
        return offer;
    }

    function _calculateCut(
        address _tokenAddress,
        uint256 _tokenId,
        address _seller,
        uint256 price,
        uint256 priceWithFee
    ) internal view returns (uint256) {
        uint256 makerFee = feeProvider.getMakerFee(
            _seller,
            _tokenAddress,
            _tokenId
        );
        uint256 takerCut = priceWithFee - price;
        uint256 makerCut = (price * makerFee) / (10000);

        return makerCut + takerCut;
    }

    function _calculateRoyalties(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 price
    ) internal view returns (address recipient, uint256 royaltiesCut) {
        (address account, uint256 royaltiesFee) = royaltiesProvider
            .getRoyalties(_tokenAddress, _tokenId);

        return (account, (price * royaltiesFee) / 10000);
    }

    function _transferFees(uint256 _totalCut) internal {
        (bool feeSuccess, ) = payable(feeClaimAddress).call{value: _totalCut}(
            ""
        );
        require(feeSuccess, "Fee Transfer failed.");
    }

    function _transferRoyalties(
        address _royaltiesRecipient,
        uint256 _royaltiesCut
    ) internal {
        (bool royaltiesSuccess, ) = payable(_royaltiesRecipient).call{
            value: _royaltiesCut
        }("");
        require(royaltiesSuccess, "Royalties Transfer failed.");
    }

    function _transferFundsToSeller(address _seller, uint256 _total) internal {
        (bool success, ) = payable(_seller).call{value: _total}("");
        require(success, "Transfer failed.");
    }

    function removeExpiredOffers(
        address[] memory _tokenAddresses,
        uint256[] memory _tokenIds,
        address[] memory _offerders
    ) public onlyOwner nonReentrant {
        uint256 loopLength = _tokenAddresses.length;

        require(
            loopLength == _tokenIds.length,
            "Parameter arrays should have the same length"
        );
        require(
            loopLength == _offerders.length,
            "Parameter arrays should have the same length"
        );

        for (uint256 i = 0; i < loopLength; i++) {
            _removeExpiredOffer(
                _tokenAddresses[i],
                _tokenIds[i],
                _offerders[i]
            );
        }
    }

    function _removeExpiredOffer(
        address nftContract,
        uint256 tokenId,
        address offerder
    ) internal {
        uint256 offerId = offerIdsByBidder[nftContract][tokenId][offerder];
        Offer memory offer = offersById[offerId];

        require(
            offer.expiresAt < block.timestamp,
            "The offer to remove should be expired"
        );

        _cancelOffer(offer);
    }

    function _cancelOffer(Offer memory offer) internal {
        delete offersById[offer.id];
        delete offerIdsByBidder[offer.nftContract][offer.tokenId][offer.bidder];

        (bool success, ) = payable(offer.bidder).call{
            value: offer.priceWithFee
        }("");
        require(success, "Refund failed.");

        emit OfferCancelled(
            offer.id,
            offer.nftContract,
            offer.tokenId,
            offer.bidder
        );
    }

    function _offerderHasOffer(
        address nftContract,
        uint256 tokenId,
        address bidder
    ) internal view returns (bool) {
        uint256 offerId = offerIdsByBidder[nftContract][tokenId][bidder];
        Offer memory offer = offersById[offerId];
        return offer.bidder == bidder;
    }

    uint256[50] private __gap;
}
