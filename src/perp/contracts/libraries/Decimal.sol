// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

import { SignedDecimal } from "./SignedDecimal.sol";

library Decimal {

    struct D256 {
        uint256 value;
    }

    function zero() internal pure returns (D256 memory) {
        return D256({ value: 0 });
    }

    function one() internal pure returns (D256 memory) {
        return D256({ value: 10**18 });
    }

    function d256(uint256 _value) internal pure returns (D256 memory) {
        return D256({ value: _value });
    }

    function add(D256 memory self, D256 memory b) internal pure returns (D256 memory) {
        return D256({ value: self.value + b.value });
    }

    function sub(D256 memory self, D256 memory b) internal pure returns (D256 memory) {
        return D256({ value: self.value - b.value });
    }

    function mul(D256 memory self, uint256 b) internal pure returns (D256 memory) {
        return D256({ value: self.value * b });
    }

    function div(D256 memory self, uint256 b) internal pure returns (D256 memory) {
        return D256({ value: self.value / b });
    }

    function mulD(D256 memory self, D256 memory b) internal pure returns (D256 memory) {
        return D256({ value: self.value * b.value / 10**18 });
    }

    function divD(D256 memory self, D256 memory b) internal pure returns (D256 memory) {
        return D256({ value: self.value * 10**18 / b.value });
    }

    function isZero(D256 memory self) internal pure returns (bool) {
        return self.value == 0;
    }

    function gte(D256 memory self, D256 memory b) internal pure returns (bool) {
        return self.value >= b.value;
    }

    function lte(D256 memory self, D256 memory b) internal pure returns (bool) {
        return self.value <= b.value;
    }

    function gt(D256 memory self, D256 memory b) internal pure returns (bool) {
        return self.value > b.value;
    }

    function lt(D256 memory self, D256 memory b) internal pure returns (bool) {
        return self.value < b.value;
    }

    function toSigned(D256 memory self) internal pure returns (SignedDecimal.S256 memory) {
        return SignedDecimal.s256(int256(self.value));
    }
}
