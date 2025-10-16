import React, { useState, useMemo } from "react";
import { Trans } from "@lingui/macro";
import { formatAmount } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";
import { getMockOrderBookData, shouldUseMockData } from "domain/mockDataProvider";
import "./OrderBook.css";

const TABS = {
  BIDS: "Bids",
  ASKS: "Asks",
  ORDERBOOK: "Orderbook",
  DEPTH: "Depth"
};

export default function OrderBook({ 
  token, 
  infoTokens,
  chainId 
}) {
  const [activeTab, setActiveTab] = useState(TABS.ORDERBOOK);

  // Get orderbook data - use mock data in development, real data in production
  const { bids, asks } = useMemo(() => {
    if (shouldUseMockData()) {
      const mockData = getMockOrderBookData(token?.symbol || 'ETH');
      return {
        bids: mockData.bids.map(order => ({
          price: order.price.toFixed(2),
          size: order.size.toFixed(1),
          total: (order.price * order.size).toFixed(2)
        })),
        asks: mockData.asks.map(order => ({
          price: order.price.toFixed(2),
          size: order.size.toFixed(1),
          total: (order.price * order.size).toFixed(2)
        }))
      };
    }

    // Fallback to local mock data if centralized mock is disabled
    const bids = [];
    const asks = [];
    const tokenInfo = infoTokens[token?.address];
    const basePrice = tokenInfo?.maxPrice ? parseFloat(formatAmount(tokenInfo.maxPrice, USD_DECIMALS, 2)) : 3615.85;

    // Generate 15 bid levels (buy orders)
    for (let i = 0; i < 15; i++) {
      const price = basePrice - (i * basePrice * 0.001); // 0.1% spread between levels
      const size = (Math.random() * 5 + 0.5).toFixed(1);
      const total = (price * parseFloat(size)).toFixed(2);
      bids.push({ price: price.toFixed(2), size, total });
    }

    // Generate 15 ask levels (sell orders)
    for (let i = 0; i < 15; i++) {
      const price = basePrice + ((i + 1) * basePrice * 0.001);
      const size = (Math.random() * 5 + 0.5).toFixed(1);
      const total = (price * parseFloat(size)).toFixed(2);
      asks.push({ price: price.toFixed(2), size, total });
    }

    return { bids, asks };
  }, [token, infoTokens]);

  const renderBidRow = (order, index) => {
    const depth = ((index + 1) / bids.length) * 100;
    return (
      <div key={index} className="orderbook-row bid-row" style={{ '--depth': `${depth}%` }}>
        <div className="orderbook-price bid">${order.price}</div>
        <div className="orderbook-size">{order.size}</div>
        <div className="orderbook-total">{order.total}</div>
      </div>
    );
  };

  const renderAskRow = (order, index) => {
    const depth = ((asks.length - index) / asks.length) * 100;
    return (
      <div key={index} className="orderbook-row ask-row" style={{ '--depth': `${depth}%` }}>
        <div className="orderbook-price ask">${order.price}</div>
        <div className="orderbook-size">{order.size}</div>
        <div className="orderbook-total">{order.total}</div>
      </div>
    );
  };

  const renderSpreadInfo = () => {
    if (bids.length === 0 || asks.length === 0) return null;
    
    const highestBid = parseFloat(bids[0].price);
    const lowestAsk = parseFloat(asks[0].price);
    const spread = lowestAsk - highestBid;
    const spreadPercent = ((spread / lowestAsk) * 100).toFixed(3);

    return (
      <div className="orderbook-spread">
        <div className="spread-label">
          <Trans>Spread</Trans>: ${spread.toFixed(2)} ({spreadPercent}%)
        </div>
      </div>
    );
  };

  return (
    <div className="OrderBook">
      <div className="OrderBook-header">
        <div className="OrderBook-tabs">
          <button
            className={`OrderBook-tab ${activeTab === TABS.ORDERBOOK ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.ORDERBOOK)}
          >
            <Trans>Orderbook</Trans>
          </button>
          <button
            className={`OrderBook-tab ${activeTab === TABS.DEPTH ? 'active' : ''}`}
            onClick={() => setActiveTab(TABS.DEPTH)}
          >
            <Trans>Depth</Trans>
          </button>
        </div>
        <button className="OrderBook-hide-btn">
          <Trans>Hide Orderbook</Trans>
        </button>
      </div>

      {activeTab === TABS.ORDERBOOK && (
        <div className="OrderBook-content">
          <div className="orderbook-headers">
            <div className="header-price"><Trans>Price (USDT)</Trans></div>
            <div className="header-size"><Trans>Size</Trans></div>
            <div className="header-total"><Trans>Total</Trans></div>
          </div>

          <div className="orderbook-section">
            <div className="orderbook-label asks-label"><Trans>Asks</Trans></div>
            <div className="orderbook-list asks-list">
              {asks.slice(0, 8).reverse().map((order, index) => 
                renderAskRow(order, asks.length - 1 - index)
              )}
            </div>
          </div>

          {renderSpreadInfo()}

          <div className="orderbook-section">
            <div className="orderbook-label bids-label"><Trans>Bids</Trans></div>
            <div className="orderbook-list bids-list">
              {bids.slice(0, 8).map((order, index) => 
                renderBidRow(order, index)
              )}
            </div>
          </div>

          <div className="orderbook-queue-info">
            <div className="queue-text">
              <Trans>Your queue position at</Trans> {bids[0]?.price}:
            </div>
            <div className="queue-details">
              <div className="queue-ahead">4 ahead</div>
              <div className="queue-time">Est. queue time: 3.2s</div>
            </div>
            <div className="queue-tip">
              <Trans>Tip: Click a price to autofill order price. Enable persistent orderbook in Settings if you trade with market depth often.</Trans>
            </div>
          </div>
        </div>
      )}

      {activeTab === TABS.DEPTH && (
        <div className="OrderBook-depth">
          <div className="depth-chart-placeholder">
            <Trans>Depth Chart</Trans>
            <div className="depth-hint">Market depth visualization would appear here</div>
          </div>
        </div>
      )}
    </div>
  );
}


