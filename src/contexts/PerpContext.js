import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import { getContract } from 'config/contracts';
import { useChainId } from 'lib/chains';
import PerpSDK from '../perp/frontend-sdk/perp-sdk';

const PerpContext = createContext();

export const usePerp = () => {
  const context = useContext(PerpContext);
  if (!context) {
    throw new Error('usePerp must be used within a PerpProvider');
  }
  return context;
};

export const PerpProvider = ({ children }) => {
  const { library, account, active } = useWeb3React();
  const { chainId } = useChainId();
  const [perpSDK, setPerpSDK] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [positions, setPositions] = useState({});
  const [accountInfo, setAccountInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize PerpSDK when wallet connects
  useEffect(() => {
    const initializeSDK = async () => {
      if (!active || !library || !account || !chainId) {
        setPerpSDK(null);
        setIsInitialized(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get contract addresses for current chain
        const perpAddresses = {
          clearingHouse: getContract(chainId, 'PerpClearingHouse'),
          accountBalance: getContract(chainId, 'PerpAccountBalance'),
          insuranceFund: getContract(chainId, 'PerpInsuranceFund'),
          funding: getContract(chainId, 'PerpFunding'),
          oracle: getContract(chainId, 'PerpOracle'),
          vammETH: getContract(chainId, 'PerpVammETH'),
          pool: getContract(chainId, 'PerpPool'),
          exchangeRouter: getContract(chainId, 'PerpExchangeRouter'),
        };

        // Create signer
        const signer = library.getSigner();

        // Initialize SDK
        const sdk = new PerpSDK(library, signer, perpAddresses);
        await sdk.init();

        setPerpSDK(sdk);
        setIsInitialized(true);

        // Load initial data
        await loadAccountData(sdk, account);
      } catch (err) {
        console.error('Failed to initialize PerpSDK:', err);
        setError(err.message);
        setIsInitialized(false);
      } finally {
        setLoading(false);
      }
    };

    initializeSDK();
  }, [active, library, account, chainId]);

  // Load account data
  const loadAccountData = async (sdk, userAccount) => {
    try {
      // Get account info
      const info = await sdk.getAccountInfo(userAccount);
      setAccountInfo(info);

      // Get positions for ETH market (for now)
      const ethTokenAddress = getContract(chainId, 'PerpVammETH');
      const position = await sdk.getPosition(userAccount, ethTokenAddress);
      
      if (position.size !== 0) {
        setPositions(prev => ({
          ...prev,
          [ethTokenAddress]: position
        }));
      }
    } catch (err) {
      console.error('Failed to load account data:', err);
    }
  };

  // Open position
  const openPosition = async (params) => {
    if (!perpSDK) throw new Error('PerpSDK not initialized');
    
    try {
      setLoading(true);
      const tx = await perpSDK.openPosition(params);
      
      // Reload account data after successful transaction
      await loadAccountData(perpSDK, account);
      
      return tx;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Close position
  const closePosition = async (params) => {
    if (!perpSDK) throw new Error('PerpSDK not initialized');
    
    try {
      setLoading(true);
      const tx = await perpSDK.closePosition(params);
      
      // Reload account data after successful transaction
      await loadAccountData(perpSDK, account);
      
      return tx;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add collateral
  const addCollateral = async (baseToken, amount) => {
    if (!perpSDK) throw new Error('PerpSDK not initialized');
    
    try {
      setLoading(true);
      const tx = await perpSDK.addCollateral(baseToken, amount);
      
      // Reload account data
      await loadAccountData(perpSDK, account);
      
      return tx;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove collateral
  const removeCollateral = async (baseToken, amount) => {
    if (!perpSDK) throw new Error('PerpSDK not initialized');
    
    try {
      setLoading(true);
      const tx = await perpSDK.removeCollateral(baseToken, amount);
      
      // Reload account data
      await loadAccountData(perpSDK, account);
      
      return tx;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get mark price
  const getMarkPrice = async (baseToken) => {
    if (!perpSDK) return null;
    try {
      return await perpSDK.getMarkPrice(baseToken);
    } catch (err) {
      console.error('Failed to get mark price:', err);
      return null;
    }
  };

  // Get index price
  const getIndexPrice = async (baseToken) => {
    if (!perpSDK) return null;
    try {
      return await perpSDK.getIndexPrice(baseToken);
    } catch (err) {
      console.error('Failed to get index price:', err);
      return null;
    }
  };

  // Get funding rate
  const getFundingRate = async (baseToken) => {
    if (!perpSDK) return null;
    try {
      return await perpSDK.getFundingRate(baseToken);
    } catch (err) {
      console.error('Failed to get funding rate:', err);
      return null;
    }
  };

  // Get price impact
  const getPriceImpact = async (baseToken, isLong, amount) => {
    if (!perpSDK) return null;
    try {
      return await perpSDK.getPriceImpact(baseToken, isLong, amount);
    } catch (err) {
      console.error('Failed to get price impact:', err);
      return null;
    }
  };

  const value = {
    perpSDK,
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
    loadAccountData: () => perpSDK && loadAccountData(perpSDK, account),
  };

  return (
    <PerpContext.Provider value={value}>
      {children}
    </PerpContext.Provider>
  );
};
