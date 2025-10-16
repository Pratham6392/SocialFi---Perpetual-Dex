// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

import { Decimal } from "../libraries/Decimal.sol";
import { SignedDecimal } from "../libraries/SignedDecimal.sol";
import { SafeDecimalMath } from "../libraries/SafeDecimalMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AccountBalance
 * @notice Manages trader collateral and margin calculations
 * @dev Tracks collateral deposits, withdrawals, and margin requirements
 */
contract AccountBalance {
    using Decimal for Decimal.D256;
    using SignedDecimal for SignedDecimal.S256;

    mapping(address => Decimal.D256) public collateral;
    mapping(address => mapping(address => Decimal.D256)) public positionValue;
    mapping(address => mapping(address => SignedDecimal.S256)) public unrealizedPnl;

    uint256 public constant INITIAL_MARGIN_RATIO = 100; // 1% = 100x max leverage
    uint256 public constant MAINTENANCE_MARGIN_RATIO = 50; // 0.5%
    uint256 public constant BASIS_POINTS = 10000;

    address public clearingHouse;
    address public vault;

    event CollateralAdded(address indexed trader, uint256 amount);
    event CollateralRemoved(address indexed trader, uint256 amount);
    event PnLRealized(address indexed trader, address indexed baseToken, int256 pnl);

    modifier onlyClearingHouse() {
        require(msg.sender == clearingHouse, "Only ClearingHouse");
        _;
    }

    constructor(address _clearingHouse, address _vault) {
        clearingHouse = _clearingHouse;
        vault = _vault;
    }

    function deposit(address trader, Decimal.D256 memory amount) external onlyClearingHouse {
        collateral[trader] = collateral[trader].add(amount);
        emit CollateralAdded(trader, amount.value);
    }

    function withdraw(address trader, Decimal.D256 memory amount) external onlyClearingHouse {
        require(collateral[trader].gte(amount), "Insufficient collateral");
        require(canWithdraw(trader, amount), "Would violate margin requirements");
        collateral[trader] = collateral[trader].sub(amount);
        emit CollateralRemoved(trader, amount.value);
    }

    function updatePosition(
        address trader,
        address baseToken,
        SignedDecimal.S256 memory sizeDelta,
        Decimal.D256 memory openNotionalDelta
    ) external onlyClearingHouse {
        // Update position tracking
        SignedDecimal.S256 memory oldPnl = unrealizedPnl[trader][baseToken];
        
        // Simplified PnL calculation
        // In production, this would involve price feeds and funding rates
        unrealizedPnl[trader][baseToken] = oldPnl;
    }

    function realizePnl(
        address trader,
        address baseToken,
        SignedDecimal.S256 memory pnl
    ) external onlyClearingHouse {
        if (pnl.isPositive()) {
            collateral[trader] = collateral[trader].add(pnl.abs());
        } else {
            Decimal.D256 memory loss = pnl.abs();
            if (collateral[trader].gte(loss)) {
                collateral[trader] = collateral[trader].sub(loss);
            } else {
                // Bad debt - insurance fund should cover
                collateral[trader] = Decimal.zero();
            }
        }
        
        unrealizedPnl[trader][baseToken] = SignedDecimal.zero();
        emit PnLRealized(trader, baseToken, pnl.value);
    }

    function getAccountValue(address trader) external view returns (SignedDecimal.S256 memory) {
        // Total account value = collateral + unrealized PnL
        SignedDecimal.S256 memory totalValue = collateral[trader].toSigned();
        
        // Add unrealized PnL from all positions (simplified)
        // In production, iterate through all positions
        
        return totalValue;
    }

    function getMarginRatio(address trader) external view returns (uint256) {
        SignedDecimal.S256 memory accountValue = this.getAccountValue(trader);
        
        // Calculate total position value (simplified)
        Decimal.D256 memory totalPositionValue = Decimal.zero();
        
        // In production, sum all position values
        
        if (totalPositionValue.isZero()) return 0;
        
        return accountValue.toUnsigned().value * BASIS_POINTS / totalPositionValue.value;
    }

    function isLiquidatable(address trader) external view returns (bool) {
        uint256 ratio = this.getMarginRatio(trader);
        return ratio < MAINTENANCE_MARGIN_RATIO && ratio > 0;
    }

    function canWithdraw(address trader, Decimal.D256 memory amount) public view returns (bool) {
        Decimal.D256 memory remainingCollateral = collateral[trader].sub(amount);
        
        // Check if remaining collateral meets initial margin requirements
        // Simplified - in production, calculate against all positions
        
        return true; // Simplified
    }

    function getTotalCollateralValue(address trader) external view returns (Decimal.D256 memory) {
        return collateral[trader];
    }

    function getCollateral(address trader) external view returns (uint256) {
        return collateral[trader].value;
    }

    function getUnrealizedPnl(address trader, address baseToken) external view returns (int256) {
        return unrealizedPnl[trader][baseToken].value;
    }
}
