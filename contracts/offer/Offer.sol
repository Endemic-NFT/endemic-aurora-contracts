// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./OfferCore.sol";
import "../fee/IFeeProvider.sol";
import "../royalties/IRoyaltiesProvider.sol";

contract Offer is OfferCore {
    /// @param _feeProvider - fee provider contract
    /// @param _feeClaimAddress - address to claim fee
    ///  between 0-10,000.
    function __Offer_init(
        address _feeProvider,
        address _royaltiesProvider,
        address _feeClaimAddress
    ) external initializer {
        require(_feeClaimAddress != address(0));

        __Context_init_unchained();
        __Pausable_init_unchained();
        __Ownable_init_unchained();
        __OfferCore___init_unchained(
            _feeProvider,
            _royaltiesProvider,
            _feeClaimAddress
        );
    }

    uint256[50] private __gap;
}
