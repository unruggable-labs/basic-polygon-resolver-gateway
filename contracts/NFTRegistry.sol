/// @author clowes.eth
/// @author raffy.eth
/// @company Unruggable
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Registry/Resolver All-in-one (for Layer 2)
/// @dev The resolution functions works with standard selectors, switching out node for labelhash
contract NFTRegistry is ERC721, AccessControl {
    function supportsInterface(
        bytes4 x
    ) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(x);
    }

    // ownership logic
    function _isExpired(bytes32 labelhash) internal view returns (bool) {
        return _expiries[labelhash] < block.timestamp;
    }
    function _ownerOf(
        uint256 tokenId
    ) internal view override(ERC721) returns (address owner) {
        owner = _isExpired(bytes32(tokenId)) ? address(0) : super._ownerOf(tokenId);
    }
    modifier onlyTokenOperator(bytes32 labelhash) {
        address owner = _ownerOf(uint256(labelhash));
        if (owner != msg.sender && !isApprovedForAll(owner, msg.sender)) {
            revert Unauthorized();
        }
        _;
    }

    // Errors
    error Unauthorized();
    error TokenExpired(bytes32 labelhash, uint64 expiry);

    // Events
    event Registered(string indexed label, address owner);
    event TextChanged(bytes32 indexed labelhash, string indexed key, string value);
    event AddrChanged(
        bytes32 indexed labelhash,
        uint256 indexed coinType,
        bytes value
    );
    event ContenthashChanged(bytes32 indexed labelhash, bytes value);

    // Structs to prevent stack too deep errors with multirecord updates
    struct Text {
        string key;
        string value;
    }
    struct Addr {
        uint256 coinType;
        bytes value;
    }

    // AccessControl roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    // Constants
    uint256 constant COIN_TYPE_ETH = 60;

    // Properties
    uint256 public totalSupply;
    string public baseUri;
    mapping(bytes32 labelhash => uint256) _expiries;
    mapping(bytes32 labelhash => mapping(string key => string)) _texts;
    mapping(bytes32 labelhash => mapping(uint256 coinType => bytes)) _addrs;
    mapping(bytes32 labelhash => bytes) _chashes;
    mapping(bytes32 labelhash => string) _labels;

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
        bytes32 labelhash = keccak256(abi.encodePacked(label));
        uint256 tokenId = uint256(labelhash);
        // This will fail if the node is already registered
        _safeMint(owner, tokenId);
        _expiries[labelhash] = expiry;
        _labels[labelhash] = label;
        _setAddr(labelhash, COIN_TYPE_ETH, abi.encodePacked(owner));
        totalSupply++;
        emit Registered(label, owner);
    }

    //
    // Getters
    //

    // Record level

    function addr(bytes32 labelhash) public view returns (address) {
        return address(uint160(bytes20(_addr(labelhash, COIN_TYPE_ETH))));
    }

    function addr(
        bytes32 labelhash,
        uint256 cointype
    ) external view returns (bytes memory) {
        return _addr(labelhash, cointype);
    }

    function _addr(
        bytes32 labelhash,
        uint256 cointype
    ) internal view returns (bytes memory) {

        return _isExpired(labelhash) ? new bytes(0) : _addrs[labelhash][cointype];
    }

    function text(
        bytes32 labelhash,
        string calldata key
    ) external view returns (string memory) {
        return _isExpired(labelhash) ? "" : _texts[labelhash][key];
    }

    function contenthash(bytes32 labelhash) external view returns (bytes memory) {
        return _isExpired(labelhash) ? new bytes(0) : _chashes[labelhash];
    }

    function getExpiry(bytes32 labelhash) public view returns (uint256 expiry) {
        return _isExpired(labelhash) ? 0 : _expiries[labelhash];
    }

    function available(bytes32 labelhash) external view returns (bool) {
        return _isExpired(labelhash);
    }

    // Utils to get a label from its labelhash
    function labelFor(bytes32 labelhash) external view returns (string memory) {
        return _labels[labelhash];
    }

    //
    // Setters
    //

    // Contract level
    function setBaseURI(string memory _baseUri) external onlyRole(ADMIN_ROLE) {
        baseUri = _baseUri;
    }

    // Record level
    function setAddr(
        bytes32 labelhash,
        uint256 coinType,
        bytes calldata value
    ) external onlyTokenOperator(labelhash) {
        _setAddr(labelhash, coinType, value);
    }
    function _setAddr(
        bytes32 labelhash,
        uint256 coinType,
        bytes memory value
    ) internal {
        _addrs[labelhash][coinType] = value;
        emit AddrChanged(labelhash, coinType, value);
    }

    function setText(
        bytes32 labelhash,
        string calldata key,
        string calldata value
    ) external onlyTokenOperator(labelhash) {
        _setText(labelhash, key, value);
    }
    function _setText(
        bytes32 labelhash,
        string calldata key,
        string calldata value
    ) internal {
        _texts[labelhash][key] = value;
        emit TextChanged(labelhash, key, value);
    }

    function setContenthash(
        bytes32 labelhash,
        bytes calldata value
    ) external onlyTokenOperator(labelhash) {
        _setContenthash(labelhash, value);
    }
    function _setContenthash(bytes32 labelhash, bytes calldata value) internal {
        _chashes[labelhash] = value;
        emit ContenthashChanged(labelhash, value);
    }

    function setExpiry(
        bytes32 labelhash,
        uint64 expiry
    ) public onlyRole(REGISTRAR_ROLE) {
        _expiries[labelhash] = expiry;
    }

    function setRecords(
        bytes32 labelhash,
        Text[] calldata texts,
        Addr[] calldata addrs,
        bytes[] calldata chash
    ) external onlyTokenOperator(labelhash) {
        for (uint256 i; i < texts.length; i += 1) {
            _setText(labelhash, texts[i].key, texts[i].value);
        }
        for (uint256 i; i < addrs.length; i += 1) {
            _setAddr(labelhash, addrs[i].coinType, addrs[i].value);
        }
        if (chash.length == 1) {
            _setContenthash(labelhash, chash[0]);
        }
    }
}
