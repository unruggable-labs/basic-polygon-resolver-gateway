// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract PolygonResolver {

    error OffchainLookup(address sender, string[] urls, bytes callData, bytes4 callbackFunction, bytes extraData);

    uint constant private COIN_TYPE_ETH = 60;

    /// ERC-165 => Standard Interface Detection
    /// supportsInterface(bytes4)
    bytes4 constant private INTERFACE_ID_ERC_165 = 0x01ffc9a7;

    /// ENSIP-10 => Wildcard Resolution
    /// resolve(bytes calldata name, bytes calldata data) external view returns(bytes)
    /// https://ethtools.com/interface-database/IExtendedResolver
    bytes4 constant private INTERFACE_ID_ENSIP_10 = 0x9061b923;

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
     * Implemented as part of the ERC165 interface => Standard Interface Detection
     * https://ethtools.com/interface-database/ERC165
     * https://eips.ethereum.org/EIPS/eip-165
     */
    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
		return interfaceID == INTERFACE_ID_ERC_165 
        || interfaceID == INTERFACE_ID_ENSIP_10;
        //|| interfaceID == 0xbc1c58d1;
	}
 
    
    /**
     * Implemented as part of the IExtendedResolver interface defined in ENSIP-10 => Wildcard Resolution
     * https://ethtools.com/interface-database/IExtendedResolver
     * ENSIP-10 - https://docs.ens.domains/ensip/10
     */
    function resolve(bytes calldata name, bytes calldata data) external view returns(bytes memory) {

        string[] memory urls = new string[](1);
        urls[0] = gatewayUrl;
        revert OffchainLookup(
            address(this),
            urls,
            data,
            PolygonResolver.resolveCallback.selector,
            data
        );
    }


    /**
     */
    function resolveCallback(bytes calldata response, bytes calldata extraData) external view returns(bytes memory) {

        bytes4 selector = bytes4(extraData[:4]);

        //if (selector == )
        return response;
    }
}