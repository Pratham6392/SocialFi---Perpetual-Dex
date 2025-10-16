// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

import { Decimal } from "../libraries/Decimal.sol";
import { SignedDecimal } from "../libraries/SignedDecimal.sol";

/**
 * @title Funding
 * @notice Manages funding rate calculations and payments
 * @dev Implements perpetual contract funding mechanism to keep price aligned with spot
 */
contract Funding {
    using Decimal for Decimal.D256;
    using SignedDecimal for SignedDecimal.S256;

    // Funding rate state
    struct FundingGrowth {
        SignedDecimal.S256 longFundingRate;    // Funding rate for long positions
        SignedDecimal.S256 shortFundingRate;   // Funding rate for short positions
        uint256 timestamp;                      // Last update time
        SignedDecimal.S256 cumulativeFunding;  // Cumulative funding since inception
    }
    
    mapping(address => FundingGrowth) public fundingGrowth; // baseToken => FundingGrowth
    mapping(address => mapping(address => SignedDecimal.S256)) public traderFundingIndex; // trader => baseToken => funding index
    
    // Configuration
    uint256 public fundingPeriod; // Funding period in seconds (e.g., 8 hours)
    uint256 public maxFundingRate; // Max funding rate in basis points (e.g., 1000 = 10%)
    uint256 public constant BASIS_POINTS = 10000;
    
    address public clearingHouse;
    address public admin;
    
    // Events
    event FundingRateUpdated(
        address indexed baseToken,
        int256 longFundingRate,
        int256 shortFundingRate,
        int256 cumulativeFunding,
        uint256 timestamp
    );
    
    event FundingPayment(
        address indexed trader,
        address indexed baseToken,
        int256 amount
    );

    modifier onlyClearingHouse() {
        require(msg.sender == clearingHouse, "Only ClearingHouse");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    constructor(address _clearingHouse) {
        clearingHouse = _clearingHouse;
        admin = msg.sender;
        fundingPeriod = 8 hours;
        maxFundingRate = 1000; // 10%
    }
    
    // Core functions
    function updateFundingRate(
        address baseToken,
        int256 markPrice,
        int256 indexPrice,
        uint256 longOpenInterest,
        uint256 shortOpenInterest
    ) external onlyClearingHouse returns (SignedDecimal.S256 memory) {
        FundingGrowth storage growth = fundingGrowth[baseToken];
        require(block.timestamp >= growth.timestamp + fundingPeriod, "Too early");
        
        // Calculate premium: (markPrice - indexPrice) / indexPrice
        int256 premium = ((markPrice - indexPrice) * int256(BASIS_POINTS)) / indexPrice;
        
        // Funding rate = premium * (fundingPeriod / 1 day)
        // Annualized and then pro-rated for the funding period
        int256 fundingRate = (premium * int256(fundingPeriod)) / int256(1 days);
        
        // Cap funding rate
        if (fundingRate > int256(maxFundingRate)) fundingRate = int256(maxFundingRate);
        if (fundingRate < -int256(maxFundingRate)) fundingRate = -int256(maxFundingRate);
        
        // Longs pay shorts if premium is positive, shorts pay longs if negative
        SignedDecimal.S256 memory signedRate = SignedDecimal.s256(fundingRate);
        
        growth.longFundingRate = signedRate;
        growth.shortFundingRate = SignedDecimal.s256(-fundingRate);
        growth.cumulativeFunding = growth.cumulativeFunding.add(signedRate);
        growth.timestamp = block.timestamp;
        
        emit FundingRateUpdated(
            baseToken, 
            fundingRate, 
            -fundingRate, 
            growth.cumulativeFunding.value, 
            block.timestamp
        );
        
        return signedRate;
    }
    
    function settleFunding(
        address trader,
        address baseToken,
        int256 positionSize
    ) external onlyClearingHouse returns (SignedDecimal.S256 memory) {
        FundingGrowth memory growth = fundingGrowth[baseToken];
        SignedDecimal.S256 memory lastIndex = traderFundingIndex[trader][baseToken];
        
        // Calculate funding owed since last settlement
        SignedDecimal.S256 memory fundingDelta = growth.cumulativeFunding.sub(lastIndex);
        
        // Funding payment = positionSize * fundingDelta / BASIS_POINTS
        // Positive position size (long) pays if funding is positive
        SignedDecimal.S256 memory fundingOwed = SignedDecimal.s256(
            (positionSize * fundingDelta.value) / int256(BASIS_POINTS)
        );
        
        // Update trader's funding index
        traderFundingIndex[trader][baseToken] = growth.cumulativeFunding;
        
        emit FundingPayment(trader, baseToken, fundingOwed.value);
        
        return fundingOwed;
    }
    
    function getPendingFunding(
        address trader,
        address baseToken,
        int256 positionSize
    ) external view returns (SignedDecimal.S256 memory) {
        FundingGrowth memory growth = fundingGrowth[baseToken];
        SignedDecimal.S256 memory lastIndex = traderFundingIndex[trader][baseToken];
        
        SignedDecimal.S256 memory fundingDelta = growth.cumulativeFunding.sub(lastIndex);
        
        return SignedDecimal.s256(
            (positionSize * fundingDelta.value) / int256(BASIS_POINTS)
        );
    }
    
    function getFundingRate(address baseToken) external view returns (int256, int256) {
        FundingGrowth memory growth = fundingGrowth[baseToken];
        return (growth.longFundingRate.value, growth.shortFundingRate.value);
    }

    function getCumulativeFunding(address baseToken) external view returns (int256) {
        return fundingGrowth[baseToken].cumulativeFunding.value;
    }

    function getLastFundingTime(address baseToken) external view returns (uint256) {
        return fundingGrowth[baseToken].timestamp;
    }

    function setFundingPeriod(uint256 _fundingPeriod) external onlyAdmin {
        require(_fundingPeriod > 0, "Invalid period");
        fundingPeriod = _fundingPeriod;
    }

    function setMaxFundingRate(uint256 _maxFundingRate) external onlyAdmin {
        require(_maxFundingRate <= BASIS_POINTS, "Rate too high");
        maxFundingRate = _maxFundingRate;
    }
}
