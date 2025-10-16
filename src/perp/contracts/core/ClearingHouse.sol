// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

import { Decimal } from "../libraries/Decimal.sol";
import { SignedDecimal } from "../libraries/SignedDecimal.sol";
import { SafeDecimalMath } from "../libraries/SafeDecimalMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ClearingHouse
 * @notice Main entry point for traders to open/close positions
 * @dev Manages position lifecycle, PnL settlement, and margin requirements
 */
contract ClearingHouse {
    using Decimal for Decimal.D256;
    using SignedDecimal for SignedDecimal.S256;

    // Core state variables
    address public vault;
    address public accountBalance;
    address public insuranceFund;
    address public exchange;
    address public admin;
    
    // Position tracking
    struct Position {
        int256 size;           // Position size (positive for long, negative for short)
        uint256 collateral;    // Collateral amount in USD
        uint256 entryPrice;    // Average entry price
        int256 fundingIndex;   // Last funding rate index
        uint256 lastUpdated;   // Timestamp of last update
        uint256 openNotional;  // Total notional value
    }
    
    // Market configuration
    struct Market {
        address baseToken;     // Base token (e.g., ETH, BTC)
        address vamm;          // vAMM pool address
        bool isActive;         // Market status
        uint256 maxLeverage;   // Maximum allowed leverage (in basis points, e.g., 10000 = 100x)
        uint256 maintenanceMarginRatio; // Maintenance margin ratio (e.g., 50 = 0.5%)
        uint256 liquidationFeeRatio;    // Liquidation fee ratio (e.g., 500 = 5%)
    }
    
    mapping(address => mapping(address => Position)) public positions; // trader => baseToken => Position
    mapping(address => Market) public markets; // baseToken => Market
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant INITIAL_MARGIN_RATIO = 100; // 1% = 100x max leverage
    
    // Events
    event PositionChanged(
        address indexed trader,
        address indexed baseToken,
        int256 exchangedPositionSize,
        uint256 exchangedPositionNotional,
        uint256 fee,
        int256 realizedPnl
    );
    
    event PositionLiquidated(
        address indexed trader,
        address indexed baseToken,
        uint256 positionNotional,
        uint256 liquidationFee,
        address liquidator
    );
    
    event MarketAdded(
        address indexed baseToken,
        address indexed vamm,
        uint256 maxLeverage
    );

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    // Constructor
    constructor(
        address _vault,
        address _accountBalance,
        address _insuranceFund,
        address _exchange
    ) {
        vault = _vault;
        accountBalance = _accountBalance;
        insuranceFund = _insuranceFund;
        exchange = _exchange;
        admin = msg.sender;
    }
    
    // Core functions
    function openPosition(
        address baseToken,
        bool isLong,
        uint256 collateralAmount,
        uint256 leverage,
        uint256 minBaseAmount
    ) external returns (uint256) {
        Market memory market = markets[baseToken];
        require(market.isActive, "Market not active");
        require(leverage <= market.maxLeverage, "Leverage too high");
        
        uint256 openNotional = collateralAmount * leverage / BASIS_POINTS;
        
        // Calculate position size from vAMM (simplified - in production, call vAMM.swap)
        uint256 baseAmount = openNotional; // Simplified 1:1 for now
        require(baseAmount >= minBaseAmount, "Slippage exceeded");
        
        int256 newSize = isLong ? int256(baseAmount) : -int256(baseAmount);
        
        Position storage pos = positions[msg.sender][baseToken];
        
        // Update position
        if (pos.size == 0) {
            pos.size = newSize;
            pos.collateral = collateralAmount;
            pos.entryPrice = openNotional * 1e18 / baseAmount;
            pos.openNotional = openNotional;
        } else {
            // Adding to existing position
            uint256 totalNotional = pos.openNotional + openNotional;
            uint256 totalSize = uint256(pos.size > 0 ? pos.size : -pos.size) + baseAmount;
            pos.entryPrice = totalNotional * 1e18 / totalSize;
            pos.size += newSize;
            pos.collateral = pos.collateral + collateralAmount;
            pos.openNotional = totalNotional;
        }
        
        pos.lastUpdated = block.timestamp;
        
        emit PositionChanged(msg.sender, baseToken, newSize, openNotional, 0, 0);
        
        return baseAmount;
    }
    
    function closePosition(
        address baseToken,
        uint256 closeRatio // In basis points, 10000 = 100%
    ) external returns (int256) {
        Position storage pos = positions[msg.sender][baseToken];
        require(pos.size != 0, "No position");
        require(closeRatio <= BASIS_POINTS, "Invalid ratio");
        
        bool isLong = pos.size > 0;
        uint256 posSize = uint256(pos.size > 0 ? pos.size : -pos.size);
        uint256 closeSize = posSize * closeRatio / BASIS_POINTS;
        
        // Calculate PnL (simplified - in production, get price from vAMM)
        uint256 closeNotional = closeSize * pos.entryPrice / 1e18;
        uint256 currentPrice = pos.entryPrice; // Simplified - should get from oracle/vAMM
        uint256 currentNotional = closeSize * currentPrice / 1e18;
        
        int256 pnl = isLong 
            ? int256(currentNotional) - int256(closeNotional)
            : int256(closeNotional) - int256(currentNotional);
        
        // Update position
        if (closeRatio == BASIS_POINTS) {
            // Full close
            delete positions[msg.sender][baseToken];
        } else {
            // Partial close
            pos.size = isLong ? pos.size - int256(closeSize) : pos.size + int256(closeSize);
            pos.collateral = pos.collateral * (BASIS_POINTS - closeRatio) / BASIS_POINTS;
            pos.openNotional = pos.openNotional * (BASIS_POINTS - closeRatio) / BASIS_POINTS;
            pos.lastUpdated = block.timestamp;
        }
        
        emit PositionChanged(msg.sender, baseToken, -int256(closeSize), closeNotional, 0, pnl);
        
        return pnl;
    }
    
    function liquidate(
        address trader,
        address baseToken
    ) external {
        Position storage pos = positions[trader][baseToken];
        require(pos.size != 0, "No position");
        
        // Check if liquidatable (simplified - should check margin ratio)
        Market memory market = markets[baseToken];
        uint256 posSize = uint256(pos.size > 0 ? pos.size : -pos.size);
        uint256 posValue = posSize * pos.entryPrice / 1e18;
        uint256 marginRatio = pos.collateral * BASIS_POINTS / posValue;
        
        require(marginRatio < market.maintenanceMarginRatio, "Not liquidatable");
        
        // Close position and calculate liquidation fee
        uint256 liquidationFee = pos.collateral * market.liquidationFeeRatio / BASIS_POINTS;
        
        // Transfer fee to liquidator
        // Transfer remaining to insurance fund
        
        delete positions[trader][baseToken];
        
        emit PositionLiquidated(trader, baseToken, posValue, liquidationFee, msg.sender);
    }
    
    function addMarket(
        address baseToken,
        address vamm,
        uint256 maxLeverage
    ) external onlyAdmin {
        markets[baseToken] = Market({
            baseToken: baseToken,
            vamm: vamm,
            isActive: true,
            maxLeverage: maxLeverage,
            maintenanceMarginRatio: 50, // 0.5%
            liquidationFeeRatio: 500 // 5%
        });
        
        emit MarketAdded(baseToken, vamm, maxLeverage);
    }
    
    function getPosition(address trader, address baseToken) external view returns (
        int256 size,
        uint256 collateral,
        uint256 entryPrice,
        uint256 openNotional
    ) {
        Position memory pos = positions[trader][baseToken];
        return (pos.size, pos.collateral, pos.entryPrice, pos.openNotional);
    }
}
