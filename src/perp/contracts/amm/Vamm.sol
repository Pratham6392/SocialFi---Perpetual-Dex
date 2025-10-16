// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

import { Decimal } from "../libraries/Decimal.sol";

/**
 * @title Vamm (Virtual Automated Market Maker)
 * @notice Implements constant product AMM for perpetual futures
 * @dev Uses virtual reserves (no real tokens) following x * y = k formula
 */
contract Vamm {
    using Decimal for Decimal.D256;

    Decimal.D256 public virtualBase;   // Virtual base token reserve
    Decimal.D256 public virtualQuote;  // Virtual quote token reserve
    Decimal.D256 public k;             // Constant product (k = x * y)
    
    address public clearingHouse;
    address public admin;
    bool public isPaused;

    uint256 public constant FEE_RATIO = 30; // 0.3% trading fee (30 basis points)
    uint256 public constant BASIS_POINTS = 10000;

    event Swapped(
        address indexed trader,
        bool isLong,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 newBaseReserve,
        uint256 newQuoteReserve,
        uint256 fee
    );
    
    event ReservesUpdated(uint256 baseReserve, uint256 quoteReserve);
    event TradingPaused(bool isPaused);

    modifier onlyClearingHouse() {
        require(msg.sender == clearingHouse, "Only ClearingHouse");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier whenNotPaused() {
        require(!isPaused, "Trading paused");
        _;
    }

    constructor(
        Decimal.D256 memory _virtualBase, 
        Decimal.D256 memory _virtualQuote,
        address _clearingHouse
    ) {
        require(_virtualBase.value > 0 && _virtualQuote.value > 0, "Invalid reserves");
        
        virtualBase = _virtualBase;
        virtualQuote = _virtualQuote;
        k = virtualBase.mulD(_virtualQuote);
        clearingHouse = _clearingHouse;
        admin = msg.sender;
        isPaused = false;
    }

    /**
     * @notice Execute a swap in the vAMM
     * @param isLong True for buying base (long), false for selling base (short)
     * @param amountIn Amount of tokens to swap in
     * @param minAmountOut Minimum amount of tokens to receive (slippage protection)
     * @return amountOut Amount of tokens received
     */
    function swap(
        bool isLong, 
        uint256 amountIn, 
        uint256 minAmountOut
    ) external onlyClearingHouse whenNotPaused returns (uint256) {
        require(amountIn > 0, "Amount must be positive");
        
        Decimal.D256 memory dAmountIn = Decimal.d256(amountIn);
        
        // Calculate trading fee
        Decimal.D256 memory fee = dAmountIn.mul(FEE_RATIO).div(BASIS_POINTS);
        Decimal.D256 memory amountInAfterFee = dAmountIn.sub(fee);
        
        Decimal.D256 memory newBase;
        Decimal.D256 memory newQuote;
        Decimal.D256 memory amountOut;
        
        if (isLong) {
            // Buy base with quote: add quote, remove base
            newQuote = virtualQuote.add(amountInAfterFee);
            newBase = k.divD(newQuote);
            amountOut = virtualBase.sub(newBase);
        } else {
            // Sell base for quote: add base, remove quote
            newBase = virtualBase.add(amountInAfterFee);
            newQuote = k.divD(newBase);
            amountOut = virtualQuote.sub(newQuote);
        }
        
        require(amountOut.value >= minAmountOut, "Slippage exceeded");
        
        // Update reserves
        virtualBase = newBase;
        virtualQuote = newQuote;
        
        emit Swapped(
            msg.sender, 
            isLong, 
            isLong ? amountOut.value : amountIn, 
            isLong ? amountIn : amountOut.value,
            newBase.value, 
            newQuote.value,
            fee.value
        );
        
        return amountOut.value;
    }

    /**
     * @notice Get current spot price (quote / base)
     * @return Current price in 18 decimals
     */
    function getSpotPrice() external view returns (Decimal.D256 memory) {
        return virtualQuote.divD(virtualBase);
    }

    /**
     * @notice Calculate output amount for a given input
     * @param isLong Direction of trade
     * @param amountIn Input amount
     * @return Expected output amount
     */
    function getAmountOut(bool isLong, uint256 amountIn) external view returns (uint256) {
        if (amountIn == 0) return 0;
        
        Decimal.D256 memory dAmountIn = Decimal.d256(amountIn);
        Decimal.D256 memory fee = dAmountIn.mul(FEE_RATIO).div(BASIS_POINTS);
        Decimal.D256 memory amountInAfterFee = dAmountIn.sub(fee);
        
        Decimal.D256 memory newBase;
        Decimal.D256 memory newQuote;
        
        if (isLong) {
            newQuote = virtualQuote.add(amountInAfterFee);
            newBase = k.divD(newQuote);
            return virtualBase.sub(newBase).value;
        } else {
            newBase = virtualBase.add(amountInAfterFee);
            newQuote = k.divD(newBase);
            return virtualQuote.sub(newQuote).value;
        }
    }

    /**
     * @notice Calculate price impact for a trade
     * @param isLong Direction of trade
     * @param amountIn Input amount
     * @return Price impact in basis points
     */
    function getPriceImpact(bool isLong, uint256 amountIn) external view returns (uint256) {
        if (amountIn == 0) return 0;
        
        uint256 amountOut = this.getAmountOut(isLong, amountIn);
        
        // Calculate ideal price (current spot price)
        uint256 currentPrice = virtualQuote.value * 1e18 / virtualBase.value;
        
        // Calculate execution price
        uint256 executionPrice = isLong 
            ? amountIn * 1e18 / amountOut
            : amountOut * 1e18 / amountIn;
        
        // Price impact = |executionPrice - currentPrice| / currentPrice * 10000
        uint256 priceDiff = executionPrice > currentPrice 
            ? executionPrice - currentPrice 
            : currentPrice - executionPrice;
        
        return priceDiff * BASIS_POINTS / currentPrice;
    }

    /**
     * @notice Adjust virtual reserves (admin only, for rebalancing)
     * @param newBase New base reserve
     * @param newQuote New quote reserve
     */
    function adjustReserves(
        Decimal.D256 memory newBase, 
        Decimal.D256 memory newQuote
    ) external onlyAdmin {
        require(newBase.value > 0 && newQuote.value > 0, "Invalid reserves");
        
        virtualBase = newBase;
        virtualQuote = newQuote;
        k = newBase.mulD(newQuote);
        
        emit ReservesUpdated(newBase.value, newQuote.value);
    }

    /**
     * @notice Get current reserves
     * @return base Base token reserve
     * @return quote Quote token reserve
     */
    function getReserves() external view returns (Decimal.D256 memory base, Decimal.D256 memory quote) {
        return (virtualBase, virtualQuote);
    }

    /**
     * @notice Pause/unpause trading
     * @param _isPaused New pause status
     */
    function setPaused(bool _isPaused) external onlyAdmin {
        isPaused = _isPaused;
        emit TradingPaused(_isPaused);
    }

    /**
     * @notice Get constant product k
     * @return k value
     */
    function getK() external view returns (uint256) {
        return k.value;
    }
}
