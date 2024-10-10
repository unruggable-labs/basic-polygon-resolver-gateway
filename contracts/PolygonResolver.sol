// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// L1 Resolver for resolving names from Polygon using the 'simple polygon resolver'
/// @author clowes.eth
contract PolygonResolver {
    error OffchainLookup(
        address sender,
        string[] urls,
        bytes callData,
        bytes4 callbackFunction,
        bytes extraData
    );

    uint private constant COIN_TYPE_ETH = 60;

    /// ERC-165 => Standard Interface Detection
    /// supportsInterface(bytes4)
    bytes4 private constant INTERFACE_ID_ERC_165 = 0x01ffc9a7;

    /// ENSIP-10 => Wildcard Resolution
    /// resolve(bytes calldata name, bytes calldata data) external view returns(bytes)
    /// https://ethtools.com/interface-database/IExtendedResolver
    bytes4 private constant INTERFACE_ID_ENSIP_10 = 0x9061b923;

    string public gatewayUrl;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized");
        _;
    }

    constructor(string memory _gatewayUrl) {
        gatewayUrl = _gatewayUrl;
        owner = msg.sender;
    }

    /**
     * @dev Allows the owner to change the gateway URL
     * @param _newGatewayUrl The new gateway URL to set
     */
    function setGatewayUrl(string memory _newGatewayUrl) external onlyOwner {
        gatewayUrl = _newGatewayUrl;
    }

    /**
     * Implemented as part of the ERC165 interface => Standard Interface Detection
     * https://ethtools.com/interface-database/ERC165
     * https://eips.ethereum.org/EIPS/eip-165
     */
    function supportsInterface(
        bytes4 interfaceID
    ) external pure returns (bool) {
        return
            interfaceID == INTERFACE_ID_ERC_165 ||
            interfaceID == INTERFACE_ID_ENSIP_10;
        //|| interfaceID == 0xbc1c58d1;
    }

    /**
     * Implemented as part of the IExtendedResolver interface defined in ENSIP-10 => Wildcard Resolution
     * https://ethtools.com/interface-database/IExtendedResolver
     * ENSIP-10 - https://docs.ens.domains/ensip/10
     */
    function resolve(
        bytes calldata name,
        bytes calldata data
    ) external view returns (bytes memory) {
        (bytes32 labelhash, uint256 _nIdx) = readLabel(name, 0);

        string[] memory urls = new string[](1);
        urls[0] = gatewayUrl;
        revert OffchainLookup(
            address(this),
            urls,
            abi.encode(labelhash, data),
            PolygonResolver.resolveCallback.selector,
            name
        );
    }

    /**
     */
    function resolveCallback(
        bytes calldata response,
        bytes calldata extraData
    ) external view returns (bytes memory) {
        return response;
    }

    /*
     * @dev Returns the keccak-256 hash of a byte range.
     * @param self The byte string to hash.
     * @param offset The position to start hashing at.
     * @param len The number of bytes to hash.
     * @return The hash of the byte range.
     */
    function keccak(
        bytes memory self,
        uint256 offset,
        uint256 len
    ) internal pure returns (bytes32 ret) {
        require(offset + len <= self.length);
        assembly {
            ret := keccak256(add(add(self, 32), offset), len)
        }
    }

    /**
     * @dev Returns the keccak-256 hash of a DNS-encoded label, and the offset to the start of the next label.
     * @param self The byte string to read a label from.
     * @param idx The index to read a label at.
     * @return labelhash The hash of the label at the specified index, or 0 if it is the last label.
     * @return newIdx The index of the start of the next label.
     */
    function readLabel(
        bytes memory self,
        uint256 idx
    ) internal pure returns (bytes32 labelhash, uint256 newIdx) {
        require(idx < self.length, "readLabel: Index out of bounds");
        uint256 len = uint256(uint8(self[idx]));
        if (len > 0) {
            labelhash = keccak(self, idx + 1, len);
        } else {
            labelhash = bytes32(0);
        }
        newIdx = idx + len + 1;
    }
}
