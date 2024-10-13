/// @author clowes.eth
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// Registry/Resolver all in one for Layer 2
/// @dev This contract works with ENSIP defined seletors, taking a labelhash as the keyed parameter
contract NFTRegistry is ERC721, AccessControl {
    function supportsInterface(
        bytes4 x
    ) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(x);
    }

    // ownership logic
    function _isExpired(uint256 token) internal view returns (bool) {
        return _expiries[token] < block.timestamp;
    }
    function _ownerOf(
        uint256 token
    ) internal view override(ERC721) returns (address owner) {
        owner = _isExpired(token) ? address(0) : super._ownerOf(token);
    }
    modifier onlyTokenOperator(uint256 token) {
        address owner = _ownerOf(uint256(token));
        if (owner != msg.sender && !isApprovedForAll(owner, msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    /// Errors
    error Unauthorized();
    error TokenExpired(uint256 token, uint64 expiry);

    /// Events
    event Registered(string indexed label, address owner);
    event TextChanged(uint256 indexed token, string indexed key, string value);
    event AddrChanged(
        uint256 indexed token,
        uint256 indexed coinType,
        bytes value
    );
    event ContenthashChanged(uint256 indexed token, bytes value);

    /// Structs to prevent stack too deep errors with multirecord updates
    struct Text {
        string key;
        string value;
    }
    struct Addr {
        uint256 coinType;
        bytes value;
    }
    struct Cointype {
        uint256 key;
        string value;
    }

    /// AccessControl roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    /// Constants
    uint256 constant COIN_TYPE_ETH = 60;

    /// Properties
    uint256 public totalSupply;
    string public baseUri;
    mapping(uint256 token => uint256) _expiries;
    mapping(uint256 token => mapping(string key => string)) _texts;
    mapping(uint256 token => mapping(uint256 coinType => bytes)) _addrs;
    mapping(uint256 token => bytes) _chashes;
    mapping(uint256 token => string) _labels;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseUri
    ) ERC721(_name, _symbol) {
        baseUri = _baseUri;

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseUri;
    }

    // function _update(
    //     address to,
    //     uint256 token,
    //     address auth
    // ) internal override(ERC721) returns (address ret) {
    //     ret = super._update(to, token, auth);
    // }

    /**
     * @dev Adds a registrar with the specified address.
     * Only a address with the ADMIN_ROLE can call this function.
     *
     * @param registrar The address of the registrar to be added.
     */
    function addRegistrar(address registrar) external onlyRole(ADMIN_ROLE) {
        _grantRole(REGISTRAR_ROLE, registrar);
    }

    /**
     * @dev Removes a registrar from the NftRegistry contract.
     * Only a `address with the ADMIN_ROLE can call this function.
     *
     * @param registrar The address of the registrar to be removed.
     */
    function removeRegistrar(address registrar) external onlyRole(ADMIN_ROLE) {
        _revokeRole(REGISTRAR_ROLE, registrar);
    }

    function register(
        string calldata label,
        address owner,
        uint256 expiry
    ) external onlyRole(REGISTRAR_ROLE) {
        uint256 token = uint256(keccak256(abi.encodePacked(label)));
        // This will fail if the node is already registered
        _safeMint(owner, token);
        _expiries[token] = expiry;
        _labels[token] = label;
        _setAddr(token, COIN_TYPE_ETH, abi.encodePacked(owner));
        totalSupply++;
        emit Registered(label, owner);
    }

    ////////////
    /// Getters
    ////////////

    /// Record level

    function addr(
        uint256 token,
        uint256 cointype
    ) external view returns (bytes memory) {
        return _isExpired(token) ? new bytes(0) : _addrs[token][cointype];
    }

    function text(
        uint256 token,
        string calldata key
    ) external view returns (string memory) {
        return _isExpired(token) ? "" : _texts[token][key];
    }

    function contenthash(uint256 token) external view returns (bytes memory) {
        return _isExpired(token) ? new bytes(0) : _chashes[token];
    }

    function getExpiry(uint256 token) public view returns (uint256 expiry) {
        return _isExpired(token) ? 0 : _expiries[token];
    }

    function available(uint256 token) external view returns (bool) {
        return _isExpired(token);
    }

    /// Utils to get a label from its labelhash
    function labelFor(uint256 token) external view returns (string memory) {
        return _labels[token];
    }

    ////////////
    /// Setters
    ////////////

    /// Contract level
    function setBaseURI(string memory _baseUri) external onlyRole(ADMIN_ROLE) {
        baseUri = _baseUri;
    }

    /// Record level
    function setAddr(
        uint256 token,
        uint256 coinType,
        bytes calldata value
    ) external onlyTokenOperator(token) {
        _setAddr(token, coinType, value);
    }
    function _setAddr(
        uint256 token,
        uint256 coinType,
        bytes memory value
    ) internal {
        _addrs[token][coinType] = value;
        emit AddrChanged(token, coinType, value);
    }

    function setText(
        uint256 token,
        string calldata key,
        string calldata value
    ) external onlyTokenOperator(token) {
        _setText(token, key, value);
    }
    function _setText(
        uint256 token,
        string calldata key,
        string calldata value
    ) internal {
        _texts[token][key] = value;
        emit TextChanged(token, key, value);
    }

    function setContenthash(
        uint256 token,
        bytes calldata value
    ) external onlyTokenOperator(token) {
        _setContenthash(token, value);
    }
    function _setContenthash(uint256 token, bytes calldata value) internal {
        _chashes[token] = value;
        emit ContenthashChanged(token, value);
    }

    function setExpiry(
        uint256 token,
        uint64 expiry
    ) public onlyRole(REGISTRAR_ROLE) {
        _expiries[token] = expiry;
    }

    function setRecords(
        uint256 token,
        Text[] calldata texts,
        Addr[] calldata addrs,
        bytes[] calldata chash
    ) external onlyTokenOperator(token) {
        for (uint256 i; i < texts.length; i += 1) {
            _setText(token, texts[i].key, texts[i].value);
        }
        for (uint256 i; i < addrs.length; i += 1) {
            _setAddr(token, addrs[i].coinType, addrs[i].value);
        }
        if (chash.length == 1) {
            _setContenthash(token, chash[0]);
        }
    }
}
