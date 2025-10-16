// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

import { Decimal } from "./Decimal.sol";

library SignedDecimal {
    struct S256 {
        int256 value;
    }

    function zero() internal pure returns (S256 memory) {
        return S256({ value: 0 });
    }

    function s256(int256 _value) internal pure returns (S256 memory) {
        return S256({ value: _value });
    }

    function add(S256 memory self, S256 memory b) internal pure returns (S256 memory) {
        return S256({ value: self.value + b.value });
    }

    function sub(S256 memory self, S256 memory b) internal pure returns (S256 memory) {
        return S256({ value: self.value - b.value });
    }

    function mul(S256 memory self, int256 b) internal pure returns (S256 memory) {
        return S256({ value: self.value * b });
    }

    function div(S256 memory self, int256 b) internal pure returns (S256 memory) {
        return S256({ value: self.value / b });
    }

    function mulD(S256 memory self, S256 memory b) internal pure returns (S256 memory) {
        return S256({ value: (self.value * b.value) / int256(10**18) });
    }

    function divD(S256 memory self, S256 memory b) internal pure returns (S256 memory) {
        return S256({ value: (self.value * int256(10**18)) / b.value });
    }

    function abs(S256 memory self) internal pure returns (Decimal.D256 memory) {
        return Decimal.D256({ value: uint256(self.value >= 0 ? self.value : -self.value) });
    }

    function isNegative(S256 memory self) internal pure returns (bool) {
        return self.value < 0;
    }

    function isPositive(S256 memory self) internal pure returns (bool) {
        return self.value > 0;
    }

    function toUnsigned(S256 memory self) internal pure returns (Decimal.D256 memory) {
        require(self.value >= 0, "Cannot convert negative");
        return Decimal.D256({ value: uint256(self.value) });
    }

    function toSigned(Decimal.D256 memory d) internal pure returns (S256 memory) {
        return S256({ value: int256(d.value) });
    }
}

