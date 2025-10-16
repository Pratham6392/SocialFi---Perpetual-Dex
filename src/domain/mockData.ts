import { ethers } from "ethers";
import { getTokens, getTokenBySymbol } from "config/tokens";
import { CHART_PERIODS } from "lib/legacy";

// Mock data configuration
export const USE_MOCK_DATA = process.env.NODE_ENV === 'development' || process.env.REACT_APP_USE_MOCK_DATA === 'true';

// Base prices for different tokens (in USD, will be converted to proper decimals)
const MOCK_BASE_PRICES = {
  ETH: 2000,
  BTC: 50000,
  BNB: 300,
  USDT: 1,
  USDC: 1,
  DAI: 1,
  LINK: 15,
  UNI: 8,
  AVAX: 25,
  FRAX: 1,
  MIM: 1,
  UTX: 0.5,
  ULP: 1.2,
};

// Price volatility ranges (percentage)
const VOLATILITY_RANGES = {
  ETH: 0.02,    // 2% volatility
  BTC: 0.025,   // 2.5% volatility
  BNB: 0.03,    // 3% volatility
  USDT: 0.001,  // 0.1% volatility (stable)
  USDC: 0.001,  // 0.1% volatility (stable)
  DAI: 0.001,   // 0.1% volatility (stable)
  LINK: 0.04,   // 4% volatility
  UNI: 0.05,    // 5% volatility
  AVAX: 0.06,   // 6% volatility
  FRAX: 0.001,  // 0.1% volatility (stable)
  MIM: 0.001,   // 0.1% volatility (stable)
  UTX: 0.08,    // 8% volatility (high for native token)
  ULP: 0.02,    // 2% volatility
};

// Generate realistic price fluctuation
function generatePriceFluctuation(basePrice: number, volatility: number): number {
  // Generate random walk with mean reversion
  const randomChange = (Math.random() - 0.5) * 2; // -1 to 1
  const volatilityFactor = volatility * randomChange;
  const newPrice = basePrice * (1 + volatilityFactor);
  
  // Ensure price doesn't go negative or too extreme
  return Math.max(newPrice, basePrice * 0.1);
}

// Generate mock price data for a token
export function generateMockPriceData(
  symbol: string, 
  period: string, 
  count: number = 300,
  basePrice?: number
): any[] {
  if (!USE_MOCK_DATA) return [];

  const periodSeconds = CHART_PERIODS[period];
  const now = Math.floor(Date.now() / 1000);
  const bars: any[] = [];
  
  // Use provided base price or default
  let currentPrice = basePrice || MOCK_BASE_PRICES[symbol] || 100;
  const volatility = VOLATILITY_RANGES[symbol] || 0.02;

  for (let i = 0; i < count; i++) {
    const time = now - (count - i - 1) * periodSeconds;
    
    // Generate OHLC data
    const open = currentPrice;
    const volatilityFactor = volatility * (Math.random() - 0.5) * 2;
    const close = open * (1 + volatilityFactor);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    
    bars.push({
      time,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
    });
    
    currentPrice = close;
  }

  return bars;
}

// Generate mock current price for a token
export function generateMockCurrentPrice(symbol: string): ethers.BigNumber {
  if (!USE_MOCK_DATA) return ethers.BigNumber.from(0);

  const basePrice = MOCK_BASE_PRICES[symbol] || 100;
  const volatility = VOLATILITY_RANGES[symbol] || 0.02;
  const currentPrice = generatePriceFluctuation(basePrice, volatility);
  
  // Convert to proper decimal format (18 decimals)
  return ethers.utils.parseUnits(currentPrice.toString(), 18);
}

// Generate mock price for stablecoins (always ~$1)
export function generateMockStablePrice(): ethers.BigNumber {
  if (!USE_MOCK_DATA) return ethers.BigNumber.from(0);
  
  // Stablecoins should be very close to $1
  const price = 1 + (Math.random() - 0.5) * 0.002; // ±0.1% variation
  return ethers.utils.parseUnits(price.toString(), 18);
}

// Generate mock token balances for wallet
export function generateMockTokenBalances(chainId: number, account: string): { [address: string]: ethers.BigNumber } {
  if (!USE_MOCK_DATA) return {};

  const tokens = getTokens(chainId);
  const balances: { [address: string]: ethers.BigNumber } = {};

  tokens.forEach(token => {
    let balance: ethers.BigNumber;
    
    if (token.isStable) {
      // Stablecoins: random amount between 100-10000
      const amount = Math.random() * 9900 + 100;
      balance = ethers.utils.parseUnits(amount.toString(), token.decimals);
    } else if (token.symbol === 'ETH' || token.symbol === 'BTC') {
      // Major tokens: smaller amounts
      const amount = Math.random() * 2 + 0.1;
      balance = ethers.utils.parseUnits(amount.toString(), token.decimals);
    } else {
      // Other tokens: random amounts
      const amount = Math.random() * 1000 + 10;
      balance = ethers.utils.parseUnits(amount.toString(), token.decimals);
    }
    
    balances[token.address.toLowerCase()] = balance;
  });

  return balances;
}

// Generate mock position data
export function generateMockPositions(chainId: number, account: string): any[] {
  if (!USE_MOCK_DATA) return [];

  const tokens = getTokens(chainId).filter(token => token.isShortable);
  const positions: any[] = [];

  // Generate 1-3 random positions
  const numPositions = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < numPositions; i++) {
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const isLong = Math.random() > 0.5;
    const size = Math.random() * 10000 + 1000; // $1000-$11000 position size
    const collateral = size * (0.1 + Math.random() * 0.2); // 10-30% collateral
    const entryPrice = MOCK_BASE_PRICES[token.symbol] || 100;
    const currentPrice = generatePriceFluctuation(entryPrice, VOLATILITY_RANGES[token.symbol] || 0.02);
    
    const pnl = isLong 
      ? (currentPrice - entryPrice) / entryPrice * size
      : (entryPrice - currentPrice) / entryPrice * size;

    positions.push({
      key: `mock-${i}`,
      contractKey: `mock-contract-${i}`,
      collateralToken: token as any,
      indexToken: token as any,
      isLong,
      size: ethers.utils.parseUnits(size.toString(), 18),
      collateral: ethers.utils.parseUnits(collateral.toString(), 18),
      averagePrice: ethers.utils.parseUnits(entryPrice.toString(), 18),
      entryFundingRate: ethers.BigNumber.from(0),
      cumulativeFundingRate: ethers.BigNumber.from(0),
      hasRealisedProfit: pnl > 0,
      realisedPnl: ethers.BigNumber.from(0),
      lastIncreasedTime: Date.now() - Math.random() * 86400000, // Random time in last 24h
      hasProfit: pnl > 0,
      delta: ethers.utils.parseUnits(pnl.toString(), 18),
      markPrice: ethers.utils.parseUnits(currentPrice.toString(), 18),
      leverage: size / collateral,
      leverageStr: `${(size / collateral).toFixed(1)}x`,
    });
  }

  return positions;
}

// Generate mock order book data
export function generateMockOrderBook(tokenSymbol: string): { bids: any[], asks: any[] } {
  if (!USE_MOCK_DATA) return { bids: [], asks: [] };

  const basePrice = MOCK_BASE_PRICES[tokenSymbol] || 100;
  const bids :any[] = [];
  const asks :any[] = [];

  // Generate 10 bids (buy orders)
  for (let i = 0; i < 10; i++) {
    const price = basePrice * (1 - (i + 1) * 0.001); // Decreasing prices
    const size = Math.random() * 1000 + 100;
    bids.push({
      price: Math.round(price * 100) / 100,
      size: Math.round(size * 100) / 100,
    });
  }

  // Generate 10 asks (sell orders)
  for (let i = 0; i < 10; i++) {
    const price = basePrice * (1 + (i + 1) * 0.001); // Increasing prices
    const size = Math.random() * 1000 + 100;
    asks.push({
      price: Math.round(price * 100) / 100,
      size: Math.round(size * 100) / 100,
    });
  }

  return { bids, asks };
}

// Generate mock trade history
export function generateMockTradeHistory(account: string, count: number = 50): any[] {
  if (!USE_MOCK_DATA) return [];

  const tokens = ['ETH', 'BTC', 'BNB', 'LINK', 'UNI'];
  const trades :any[]= [];

  for (let i = 0; i < count; i++) {
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const isLong = Math.random() > 0.5;
    const size = Math.random() * 5000 + 500;
    const price = MOCK_BASE_PRICES[token] * (0.95 + Math.random() * 0.1);
    const timestamp = Date.now() - Math.random() * 86400000 * 7; // Last 7 days

    trades.push({
      id: `mock-trade-${i}`,
      token,
      isLong,
      size: Math.round(size * 100) / 100,
      price: Math.round(price * 100) / 100,
      timestamp,
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    });
  }

  return trades.sort((a: any, b: any) => b.timestamp - a.timestamp);
}

// Generate mock funding rates
export function generateMockFundingRates(chainId: number): any {
  if (!USE_MOCK_DATA) return {};

  const tokens = getTokens(chainId);
  const fundingRates: { [tokenAddress: string]: ethers.BigNumber } = {};

  tokens.forEach(token => {
    // Funding rates typically range from -0.01% to 0.01% (in basis points)
    const rate = (Math.random() - 0.5) * 0.0002; // ±0.01%
    fundingRates[token.address.toLowerCase()] = ethers.utils.parseUnits(rate.toString(), 18);
  });

  return fundingRates;
}

// Generate mock volume data
export function generateMockVolumeData(chainId: number): { [tokenAddress: string]: ethers.BigNumber } {
  if (!USE_MOCK_DATA) return {};

  const tokens = getTokens(chainId);
  const volumes: { [tokenAddress: string]: ethers.BigNumber } = {};

  tokens.forEach(token => {
    // Random volume between $100K and $10M
    const volume = Math.random() * 9900000 + 100000;
    volumes[token.address.toLowerCase()] = ethers.utils.parseUnits(volume.toString(), 18);
  });

  return volumes;
}

// Utility function to check if mock data should be used
export function shouldUseMockData(): boolean {
  return USE_MOCK_DATA;
}

// Get mock data configuration
export function getMockDataConfig() {
  return {
    USE_MOCK_DATA,
    MOCK_BASE_PRICES,
    VOLATILITY_RANGES,
  };
}
