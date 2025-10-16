// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

import { Decimal } from "../libraries/Decimal.sol";

// Chainlink interface
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

/**
 * @title Oracle
 * @notice Price oracle for perpetual contracts
 * @dev Fetches prices from Chainlink or other oracle sources
 */
contract Oracle {
    using Decimal for Decimal.D256;

    // Price feed data
    struct PriceFeed {
        AggregatorV3Interface feed;  // Chainlink aggregator
        uint256 heartbeat;           // Max time between updates (seconds)
        uint8 decimals;              // Price decimals
        bool isActive;               // Feed status
    }
    
    mapping(address => PriceFeed) public priceFeeds; // baseToken => PriceFeed
    mapping(address => Decimal.D256) public cachedPrices; // baseToken => cached price
    mapping(address => uint256) public lastUpdateTime; // baseToken => timestamp
    
    address public admin;
    
    event PriceFeedAdded(address indexed baseToken, address indexed feedAddress, uint256 heartbeat);
    event PriceUpdated(address indexed baseToken, uint256 price, uint256 timestamp);
    event PriceFeedRemoved(address indexed baseToken);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @notice Add a Chainlink price feed
     * @param baseToken Token address
     * @param feedAddress Chainlink aggregator address
     * @param heartbeat Maximum time between price updates
     */
    function addPriceFeed(
        address baseToken,
        address feedAddress,
        uint256 heartbeat
    ) external onlyAdmin {
        require(baseToken != address(0), "Invalid token");
        require(feedAddress != address(0), "Invalid feed");
        require(heartbeat > 0, "Invalid heartbeat");
        
        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);
        uint8 decimals = feed.decimals();
        
        priceFeeds[baseToken] = PriceFeed({
            feed: feed,
            heartbeat: heartbeat,
            decimals: decimals,
            isActive: true
        });
        
        // Initialize cached price
        updatePrice(baseToken);
        
        emit PriceFeedAdded(baseToken, feedAddress, heartbeat);
    }

    /**
     * @notice Remove a price feed
     * @param baseToken Token address
     */
    function removePriceFeed(address baseToken) external onlyAdmin {
        priceFeeds[baseToken].isActive = false;
        emit PriceFeedRemoved(baseToken);
    }
    
    /**
     * @notice Get current price from Chainlink
     * @param baseToken Token address
     * @return price Current price normalized to 18 decimals
     */
    function getPrice(address baseToken) public view returns (Decimal.D256 memory) {
        PriceFeed memory feed = priceFeeds[baseToken];
        require(feed.isActive, "Inactive feed");
        
        (, int256 price,, uint256 updatedAt,) = feed.feed.latestRoundData();
        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt <= feed.heartbeat, "Stale price");
        
        // Normalize to 18 decimals
        uint256 normalizedPrice = uint256(price);
        if (feed.decimals < 18) {
            normalizedPrice = normalizedPrice * (10 ** (18 - feed.decimals));
        } else if (feed.decimals > 18) {
            normalizedPrice = normalizedPrice / (10 ** (feed.decimals - 18));
        }
        
        return Decimal.d256(normalizedPrice);
    }
    
    /**
     * @notice Update cached price
     * @param baseToken Token address
     * @return price Updated price
     */
    function updatePrice(address baseToken) public returns (Decimal.D256 memory) {
        Decimal.D256 memory price = getPrice(baseToken);
        cachedPrices[baseToken] = price;
        lastUpdateTime[baseToken] = block.timestamp;
        
        emit PriceUpdated(baseToken, price.value, block.timestamp);
        
        return price;
    }
    
    /**
     * @notice Get TWAP price (simplified)
     * @param baseToken Token address
     * @param interval Time interval for TWAP
     * @return TWAP price
     */
    function getTwapPrice(
        address baseToken,
        uint256 interval
    ) external view returns (Decimal.D256 memory) {
        // Simplified TWAP - in production, maintain price history
        // For now, return current price
        return cachedPrices[baseToken];
    }
    
    /**
     * @notice Get index price (spot price from oracle)
     * @param baseToken Token address
     * @return Index price
     */
    function getIndexPrice(address baseToken) external view returns (Decimal.D256 memory) {
        return getPrice(baseToken);
    }
    
    /**
     * @notice Get mark price (for funding rate calculation)
     * @param baseToken Token address
     * @return Mark price
     */
    function getMarkPrice(address baseToken) external view returns (Decimal.D256 memory) {
        // In production, this would get price from vAMM
        // For now, return oracle price
        return getPrice(baseToken);
    }
    
    /**
     * @notice Check if price is stale
     * @param baseToken Token address
     * @return True if price is stale
     */
    function isPriceStale(address baseToken) public view returns (bool) {
        PriceFeed memory feed = priceFeeds[baseToken];
        if (!feed.isActive) return true;
        
        return block.timestamp - lastUpdateTime[baseToken] > feed.heartbeat;
    }

    /**
     * @notice Get cached price
     * @param baseToken Token address
     * @return Cached price
     */
    function getCachedPrice(address baseToken) external view returns (uint256) {
        return cachedPrices[baseToken].value;
    }

    /**
     * @notice Get price feed info
     * @param baseToken Token address
     * @return feedAddress Chainlink feed address
     * @return heartbeat Heartbeat duration
     * @return decimals Price decimals
     * @return isActive Feed status
     */
    function getPriceFeedInfo(address baseToken) external view returns (
        address feedAddress,
        uint256 heartbeat,
        uint8 decimals,
        bool isActive
    ) {
        PriceFeed memory feed = priceFeeds[baseToken];
        return (
            address(feed.feed),
            feed.heartbeat,
            feed.decimals,
            feed.isActive
        );
    }

    /**
     * @notice Update admin address
     * @param newAdmin New admin address
     */
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }
}
