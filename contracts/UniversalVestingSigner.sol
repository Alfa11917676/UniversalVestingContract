//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
contract UniversalVestingSigner is EIP712{

    string private constant SIGNING_DOMAIN = "Vesting";
    string private constant SIGNATURE_VERSION = "1";

    struct Vesting{
        address userAddress;
        uint amount;
        uint saleType;
        uint nonce;
        bytes signature;
    }

    constructor() EIP712(SIGNING_DOMAIN,SIGNATURE_VERSION){}
//    function cons() internal initializer {
//        __EIP712_init(SIGNING_DOMAIN, SIGNATURE_VERSION);
//    }

    function getSigner(Vesting memory vest) public view returns(address){
        return _verify(vest);
    }

    /// @notice Returns a hash of the given rarity, prepared using EIP712 typed data hashing rules.

    function _hash(Vesting memory vest) internal view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
                keccak256("Vesting(address userAddress,uint256 amount,uint256 saleType,uint256 nonce)"),
                    vest.userAddress,
                    vest.amount,
                    vest.saleType,
                    vest.nonce
            )));
    }

    function _verify(Vesting memory vest) internal view returns (address) {
        bytes32 digest = _hash(vest);
        return ECDSA.recover(digest, vest.signature);
    }

}