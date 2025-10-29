import { ethers } from "ethers";

/**
 * Perpetual Protocol SDK for React Frontend
 * Wrapper for interacting with Perp contracts from the UI
 */

class PerpSDK {
  constructor(provider, signer, addresses) {
    this.provider = provider;
    this.signer = signer;
    this.addresses = addresses;
    this.contracts = {};
  }

  /**
   * Initialize all contract instances
   */
  async init() {
    // Import ABIs (these are in src/abis/)
    const ClearingHouseABI = require("../../abis/ClearingHouse.json");
    const VammABI = require("../../abis/Vamm.json");
    const ExchangeRouterABI = require("../../abis/ExchangeRouter.json");
    // Note: AccountBalance and Oracle ABIs need to be added to src/abis/ if used
    // For now, we'll import from the contracts if available

    // Initialize contracts
    this.contracts.clearingHouse = new ethers.Contract(
      this.addresses.clearingHouse,
      ClearingHouseABI,
      this.signer
    );

    // Initialize contracts with available ABIs
    this.contracts.vamm = new ethers.Contract(
      this.addresses.vamm || this.addresses.vammETH,
      VammABI,
      this.signer
    );

    this.contracts.exchangeRouter = new ethers.Contract(
      this.addresses.exchangeRouter,
      ExchangeRouterABI,
      this.signer
    );

    // AccountBalance and Oracle contracts are read-only
    // We'll use the ClearingHouse for position queries
    // If we need these contracts, we'll need to add their ABIs to src/abis/

    return this;
  }

  /**
   * Open a perpetual position
   */
  async openPosition({ baseToken, isLong, collateralAmount, leverage, slippageTolerance = 0.01 }) {
    try {
      const minBaseAmount = await this.calculateMinBaseAmount(
        baseToken,
        collateralAmount,
        leverage,
        slippageTolerance
      );

      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

      const tx = await this.contracts.exchangeRouter.openPositionWithCollateral(
        baseToken,
        isLong,
        collateralAmount,
        leverage,
        minBaseAmount,
        deadline
      );

      return await tx.wait();
    } catch (error) {
      console.error("Error opening position:", error);
      throw error;
    }
  }

  /**
   * Close a perpetual position
   */
  async closePosition({ baseToken, positionSize, slippageTolerance = 0.01 }) {
    try {
      const minQuoteAmount = await this.calculateMinQuoteAmount(
        baseToken,
        positionSize,
        slippageTolerance
      );

      const deadline = Math.floor(Date.now() / 1000) + 300;

      const tx = await this.contracts.exchangeRouter.closePositionToCollateral(
        baseToken,
        positionSize,
        minQuoteAmount,
        deadline
      );

      return await tx.wait();
    } catch (error) {
      console.error("Error closing position:", error);
      throw error;
    }
  }

  /**
   * Get user's position info
   */
  async getPosition(trader, baseToken) {
    try {
      const position = await this.contracts.clearingHouse.positions(trader, baseToken);
      
      return {
        size: position.size,
        collateral: position.collateral,
        entryPrice: position.entryPrice,
        fundingIndex: position.fundingIndex,
        lastUpdated: position.lastUpdated,
      };
    } catch (error) {
      console.error("Error getting position:", error);
      throw error;
    }
  }

  /**
   * Get account balance and margin info
   */
  async getAccountInfo(trader) {
    try {
      // Use ClearingHouse to get position info since AccountBalance ABI not available
      // This is a simplified version - extend when AccountBalance ABI is added
      const position = await this.contracts.clearingHouse.getPosition(trader, this.addresses.vammETH || this.addresses.vamm);
      
      return {
        collateral: position.collateral || ethers.BigNumber.from(0),
        unrealizedPnL: ethers.BigNumber.from(0), // Will be calculated from position
        pendingFunding: ethers.BigNumber.from(0),
        accountValue: position.collateral || ethers.BigNumber.from(0),
        marginRatio: ethers.BigNumber.from(0), // Will be calculated
      };
    } catch (error) {
      console.error("Error getting account info:", error);
      throw error;
    }
  }

  /**
   * Get current mark price from vAMM
   */
  async getMarkPrice(baseToken) {
    try {
      return await this.contracts.vamm.getSpotPrice();
    } catch (error) {
      console.error("Error getting mark price:", error);
      throw error;
    }
  }

  /**
   * Get index price from oracle
   */
  async getIndexPrice(baseToken) {
    try {
      // Use vAMM spot price as index price for now
      // Oracle ABI not available - extend when Oracle ABI is added
      return await this.contracts.vamm.getSpotPrice();
    } catch (error) {
      console.error("Error getting index price:", error);
      throw error;
    }
  }

  /**
   * Get funding rate
   */
  async getFundingRate(baseToken) {
    try {
      // Funding contract ABI not available - return zero for now
      // Extend when Funding ABI is added
      return { 
        longRate: ethers.BigNumber.from(0), 
        shortRate: ethers.BigNumber.from(0) 
      };
    } catch (error) {
      console.error("Error getting funding rate:", error);
      throw error;
    }
  }

  /**
   * Calculate price impact for a trade
   */
  async getPriceImpact(baseToken, isLong, amount) {
    try {
      return await this.contracts.vamm.getPriceImpact(isLong, amount);
    } catch (error) {
      console.error("Error calculating price impact:", error);
      throw error;
    }
  }

  /**
   * Helper: Calculate minimum base amount for slippage protection
   */
  async calculateMinBaseAmount(baseToken, collateralAmount, leverage, slippageTolerance) {
    const notional = collateralAmount.mul(leverage);
    const expectedBaseAmount = await this.contracts.vamm.getAmountOut(true, notional);
    const minAmount = expectedBaseAmount.mul(10000 - slippageTolerance * 10000).div(10000);
    return minAmount;
  }

  /**
   * Helper: Calculate minimum quote amount for slippage protection
   */
  async calculateMinQuoteAmount(baseToken, positionSize, slippageTolerance) {
    const expectedQuoteAmount = await this.contracts.vamm.getAmountOut(false, positionSize);
    const minAmount = expectedQuoteAmount.mul(10000 - slippageTolerance * 10000).div(10000);
    return minAmount;
  }

  /**
   * Add collateral to existing position
   */
  async addCollateral(amount) {
    try {
      // ExchangeRouter.addCollateral doesn't take baseToken parameter
      const tx = await this.contracts.exchangeRouter.addCollateral(amount);
      return await tx.wait();
    } catch (error) {
      console.error("Error adding collateral:", error);
      throw error;
    }
  }

  /**
   * Remove collateral from position
   */
  async removeCollateral(amount) {
    try {
      // ExchangeRouter.removeCollateral doesn't take baseToken parameter
      const tx = await this.contracts.exchangeRouter.removeCollateral(amount);
      return await tx.wait();
    } catch (error) {
      console.error("Error removing collateral:", error);
      throw error;
    }
  }
}

export default PerpSDK;

