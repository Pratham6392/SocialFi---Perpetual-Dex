import { ethers } from "ethers";
import React from "react";
import { 
  generateMockTokenBalances, 
  generateMockPositions, 
  generateMockOrderBook, 
  generateMockTradeHistory,
  generateMockFundingRates,
  generateMockVolumeData,
  shouldUseMockData 
} from "domain/mockData";

// Re-export shouldUseMockData for convenience
export { shouldUseMockData };

// Mock data utilities for React components
export class MockDataProvider {
  private static instance: MockDataProvider;
  private cache: Map<string, any> = new Map();

  static getInstance(): MockDataProvider {
    if (!MockDataProvider.instance) {
      MockDataProvider.instance = new MockDataProvider();
    }
    return MockDataProvider.instance;
  }

  // Get mock token balances for wallet
  getTokenBalances(chainId: number, account: string): { [address: string]: ethers.BigNumber } {
    if (!shouldUseMockData()) return {};
    
    const cacheKey = `balances-${chainId}-${account}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const balances = generateMockTokenBalances(chainId, account);
    this.cache.set(cacheKey, balances);
    return balances;
  }

  // Get mock positions
  getPositions(chainId: number, account: string): any[] {
    if (!shouldUseMockData()) return [];
    
    const cacheKey = `positions-${chainId}-${account}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const positions = generateMockPositions(chainId, account);
    this.cache.set(cacheKey, positions);
    return positions;
  }

  // Get mock order book
  getOrderBook(tokenSymbol: string): { bids: any[], asks: any[] } {
    if (!shouldUseMockData()) return { bids: [], asks: [] };
    
    const cacheKey = `orderbook-${tokenSymbol}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const orderBook = generateMockOrderBook(tokenSymbol);
    this.cache.set(cacheKey, orderBook);
    return orderBook;
  }

  // Get mock trade history
  getTradeHistory(account: string, count: number = 50): any[] {
    if (!shouldUseMockData()) return [];
    
    const cacheKey = `trades-${account}-${count}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const trades = generateMockTradeHistory(account, count);
    this.cache.set(cacheKey, trades);
    return trades;
  }

  // Get mock funding rates
  getFundingRates(chainId: number): { [tokenAddress: string]: ethers.BigNumber } {
    if (!shouldUseMockData()) return {};
    
    const cacheKey = `funding-${chainId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const fundingRates = generateMockFundingRates(chainId);
    this.cache.set(cacheKey, fundingRates);
    return fundingRates;
  }

  // Get mock volume data
  getVolumeData(chainId: number): { [tokenAddress: string]: ethers.BigNumber } {
    if (!shouldUseMockData()) return {};
    
    const cacheKey = `volume-${chainId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const volumeData = generateMockVolumeData(chainId);
    this.cache.set(cacheKey, volumeData);
    return volumeData;
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number, keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const mockDataProvider = MockDataProvider.getInstance();

// Hook for React components to use mock data
export function useMockData() {
  return {
    isEnabled: shouldUseMockData(),
    provider: mockDataProvider,
    clearCache: () => mockDataProvider.clearCache(),
    getCacheStats: () => mockDataProvider.getCacheStats()
  };
}

// Utility functions for components
export function getMockTokenBalance(chainId: number, account: string, tokenAddress: string): ethers.BigNumber {
  const balances = mockDataProvider.getTokenBalances(chainId, account);
  return balances[tokenAddress.toLowerCase()] || ethers.BigNumber.from(0);
}

export function getMockPosition(chainId: number, account: string, positionKey: string): any {
  const positions = mockDataProvider.getPositions(chainId, account);
  return positions.find(p => p.key === positionKey);
}

export function getMockOrderBookData(tokenSymbol: string): { bids: any[], asks: any[] } {
  return mockDataProvider.getOrderBook(tokenSymbol);
}

export function getMockTradeHistoryData(account: string, limit: number = 50): any[] {
  return mockDataProvider.getTradeHistory(account, limit);
}

// Mock data status indicator component props
export interface MockDataStatusProps {
  showStatus?: boolean;
  className?: string;
}

// Simple status component to show when mock data is active
export function MockDataStatus({ showStatus = true, className = "" }: MockDataStatusProps) {
  if (!showStatus || !shouldUseMockData()) return null;

  return (
    <div className={`mock-data-status ${className}`} style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#ff6b6b',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      zIndex: 9999,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }}>
      🧪 MOCK DATA ACTIVE
    </div>
  );
}
