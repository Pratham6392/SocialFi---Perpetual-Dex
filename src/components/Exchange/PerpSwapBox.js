import React, { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { usePerp } from 'contexts/PerpContext';
import { useWeb3React } from '@web3-react/core';
import { getContract } from 'config/contracts';
import { useChainId } from 'lib/chains';
import './PerpSwapBox.scss';

const PerpSwapBox = () => {
  const { account } = useWeb3React();
  const { chainId } = useChainId();
  const {
    isInitialized,
    positions,
    accountInfo,
    loading,
    error,
    openPosition,
    closePosition,
    addCollateral,
    removeCollateral,
    getMarkPrice,
    getIndexPrice,
    getFundingRate,
    getPriceImpact,
  } = usePerp();

  // State
  const [selectedToken, setSelectedToken] = useState('ETH');
  const [tradeType, setTradeType] = useState('open'); // 'open', 'close', 'addCollateral', 'removeCollateral'
  const [direction, setDirection] = useState('long'); // 'long', 'short'
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(10); // 10x leverage
  const [slippage, setSlippage] = useState(0.5); // 0.5%
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');

  // Computed values
  const tokenAddress = getContract(chainId, 'PerpVammETH'); // For now, only ETH
  const currentPosition = positions[tokenAddress] || null;
  const markPrice = useMemo(() => {
    if (!isInitialized) return null;
    return getMarkPrice(tokenAddress);
  }, [isInitialized, tokenAddress]);

  const indexPrice = useMemo(() => {
    if (!isInitialized) return null;
    return getIndexPrice(tokenAddress);
  }, [isInitialized, tokenAddress]);

  const fundingRate = useMemo(() => {
    if (!isInitialized) return null;
    return getFundingRate(tokenAddress);
  }, [isInitialized, tokenAddress]);

  const priceImpact = useMemo(() => {
    if (!amount || !isInitialized) return null;
    return getPriceImpact(tokenAddress, direction === 'long', ethers.utils.parseEther(amount));
  }, [amount, direction, isInitialized, tokenAddress]);

  // Calculate liquidation price
  const liquidationPrice = useMemo(() => {
    if (!currentPosition || !markPrice) return null;
    
    const { size, collateral, entryPrice } = currentPosition;
    if (size.eq(0)) return null;

    const isLong = size.gt(0);
    const positionNotional = size.abs().mul(markPrice).div(ethers.utils.parseEther('1'));
    const leverageRatio = positionNotional.mul(ethers.utils.parseEther('1')).div(collateral);
    
    // Simplified liquidation price calculation
    const maintenanceMargin = ethers.utils.parseEther('0.05'); // 5% maintenance margin
    const liquidationPrice = isLong 
      ? entryPrice.mul(ethers.utils.parseEther('1').sub(maintenanceMargin)).div(ethers.utils.parseEther('1'))
      : entryPrice.mul(ethers.utils.parseEther('1').add(maintenanceMargin)).div(ethers.utils.parseEther('1'));
    
    return liquidationPrice;
  }, [currentPosition, markPrice]);

  // Calculate position size
  const positionSize = useMemo(() => {
    if (!amount || !leverage) return null;
    return ethers.utils.parseEther(amount).mul(leverage).div(100);
  }, [amount, leverage]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account || !isInitialized) return;

    try {
      setIsSubmitting(true);
      setTxHash('');

      let tx;
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

      switch (tradeType) {
        case 'open':
          tx = await openPosition({
            baseToken: tokenAddress,
            isLong: direction === 'long',
            collateralAmount: ethers.utils.parseEther(amount),
            leverage: leverage * 100, // Convert to basis points
            minBaseAmount: 0, // TODO: Calculate based on slippage
            deadline,
          });
          break;

        case 'close':
          if (!currentPosition) throw new Error('No position to close');
          tx = await closePosition({
            baseToken: tokenAddress,
            closeRatio: 10000, // Close 100% for now
            minQuoteAmount: 0,
            deadline,
          });
          break;

        case 'addCollateral':
          tx = await addCollateral(tokenAddress, ethers.utils.parseEther(amount));
          break;

        case 'removeCollateral':
          tx = await removeCollateral(tokenAddress, ethers.utils.parseEther(amount));
          break;

        default:
          throw new Error('Invalid trade type');
      }

      setTxHash(tx.hash);
      await tx.wait();
      
      // Reset form
      setAmount('');
    } catch (err) {
      console.error('Transaction failed:', err);
      alert(`Transaction failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="PerpSwapBox">
        <div className="PerpSwapBox-loading">
          <div className="loading-spinner" />
          <p>Initializing Perpetual Protocol...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="PerpSwapBox">
      <div className="PerpSwapBox-header">
        <h3>Perpetual Trading</h3>
        <div className="PerpSwapBox-mode">
          <button 
            className={tradeType === 'open' ? 'active' : ''}
            onClick={() => setTradeType('open')}
          >
            Open Position
          </button>
          <button 
            className={tradeType === 'close' ? 'active' : ''}
            onClick={() => setTradeType('close')}
            disabled={!currentPosition}
          >
            Close Position
          </button>
          <button 
            className={tradeType === 'addCollateral' ? 'active' : ''}
            onClick={() => setTradeType('addCollateral')}
          >
            Add Collateral
          </button>
          <button 
            className={tradeType === 'removeCollateral' ? 'active' : ''}
            onClick={() => setTradeType('removeCollateral')}
            disabled={!currentPosition}
          >
            Remove Collateral
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="PerpSwapBox-form">
        {/* Token Selection */}
        <div className="PerpSwapBox-token">
          <label>Asset</label>
          <div className="token-selector">
            <span className="token-symbol">{selectedToken}</span>
            <span className="token-name">Ethereum</span>
          </div>
        </div>

        {/* Direction Selection (only for opening positions) */}
        {tradeType === 'open' && (
          <div className="PerpSwapBox-direction">
            <label>Direction</label>
            <div className="direction-buttons">
              <button
                type="button"
                className={direction === 'long' ? 'active long' : 'long'}
                onClick={() => setDirection('long')}
              >
                Long
              </button>
              <button
                type="button"
                className={direction === 'short' ? 'active short' : 'short'}
                onClick={() => setDirection('short')}
              >
                Short
              </button>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div className="PerpSwapBox-amount">
          <label>Amount (USDC)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>

        {/* Leverage Slider (only for opening positions) */}
        {tradeType === 'open' && (
          <div className="PerpSwapBox-leverage">
            <label>Leverage: {leverage}x</label>
            <input
              type="range"
              min="1"
              max="100"
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="leverage-slider"
            />
            <div className="leverage-presets">
              {[1, 2, 5, 10, 20, 50].map(preset => (
                <button
                  key={preset}
                  type="button"
                  className={leverage === preset ? 'active' : ''}
                  onClick={() => setLeverage(preset)}
                >
                  {preset}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Slippage */}
        <div className="PerpSwapBox-slippage">
          <label>Slippage Tolerance: {slippage}%</label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={slippage}
            onChange={(e) => setSlippage(parseFloat(e.target.value))}
            className="slippage-slider"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="PerpSwapBox-submit"
          disabled={isSubmitting || loading || !amount}
        >
          {isSubmitting ? 'Processing...' : `${tradeType.charAt(0).toUpperCase() + tradeType.slice(1)} Position`}
        </button>

        {/* Transaction Hash */}
        {txHash && (
          <div className="PerpSwapBox-tx">
            <p>Transaction: <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash.slice(0, 10)}...</a></p>
          </div>
        )}
      </form>

      {/* Price Information */}
      <div className="PerpSwapBox-prices">
        <div className="price-row">
          <span>Mark Price:</span>
          <span>{markPrice ? ethers.utils.formatEther(markPrice) : 'Loading...'}</span>
        </div>
        <div className="price-row">
          <span>Index Price:</span>
          <span>{indexPrice ? ethers.utils.formatEther(indexPrice) : 'Loading...'}</span>
        </div>
        <div className="price-row">
          <span>Funding Rate:</span>
          <span className={fundingRate && fundingRate.gt(0) ? 'positive' : 'negative'}>
            {fundingRate ? `${ethers.utils.formatEther(fundingRate)}%` : 'Loading...'}
          </span>
        </div>
        {priceImpact && (
          <div className="price-row">
            <span>Price Impact:</span>
            <span>{ethers.utils.formatEther(priceImpact)}%</span>
          </div>
        )}
      </div>

      {/* Current Position */}
      {currentPosition && (
        <div className="PerpSwapBox-position">
          <h4>Current Position</h4>
          <div className="position-info">
            <div className="position-row">
              <span>Size:</span>
              <span className={currentPosition.size.gt(0) ? 'long' : 'short'}>
                {ethers.utils.formatEther(currentPosition.size.abs())} {selectedToken}
              </span>
            </div>
            <div className="position-row">
              <span>Collateral:</span>
              <span>{ethers.utils.formatEther(currentPosition.collateral)} USDC</span>
            </div>
            <div className="position-row">
              <span>Entry Price:</span>
              <span>${ethers.utils.formatEther(currentPosition.entryPrice)}</span>
            </div>
            {liquidationPrice && (
              <div className="position-row">
                <span>Liquidation Price:</span>
                <span className="warning">${ethers.utils.formatEther(liquidationPrice)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Info */}
      {accountInfo && (
        <div className="PerpSwapBox-account">
          <h4>Account Info</h4>
          <div className="account-info">
            <div className="account-row">
              <span>Total Collateral:</span>
              <span>{ethers.utils.formatEther(accountInfo.collateral)} USDC</span>
            </div>
            <div className="account-row">
              <span>Unrealized PnL:</span>
              <span className={accountInfo.unrealizedPnL.gt(0) ? 'positive' : 'negative'}>
                {ethers.utils.formatEther(accountInfo.unrealizedPnL.abs())} USDC
              </span>
            </div>
            <div className="account-row">
              <span>Margin Ratio:</span>
              <span>{ethers.utils.formatEther(accountInfo.marginRatio)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="PerpSwapBox-error">
          <p>Error: {error}</p>
        </div>
      )}
    </div>
  );
};

export default PerpSwapBox;
