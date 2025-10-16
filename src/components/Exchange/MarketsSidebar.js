import React from "react";
import { Trans } from "@lingui/macro";
import { formatAmount } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";
import "./MarketsSidebar.css";

export default function MarketsSidebar({ 
  tokens, 
  infoTokens, 
  chainId, 
  selectedToken, 
  onSelectToken 
}) {
  const getTokenVolume = (tokenAddress) => {
    const tokenInfo = infoTokens[tokenAddress];
    if (!tokenInfo || !tokenInfo.volume24h) {
      return "0";
    }
    return formatAmount(tokenInfo.volume24h, USD_DECIMALS, 2, true);
  };

  const getTokenPrice = (tokenAddress) => {
    const tokenInfo = infoTokens[tokenAddress];
    if (!tokenInfo || !tokenInfo.maxPrice) {
      return "0.00";
    }
    return formatAmount(tokenInfo.maxPrice, USD_DECIMALS, 2, true);
  };

  const getPriceChange = (tokenAddress) => {
    const tokenInfo = infoTokens[tokenAddress];
    if (!tokenInfo || !tokenInfo.priceChange24h) {
      return 0;
    }
    return tokenInfo.priceChange24h;
  };

  // Filter for main trading pairs (non-stablecoins)
  const tradingPairs = tokens.filter(token => !token.isStable && !token.isWrapped);

  return (
    <div className="MarketsSidebar">
      <div className="MarketsSidebar-header">
        <div className="MarketsSidebar-title">
          <Trans>Markets</Trans>
        </div>
        <div className="MarketsSidebar-filters">
          <button className="filter-btn active">
            <Trans>Gainers</Trans>
          </button>
          <button className="filter-btn">
            <Trans>Losers</Trans>
          </button>
          <button className="filter-btn">
            <Trans>Volume</Trans>
          </button>
        </div>
      </div>

      <div className="MarketsSidebar-list">
        <div className="MarketsSidebar-list-header">
          <div className="col-market"><Trans>Market</Trans></div>
          <div className="col-price"><Trans>Price</Trans></div>
          <div className="col-change"><Trans>Change</Trans></div>
          <div className="col-volume"><Trans>Vol.</Trans></div>
        </div>

        {tradingPairs.map((token) => {
          const price = getTokenPrice(token.address);
          const volume = getTokenVolume(token.address);
          const priceChange = getPriceChange(token.address);
          const isSelected = selectedToken?.address === token.address;
          const isPositive = priceChange >= 0;

          return (
            <div
              key={token.address}
              className={`MarketsSidebar-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectToken(token)}
            >
              <div className="col-market">
                <div className="market-name">
                  {token.symbol} / <span className="quote">USDT</span>
                </div>
                <div className="market-vol">
                  Vol: {volume}
                </div>
              </div>
              <div className="col-price">
                ${price}
              </div>
              <div className={`col-change ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>

      <div className="MarketsSidebar-presets">
        <div className="presets-title"><Trans>Presets</Trans></div>
        <div className="preset-buttons">
          <button className="preset-btn"><Trans>Default</Trans></button>
        </div>
        <div className="preset-hint">
          <Trans>Save presets for leverage, split orders & basket sizes.</Trans>
        </div>
        
        <div className="quick-filters-title"><Trans>Quick filters</Trans></div>
        <div className="quick-filter-buttons">
          <button className="quick-filter-btn"><Trans>Gainers</Trans></button>
          <button className="quick-filter-btn"><Trans>Losers</Trans></button>
          <button className="quick-filter-btn"><Trans>Volume</Trans></button>
        </div>
      </div>
    </div>
  );
}

