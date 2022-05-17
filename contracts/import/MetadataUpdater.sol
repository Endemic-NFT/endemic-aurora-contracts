// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MetadataUpdater is Ownable {
    event UpdateMetadata(string[] ids);

    function updateMetadata(string[] memory ids) external onlyOwner {
        emit UpdateMetadata(ids);
    }
}
