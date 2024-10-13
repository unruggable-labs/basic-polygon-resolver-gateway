/// @author clowes.eth, raffy.eth
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// https://github.com/ensdomains/ens-contracts/blob/staging/contracts/resolvers/profiles/IExtendedResolver.sol
interface IExtendedResolver {
    function resolve(
        bytes calldata,
        bytes calldata
    ) external view returns (bytes memory);
}

// https://github.com/ensdomains/ens-contracts/blob/staging/contracts/registry/ENS.sol
interface ENS {
    function owner(bytes32 node) external view returns (address);
}

// https://github.com/ensdomains/ens-contracts/blob/staging/contracts/reverseRegistrar/IReverseRegistrar.sol
interface IReverseRegistrar {
    function claim(address owner) external;
}
// https://adraffy.github.io/keccak.js/test/demo.html#algo=namehash&s=addr.reverse&escape=1&encoding=utf8
bytes32 constant ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;

// https://eips.ethereum.org/EIPS/eip-3668
error OffchainLookup(
    address sender,
    string[] urls,
    bytes callData,
    bytes4 callbackFunction,
    bytes extraData
);

contract PolygonResolver is Ownable, IERC165, IExtendedResolver {
    event GatewayChanged();

    error CCIPReadExpired(uint256 t); // ccip response is stale
    error CCIPReadUntrusted(address signed);

    string[] _urls;
    mapping(address signer => bool allow) _signers;

    constructor() Ownable(msg.sender) {}

    function claim(ENS ens) external onlyOwner {
        address owner = ens.owner(ADDR_REVERSE_NODE);
        if (owner != address(0)) {
            IReverseRegistrar(owner).claim(msg.sender);
        }
    }

    function supportsInterface(bytes4 x) external pure returns (bool) {
        return
            x == type(IERC165).interfaceId ||
            x == type(IExtendedResolver).interfaceId;
    }

    function setSigner(address signer, bool allow) external onlyOwner {
        _signers[signer] = allow;
        emit GatewayChanged();
    }

    function setGatewayURLs(string[] memory urls) external onlyOwner {
        _urls = urls;
        emit GatewayChanged();
    }

    function gatewayURLs() external view returns (string[] memory) {
        return _urls;
    }

    function resolve(
        bytes calldata /*name*/,
        bytes calldata /*data*/
    ) external view returns (bytes memory) {
        revert OffchainLookup(
            address(this),
            _urls,
            msg.data,
            this.resolveCallback.selector,
            msg.data
        );
    }

    function resolveCallback(
        bytes calldata ccip,
        bytes calldata request
    ) external view returns (bytes memory) {
        (bytes memory response, uint64 expires, bytes memory sig) = abi.decode(
            ccip,
            (bytes, uint64, bytes)
        );
        if (expires < block.timestamp) revert CCIPReadExpired(expires);
        bytes32 hash = keccak256(
            abi.encodePacked(
                hex"1900",
                address(this),
                expires,
                keccak256(request),
                keccak256(response)
            )
        );
        address signed = ECDSA.recover(hash, sig);
        if (!_signers[signed]) revert CCIPReadUntrusted(signed);
        return response;
    }
}
