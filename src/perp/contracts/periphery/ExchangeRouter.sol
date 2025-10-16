// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

import { Decimal } from "../libraries/Decimal.sol";
import { SignedDecimal } from "../libraries/SignedDecimal.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Interface for ClearingHouse
interface IClearingHouse {
    function openPosition(
        address baseToken,
        bool isLong,
        uint256 collateralAmount,
        uint256 leverage,
        uint256 minBaseAmount
    ) external returns (uint256);
    
    function closePosition(
        address baseToken,
        uint256 closeRatio
    ) external returns (int256);
    
    function getPosition(address trader, address baseToken) external view returns (
        int256 size,
        uint256 collateral,
        uint256 entryPrice,
        uint256 openNotional
    );
}

// Interface for AccountBalance
interface IAccountBalance {
    function deposit(address trader, Decimal.D256 memory amount) external;
    function withdraw(address trader, Decimal.D256 memory amount) external;
    function getCollateral(address trader) external view returns (uint256);
}

/**
 * @title ExchangeRouter
 * @notice User-facing router for opening/closing positions with convenience functions
 * @dev Simplifies multi-step operations and handles approvals
 */
contract ExchangeRouter {
    using Decimal for Decimal.D256;
    using SignedDecimal for SignedDecimal.S256;

    // Core contract references
    address public clearingHouse;
    address public vault;
    address public accountBalance;
    address public collateralToken;
    
    // Slippage protection
    uint256 public constant MAX_SLIPPAGE = 1000; // 10%
    uint256 public constant BASIS_POINTS = 10000;
    
    // Events
    event PositionOpened(
        address indexed trader,
        address indexed baseToken,
        bool isLong,
        uint256 collateral,
        uint256 leverage,
        uint256 size
    );
    
    event PositionClosed(
        address indexed trader,
        address indexed baseToken,
        uint256 closeRatio,
        int256 realizedPnL
    );

    event CollateralDeposited(
        address indexed trader,
        uint256 amount
    );

    event CollateralWithdrawn(
        address indexed trader,
        uint256 amount
    );
    
    constructor(
        address _clearingHouse,
        address _vault,
        address _accountBalance,
        address _collateralToken
    ) {
        clearingHouse = _clearingHouse;
        vault = _vault;
        accountBalance = _accountBalance;
        collateralToken = _collateralToken;
    }
    
    /**
     * @notice Open position with collateral
     * @param baseToken Base token address
     * @param isLong True for long, false for short
     * @param collateralAmount Collateral amount
     * @param leverage Leverage multiplier (in basis points)
     * @param minBaseAmount Minimum base amount (slippage protection)
     * @param deadline Transaction deadline
     * @return baseAmount Actual base amount received
     */
    function openPositionWithCollateral(
        address baseToken,
        bool isLong,
        uint256 collateralAmount,
        uint256 leverage,
        uint256 minBaseAmount,
        uint256 deadline
    ) external returns (uint256 baseAmount) {
        require(block.timestamp <= deadline, "Deadline exceeded");
        require(collateralAmount > 0, "Invalid collateral");
        require(leverage > 0 && leverage <= 10000, "Invalid leverage"); // Max 100x
        
        // Transfer collateral from user
        IERC20(collateralToken).transferFrom(
            msg.sender, 
            address(this), 
            collateralAmount
        );
        
        // Approve ClearingHouse to spend collateral
        IERC20(collateralToken).approve(clearingHouse, collateralAmount);
        
        // Open position through ClearingHouse
        baseAmount = IClearingHouse(clearingHouse).openPosition(
            baseToken,
            isLong,
            collateralAmount,
            leverage,
            minBaseAmount
        );
        
        emit PositionOpened(msg.sender, baseToken, isLong, collateralAmount, leverage, baseAmount);
        
        return baseAmount;
    }
    
    /**
     * @notice Close position
     * @param baseToken Base token address
     * @param closeRatio Ratio to close (10000 = 100%)
     * @param minQuoteAmount Minimum quote amount to receive
     * @param deadline Transaction deadline
     * @return realizedPnL Realized PnL from closing
     */
    function closePositionToCollateral(
        address baseToken,
        uint256 closeRatio,
        uint256 minQuoteAmount,
        uint256 deadline
    ) external returns (int256 realizedPnL) {
        require(block.timestamp <= deadline, "Deadline exceeded");
        require(closeRatio > 0 && closeRatio <= BASIS_POINTS, "Invalid ratio");
        
        // Close position through ClearingHouse
        realizedPnL = IClearingHouse(clearingHouse).closePosition(baseToken, closeRatio);
        
        // Calculate collateral returned (simplified)
        uint256 collateralOut = realizedPnL > 0 ? uint256(realizedPnL) : 0;
        require(collateralOut >= minQuoteAmount, "Slippage exceeded");
        
        // Transfer collateral back to user if positive PnL
        if (collateralOut > 0) {
            IERC20(collateralToken).transfer(msg.sender, collateralOut);
        }
        
        emit PositionClosed(msg.sender, baseToken, closeRatio, realizedPnL);
        
        return realizedPnL;
    }
    
    /**
     * @notice Add collateral to account
     * @param amount Collateral amount
     */
    function addCollateral(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        
        IERC20(collateralToken).transferFrom(msg.sender, accountBalance, amount);
        IAccountBalance(accountBalance).deposit(msg.sender, Decimal.d256(amount));
        
        emit CollateralDeposited(msg.sender, amount);
    }
    
    /**
     * @notice Remove collateral from account
     * @param amount Collateral amount
     */
    function removeCollateral(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        
        IAccountBalance(accountBalance).withdraw(msg.sender, Decimal.d256(amount));
        IERC20(collateralToken).transfer(msg.sender, amount);
        
        emit CollateralWithdrawn(msg.sender, amount);
    }
    
    /**
     * @notice Close position and withdraw all collateral
     * @param baseToken Base token address
     * @param minReceived Minimum amount to receive
     * @return totalReceived Total amount received
     */
    function closePositionAndWithdraw(
        address baseToken,
        uint256 minReceived
    ) external returns (uint256) {
        // Close full position
        int256 pnl = IClearingHouse(clearingHouse).closePosition(baseToken, BASIS_POINTS);
        
        // Get remaining collateral
        uint256 collateral = IAccountBalance(accountBalance).getCollateral(msg.sender);
        
        // Calculate total
        uint256 totalReceived = pnl > 0 
            ? collateral + uint256(pnl)
            : (collateral > uint256(-pnl) ? collateral - uint256(-pnl) : 0);
        
        require(totalReceived >= minReceived, "Slippage exceeded");
        
        // Withdraw all
        if (collateral > 0) {
            IAccountBalance(accountBalance).withdraw(msg.sender, Decimal.d256(collateral));
            IERC20(collateralToken).transfer(msg.sender, totalReceived);
        }
        
        return totalReceived;
    }
    
    // View functions
    
    /**
     * @notice Get position details
     * @param trader Trader address
     * @param baseToken Base token address
     * @return size Position size
     * @return collateral Collateral amount
     * @return entryPrice Entry price
     * @return openNotional Open notional value
     */
    function getPosition(address trader, address baseToken) external view returns (
        int256 size,
        uint256 collateral,
        uint256 entryPrice,
        uint256 openNotional
    ) {
        return IClearingHouse(clearingHouse).getPosition(trader, baseToken);
    }
    
    /**
     * @notice Get account collateral
     * @param trader Trader address
     * @return Collateral amount
     */
    function getAccountCollateral(address trader) external view returns (uint256) {
        return IAccountBalance(accountBalance).getCollateral(trader);
    }
    
    /**
     * @notice Calculate max position size for given collateral and leverage
     * @param collateral Collateral amount
     * @param leverage Leverage multiplier (in basis points)
     * @return Max position size
     */
    function getMaxPositionSize(uint256 collateral, uint256 leverage) external pure returns (uint256) {
        return collateral * leverage / BASIS_POINTS;
    }
}
