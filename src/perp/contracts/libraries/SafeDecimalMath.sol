// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

import { Decimal } from "./Decimal.sol";
import { SignedDecimal } from "./SignedDecimal.sol";

library SafeDecimalMath {
    using Decimal for Decimal.D256;
    using SignedDecimal for SignedDecimal.S256;

    uint256 private constant UNIT = 10**18;

    function mulDecimal(uint256 x, uint256 y) internal pure returns (uint256) {
        return x * y / UNIT;
    }

    function divDecimal(uint256 x, uint256 y) internal pure returns (uint256) {
        return x * UNIT / y;
    }

    function mulDecimalRound(uint256 x, uint256 y) internal pure returns (uint256) {
        uint256 quotient = x * y / UNIT;
        uint256 remainder = x * y % UNIT;
        if (remainder >= UNIT / 2) {
            quotient = quotient + 1;
        }
        return quotient;
    }

    function divDecimalRound(uint256 x, uint256 y) internal pure returns (uint256) {
        uint256 quotient = x * UNIT / y;
        uint256 remainder = x * UNIT % y;
        if (remainder >= y / 2) {
            quotient = quotient + 1;
        }
        return quotient;
    }

    function toDecimal(uint256 x) internal pure returns (Decimal.D256 memory) {
        return Decimal.D256({ value: x });
    }

    function toSignedDecimal(int256 x) internal pure returns (SignedDecimal.S256 memory) {
        return SignedDecimal.S256({ value: x });
    }
}
