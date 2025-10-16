import { ethers } from "ethers";

/**
 * LayerZero Bridge for Cross-Chain Perpetual Protocol
 * Enables seamless trading across U2U, Arbitrum, and other chains
 */

// LayerZero Chain IDs (different from EVM chain IDs)
const LZ_CHAIN_IDS = {
  ARBITRUM: 110, // Arbitrum LayerZero ID
  ETHEREUM: 101, // Ethereum LayerZero ID
  OPTIMISM: 111, // Optimism LayerZero ID
  POLYGON: 109, // Polygon LayerZero ID
  BSC: 102, // BSC LayerZero ID
  AVALANCHE: 106, // Avalanche LayerZero ID
  // U2U would need to be added to LayerZero
  U2U_TESTNET: 159, // Assuming U2U gets LayerZero integration
};

// LayerZero Endpoint addresses per chain
const LZ_ENDPOINTS = {
  // Mainnet Endpoints
  1: "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675", // Ethereum
  42161: "0x3c2269811836af69497E5F486A85D7316753cf62", // Arbitrum
  10: "0x3c2269811836af69497E5F486A85D7316753cf62", // Optimism
  137: "0x3c2269811836af69497E5F486A85D7316753cf62", // Polygon

  // Testnet Endpoints
  421614: "0x6098e96a28E02f27B1e6BD381f870F1C8Bd169d3", // Arbitrum Sepolia
  11155111: "0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1", // Ethereum Sepolia

  // U2U Testnet (if/when supported)
  159: "0x0000000000000000000000000000000000000000", // TODO: Update when U2U supports LayerZero
};

// LayerZero Endpoint ABI (simplified)
const LZ_ENDPOINT_ABI = [
  "function send(uint16 _dstChainId, bytes calldata _destination, bytes calldata _payload, address payable _refundAddress, address _zroPaymentAddress, bytes calldata _adapterParams) external payable",
  "function estimateFees(uint16 _dstChainId, address _userApplication, bytes calldata _payload, bool _payInZRO, bytes calldata _adapterParams) external view returns (uint256 nativeFee, uint256 zroFee)",
  "function getInboundNonce(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (uint64)",
  "function getOutboundNonce(uint16 _dstChainId, address _srcAddress) external view returns (uint64)",
];

// OFT (Omnichain Fungible Token) ABI for cross-chain token transfers
const OFT_ABI = [
  "function sendFrom(address _from, uint16 _dstChainId, bytes calldata _toAddress, uint256 _amount, address payable _refundAddress, address _zroPaymentAddress, bytes calldata _adapterParams) external payable",
  "function estimateSendFee(uint16 _dstChainId, bytes calldata _toAddress, uint256 _amount, bool _useZro, bytes calldata _adapterParams) external view returns (uint256 nativeFee, uint256 zroFee)",
];

class LayerZeroBridge {
  constructor(provider, signer, chainId) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;
    this.endpoint = null;
    this.oftTokens = {}; // OFT token contracts
  }

  /**
   * Initialize LayerZero endpoint
   */
  async init() {
    const endpointAddress = LZ_ENDPOINTS[this.chainId];
    if (!endpointAddress || endpointAddress === ethers.constants.AddressZero) {
      console.warn(`LayerZero not supported on chain ${this.chainId}`);
      return this;
    }

    this.endpoint = new ethers.Contract(endpointAddress, LZ_ENDPOINT_ABI, this.signer);
    return this;
  }

  /**
   * Register an OFT (Omnichain Fungible Token) for cross-chain transfers
   */
  registerOFT(tokenAddress, chainId) {
    if (!this.oftTokens[chainId]) {
      this.oftTokens[chainId] = {};
    }
    this.oftTokens[chainId][tokenAddress] = new ethers.Contract(tokenAddress, OFT_ABI, this.signer);
  }

  /**
   * Bridge tokens cross-chain using LayerZero OFT
   */
  async bridgeTokens({ toChainId, toAddress, tokenAddress, amount, slippageTolerancePercent = 0.5 }) {
    try {
      if (!this.oftTokens[this.chainId]?.[tokenAddress]) {
        throw new Error(`Token ${tokenAddress} not registered as OFT on chain ${this.chainId}`);
      }

      const oftContract = this.oftTokens[this.chainId][tokenAddress];
      const lzDstChainId = this.getLayerZeroChainId(toChainId);

      // Encode destination address for LayerZero
      const toAddressBytes = ethers.utils.solidityPack(["address"], [toAddress]);

      // Adapter parameters (empty for default settings)
      const adapterParams = ethers.utils.solidityPack(["uint16", "uint256"], [1, 200000]); // Version 1, gas limit

      // Estimate fees
      const { nativeFee } = await oftContract.estimateSendFee(
        lzDstChainId,
        toAddressBytes,
        amount,
        false, // Don't pay in ZRO
        adapterParams
      );

      // Add slippage to fee estimate
      const nativeFeeWithSlippage = nativeFee.mul(100 + slippageTolerancePercent * 100).div(10000);

      // Execute cross-chain transfer
      const tx = await oftContract.sendFrom(
        await this.signer.getAddress(),
        lzDstChainId,
        toAddressBytes,
        amount,
        await this.signer.getAddress(), // Refund address
        ethers.constants.AddressZero, // No ZRO payment
        adapterParams,
        { value: nativeFeeWithSlippage }
      );

      console.log(`Bridge transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: tx.hash,
        receipt,
        fromChain: this.chainId,
        toChain: toChainId,
        amount: amount.toString(),
      };
    } catch (error) {
      console.error("Error bridging tokens:", error);
      throw error;
    }
  }

  /**
   * Send custom cross-chain message via LayerZero
   * Useful for cross-chain position management
   */
  async sendCrossChainMessage({
    toChainId,
    targetContract,
    payload,
    gasLimit = 200000,
    nativeForDst = 0,
  }) {
    try {
      if (!this.endpoint) {
        throw new Error("LayerZero endpoint not initialized");
      }

      const lzDstChainId = this.getLayerZeroChainId(toChainId);

      // Encode destination address
      const destination = ethers.utils.solidityPack(["address", "address"], [targetContract, targetContract]);

      // Adapter parameters
      const adapterParams = ethers.utils.solidityPack(
        ["uint16", "uint256"],
        [1, gasLimit] // Version 1, custom gas limit
      );

      // Estimate fees
      const { nativeFee } = await this.endpoint.estimateFees(
        lzDstChainId,
        targetContract,
        payload,
        false,
        adapterParams
      );

      // Send message
      const tx = await this.endpoint.send(
        lzDstChainId,
        destination,
        payload,
        await this.signer.getAddress(),
        ethers.constants.AddressZero,
        adapterParams,
        { value: nativeFee.add(nativeForDst) }
      );

      console.log(`Cross-chain message sent: ${tx.hash}`);
      return await tx.wait();
    } catch (error) {
      console.error("Error sending cross-chain message:", error);
      throw error;
    }
  }

  /**
   * Open position on another chain via LayerZero
   * This allows users to open positions on Arbitrum from U2U, or vice versa
   */
  async openCrossChainPosition({
    targetChainId,
    clearingHouseAddress,
    baseToken,
    isLong,
    collateralAmount,
    leverage,
    minBaseAmount,
  }) {
    try {
      // Encode the function call for remote execution
      const payload = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "bool", "uint256", "uint256", "uint256"],
        [await this.signer.getAddress(), baseToken, isLong, collateralAmount, leverage, minBaseAmount]
      );

      const receipt = await this.sendCrossChainMessage({
        toChainId: targetChainId,
        targetContract: clearingHouseAddress,
        payload,
        gasLimit: 300000, // Higher gas for position opening
      });

      return {
        success: true,
        txHash: receipt.transactionHash,
        fromChain: this.chainId,
        toChain: targetChainId,
      };
    } catch (error) {
      console.error("Error opening cross-chain position:", error);
      throw error;
    }
  }

  /**
   * Close position on another chain via LayerZero
   */
  async closeCrossChainPosition({
    targetChainId,
    clearingHouseAddress,
    baseToken,
    positionSize,
    minQuoteAmount,
  }) {
    try {
      const payload = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256"],
        [await this.signer.getAddress(), baseToken, positionSize, minQuoteAmount]
      );

      const receipt = await this.sendCrossChainMessage({
        toChainId: targetChainId,
        targetContract: clearingHouseAddress,
        payload,
        gasLimit: 300000,
      });

      return {
        success: true,
        txHash: receipt.transactionHash,
        fromChain: this.chainId,
        toChain: targetChainId,
      };
    } catch (error) {
      console.error("Error closing cross-chain position:", error);
      throw error;
    }
  }

  /**
   * Get estimated fee for cross-chain operation
   */
  async estimateBridgeFee({ toChainId, tokenAddress, amount }) {
    try {
      if (!this.oftTokens[this.chainId]?.[tokenAddress]) {
        throw new Error(`Token ${tokenAddress} not registered as OFT`);
      }

      const oftContract = this.oftTokens[this.chainId][tokenAddress];
      const lzDstChainId = this.getLayerZeroChainId(toChainId);
      const toAddressBytes = ethers.utils.solidityPack(["address"], [await this.signer.getAddress()]);
      const adapterParams = ethers.utils.solidityPack(["uint16", "uint256"], [1, 200000]);

      const { nativeFee, zroFee } = await oftContract.estimateSendFee(
        lzDstChainId,
        toAddressBytes,
        amount,
        false,
        adapterParams
      );

      return {
        nativeFee: ethers.utils.formatEther(nativeFee),
        zroFee: ethers.utils.formatEther(zroFee),
        total: ethers.utils.formatEther(nativeFee.add(zroFee)),
      };
    } catch (error) {
      console.error("Error estimating bridge fee:", error);
      throw error;
    }
  }

  /**
   * Check if LayerZero is supported on current chain
   */
  isSupported() {
    const endpointAddress = LZ_ENDPOINTS[this.chainId];
    return endpointAddress && endpointAddress !== ethers.constants.AddressZero;
  }

  /**
   * Get LayerZero chain ID from EVM chain ID
   */
  getLayerZeroChainId(evmChainId) {
    const mapping = {
      1: LZ_CHAIN_IDS.ETHEREUM,
      42161: LZ_CHAIN_IDS.ARBITRUM,
      10: LZ_CHAIN_IDS.OPTIMISM,
      137: LZ_CHAIN_IDS.POLYGON,
      56: LZ_CHAIN_IDS.BSC,
      43114: LZ_CHAIN_IDS.AVALANCHE,
      159: LZ_CHAIN_IDS.U2U_TESTNET,
      // Add testnets
      421614: LZ_CHAIN_IDS.ARBITRUM, // Arbitrum Sepolia maps to Arbitrum LZ ID
      11155111: LZ_CHAIN_IDS.ETHEREUM, // Ethereum Sepolia maps to Ethereum LZ ID
    };

    return mapping[evmChainId] || evmChainId;
  }

  /**
   * Get supported destination chains for bridging
   */
  getSupportedChains() {
    return Object.keys(LZ_ENDPOINTS)
      .filter((chainId) => LZ_ENDPOINTS[chainId] !== ethers.constants.AddressZero)
      .map((chainId) => parseInt(chainId));
  }

  /**
   * Monitor cross-chain transaction status
   */
  async getMessageStatus(srcChainId, srcAddress, nonce) {
    try {
      if (!this.endpoint) {
        throw new Error("LayerZero endpoint not initialized");
      }

      const lzSrcChainId = this.getLayerZeroChainId(srcChainId);
      const srcAddressBytes = ethers.utils.solidityPack(["address"], [srcAddress]);

      const inboundNonce = await this.endpoint.getInboundNonce(lzSrcChainId, srcAddressBytes);

      return {
        expectedNonce: nonce,
        receivedNonce: inboundNonce.toNumber(),
        status: inboundNonce.toNumber() >= nonce ? "delivered" : "pending",
      };
    } catch (error) {
      console.error("Error checking message status:", error);
      return { status: "unknown", error: error.message };
    }
  }

  /**
   * Get outbound nonce for tracking
   */
  async getOutboundNonce(dstChainId, srcAddress) {
    try {
      if (!this.endpoint) {
        throw new Error("LayerZero endpoint not initialized");
      }

      const lzDstChainId = this.getLayerZeroChainId(dstChainId);
      const nonce = await this.endpoint.getOutboundNonce(lzDstChainId, srcAddress);

      return nonce.toNumber();
    } catch (error) {
      console.error("Error getting outbound nonce:", error);
      return 0;
    }
  }
}

export default LayerZeroBridge;

// Export constants for use in other files
export { LZ_CHAIN_IDS, LZ_ENDPOINTS };

