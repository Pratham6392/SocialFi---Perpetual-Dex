import { LAST_BAR_REFRESH_INTERVAL, SUPPORTED_RESOLUTIONS } from "config/tradingview";
import { getLimitChartPricesFromStats, timezoneOffset, PriceStreamManager } from "domain/prices";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { Bar } from "./types";
import { formatTimeInBarToMs, getCurrentCandleTime } from "./utils";
import { fillBarGaps, getCurrentPriceOfToken, getStableCoinPrice, getTokenChartPrice } from "./requests";
import { BigNumberish, BigNumber } from "ethers";
import { PeriodParams } from "charting_library";

const initialHistoryBarsInfo = {
  period: "",
  data: [],
  ticker: "",
};

export class TVDataProvider {
  lastBar: Bar | null;
  startTime: number;
  lastTicker: string;
  lastPeriod: string;
  barsInfo: {
    period: string;
    data: Bar[];
    ticker: string;
  };
  priceStreamManager: PriceStreamManager | null;
  chainId: number;
  realtimeUpdateCallback: ((bar: Bar) => void) | null;
  priceSubscriptionUnsubscribe: (() => void) | null;

  constructor(chainId?: number) {
    this.lastBar = null;
    this.startTime = 0;
    this.lastTicker = "";
    this.lastPeriod = "";
    this.barsInfo = initialHistoryBarsInfo;
    this.chainId = chainId || 0;
    this.priceStreamManager = chainId ? new PriceStreamManager(chainId) : null;
    this.realtimeUpdateCallback = null;
    this.priceSubscriptionUnsubscribe = null;
  }

  setChainId(chainId: number) {
    this.chainId = chainId;
    if (this.priceStreamManager) {
      this.priceStreamManager.unsubscribeAll();
    }
    this.priceStreamManager = new PriceStreamManager(chainId);
  }

  async getCurrentPriceOfToken(chainId: number, ticker: string): Promise<BigNumberish> {
    return getCurrentPriceOfToken(chainId, ticker);
  }

  async getTokenLastBars(chainId: number, ticker: string, period: string, limit: number): Promise<Bar[]> {
    return getLimitChartPricesFromStats(chainId, ticker, period, limit);
  }
  async getTokenChartPrice(chainId: number, ticker: string, period: string): Promise<Bar[]> {
    return getTokenChartPrice(chainId, ticker, period);
  }

  async getTokenHistoryBars(
    chainId: number,
    ticker: string,
    period: string,
    periodParams: PeriodParams,
    shouldRefetchBars: boolean
  ): Promise<Bar[]> {
    const barsInfo = this.barsInfo;
    if (!barsInfo.data.length || barsInfo.ticker !== ticker || barsInfo.period !== period || shouldRefetchBars) {
      try {
        const bars = await this.getTokenChartPrice(chainId, ticker, period);
        const filledBars = fillBarGaps(bars, CHART_PERIODS[period]);
        const currentCandleTime = getCurrentCandleTime(period);
        const lastCandleTime = currentCandleTime - CHART_PERIODS[period];
        const lastBar = filledBars[filledBars.length - 1];
        if (lastBar.time === currentCandleTime || lastBar.time === lastCandleTime) {
          this.lastBar = { ...lastBar, ticker };
        }
        this.barsInfo.data = filledBars;
        this.barsInfo.ticker = ticker;
        this.barsInfo.period = period;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        this.barsInfo = initialHistoryBarsInfo;
      }
    }

    const { from, to, countBack } = periodParams;
    const toWithOffset = to + timezoneOffset;
    const fromWithOffset = from + timezoneOffset;
    const bars = barsInfo.data.filter((bar) => bar.time > fromWithOffset && bar.time <= toWithOffset);

    // if no bars returned, return empty array
    if (!bars.length) {
      return [];
    }

    // if bars are fewer than countBack, return all of them
    if (bars.length < countBack) {
      return bars;
    }

    // if bars are more than countBack, return latest bars
    return bars.slice(bars.length - countBack, bars.length);
  }

  async getBars(
    chainId: number,
    ticker: string,
    resolution: string,
    isStable: boolean,
    periodParams: PeriodParams,
    shouldRefetchBars: boolean
  ) {
    const period = SUPPORTED_RESOLUTIONS[resolution];
    const { from, to } = periodParams;

    try {
      const bars = isStable
        ? getStableCoinPrice(period, from, to)
        : await this.getTokenHistoryBars(chainId, ticker, period, periodParams, shouldRefetchBars);

      return bars.map(formatTimeInBarToMs);
    } catch {
      throw new Error("Failed to get history bars");
    }
  }

  async getLastBar(chainId: number, ticker: string, period: string) {
    if (!ticker || !period || !chainId) {
      throw new Error("Invalid input. Ticker, period, and chainId are required parameters.");
    }
    const currentTime = Date.now();
    if (
      currentTime - this.startTime > LAST_BAR_REFRESH_INTERVAL ||
      this.lastTicker !== ticker ||
      this.lastPeriod !== period
    ) {
      const prices = await this.getTokenLastBars(chainId, ticker, period, 1);
      if (prices?.length) {
        // @ts-ignore
        const lastBar = prices[0];
        const currentCandleTime = getCurrentCandleTime(period);
        const lastCandleTime = currentCandleTime - CHART_PERIODS[period];
        if (lastBar.time === currentCandleTime || lastBar.time === lastCandleTime) {
          this.lastBar = { ...lastBar, ticker };
          this.startTime = currentTime;
          this.lastTicker = ticker;
          this.lastPeriod = period;
        }
      }
    }
    return this.lastBar;
  }

  async getLiveBar(chainId: number, ticker: string, resolution: string) {
    const period = SUPPORTED_RESOLUTIONS[resolution];
    if (!ticker || !period || !chainId) return;

    const currentCandleTime = getCurrentCandleTime(period);
    try {
      this.lastBar = await this.getLastBar(chainId, ticker, period);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }

    if (!this.lastBar) return;

    const currentPrice = await this.getCurrentPriceOfToken(chainId, ticker);
    const averagePriceValue = parseFloat(formatAmount(currentPrice, USD_DECIMALS, 4));
    if (this.lastBar.time && currentCandleTime === this.lastBar.time && ticker === this.lastBar.ticker) {
      return {
        ...this.lastBar,
        close: averagePriceValue,
        high: Math.max(this.lastBar.open, this.lastBar.high, averagePriceValue),
        low: Math.min(this.lastBar.open, this.lastBar.low, averagePriceValue),
        ticker,
      };
    } else {
      const newBar = {
        time: currentCandleTime,
        open: this.lastBar.close,
        close: averagePriceValue,
        high: Math.max(this.lastBar.close, averagePriceValue),
        low: Math.min(this.lastBar.close, averagePriceValue),
        ticker,
      };
      this.lastBar = newBar;
      return this.lastBar;
    }
  }

  // Subscribe to real-time price updates via WebSocket
  subscribeToRealtimePrices(tokenAddress: string, callback: (bar: Bar) => void, resolution: string) {
    if (!this.priceStreamManager) return null;

    this.realtimeUpdateCallback = callback;
    const period = SUPPORTED_RESOLUTIONS[resolution];

    // Unsubscribe from previous subscription if exists
    if (this.priceSubscriptionUnsubscribe) {
      this.priceSubscriptionUnsubscribe();
    }

    // Subscribe to price updates
    this.priceSubscriptionUnsubscribe = this.priceStreamManager.subscribe(
      tokenAddress,
      (price: BigNumber) => {
        const currentCandleTime = getCurrentCandleTime(period);
        const averagePriceValue = parseFloat(formatAmount(price, USD_DECIMALS, 4));

        if (!this.lastBar) {
          // Create initial bar
          this.lastBar = {
            time: currentCandleTime,
            open: averagePriceValue,
            close: averagePriceValue,
            high: averagePriceValue,
            low: averagePriceValue,
            ticker: tokenAddress,
          };
          callback(this.lastBar);
          return;
        }

        // Update existing bar or create new one
        if (this.lastBar.time === currentCandleTime) {
          // Update current candle
          this.lastBar = {
            ...this.lastBar,
            close: averagePriceValue,
            high: Math.max(this.lastBar.high, averagePriceValue),
            low: Math.min(this.lastBar.low, averagePriceValue),
          };
        } else {
          // New candle
          this.lastBar = {
            time: currentCandleTime,
            open: this.lastBar.close,
            close: averagePriceValue,
            high: Math.max(this.lastBar.close, averagePriceValue),
            low: Math.min(this.lastBar.close, averagePriceValue),
            ticker: tokenAddress,
          };
        }
        callback(this.lastBar);
      }
    );

    return this.priceSubscriptionUnsubscribe;
  }

  // Unsubscribe from real-time price updates
  unsubscribeFromRealtimePrices() {
    if (this.priceSubscriptionUnsubscribe) {
      this.priceSubscriptionUnsubscribe();
      this.priceSubscriptionUnsubscribe = null;
    }
    this.realtimeUpdateCallback = null;
  }

  // Cleanup all subscriptions
  cleanup() {
    this.unsubscribeFromRealtimePrices();
    if (this.priceStreamManager) {
      this.priceStreamManager.unsubscribeAll();
    }
  }
}
