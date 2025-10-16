# LayerZero Cross-Chain Bridge Integration

## 🌉 Overview

This directory contains LayerZero integration for cross-chain perpetual trading. It enables seamless position management and token transfers across multiple chains including Arbitrum, U2U, Ethereum, and more.

## 📋 Features

### 🔄 Cross-Chain Token Transfers

- Bridge collateral between chains using LayerZero OFT (Omnichain Fungible Tokens)
- Automatic fee estimation
- Slippage protection
- Transaction tracking

### 📊 Cross-Chain Position Management

- Open positions on remote chains
- Close positions remotely
- Unified position tracking across chains
- Cross-chain liquidations

### 🔐 Security Features

- Native LayerZero security
- Automatic message verification
- Refund mechanisms
- Gas limit management

## 🚀 Quick Start

### 1. Import the Bridge

```javascript
import LayerZeroBridge, {
  LZ_CHAIN_IDS,
  LZ_ENDPOINTS,
} from "perp/bridge/layerzero";
```

### 2. Initialize

```javascript
const bridge = new LayerZeroBridge(provider, signer, chainId);
await bridge.init();

// Check if LayerZero is supported on current chain
if (!bridge.isSupported()) {
  console.warn("LayerZero not supported on this chain");
}
```

### 3. Register OFT Tokens

```javascript
// Register USDC OFT on Arbitrum
bridge.registerOFT("0x...USDCaddress", 42161);

// Register on U2U
bridge.registerOFT("0x...USDCaddress", 159);
```

## 📚 Usage Examples

### Bridge Tokens

```javascript
// Bridge 100 USDC from Arbitrum to U2U
const result = await bridge.bridgeTokens({
  toChainId: 159, // U2U Testnet
  toAddress: userAddress,
  tokenAddress: usdcAddress,
  amount: ethers.utils.parseUnits("100", 6), // 100 USDC
  slippageTolerancePercent: 0.5, // 0.5%
});

console.log(`Bridged! TX: ${result.txHash}`);
```

### Estimate Bridge Fee

```javascript
const fees = await bridge.estimateBridgeFee({
  toChainId: 42161,
  tokenAddress: usdcAddress,
  amount: ethers.utils.parseUnits("100", 6),
});

console.log(`Native fee: ${fees.nativeFee} ETH`);
console.log(`Total: ${fees.total} ETH`);
```

### Open Cross-Chain Position

```javascript
// Open a position on Arbitrum from U2U
const tx = await bridge.openCrossChainPosition({
  targetChainId: 42161, // Arbitrum
  clearingHouseAddress: "0x...ClearingHouse",
  baseToken: ethAddress,
  isLong: true,
  collateralAmount: ethers.utils.parseEther("1"),
  leverage: 10,
  minBaseAmount: ethers.utils.parseEther("0.95"),
});

console.log(`Cross-chain position opened: ${tx.txHash}`);
```

### Close Cross-Chain Position

```javascript
// Close a position on Arbitrum from U2U
const tx = await bridge.closeCrossChainPosition({
  targetChainId: 42161,
  clearingHouseAddress: "0x...ClearingHouse",
  baseToken: ethAddress,
  positionSize: ethers.utils.parseEther("10"),
  minQuoteAmount: ethers.utils.parseEther("950"),
});

console.log(`Cross-chain position closed: ${tx.txHash}`);
```

### Track Message Status

```javascript
// Get outbound nonce
const nonce = await bridge.getOutboundNonce(42161, userAddress);

// Check message status
const status = await bridge.getMessageStatus(42161, userAddress, nonce);
console.log(`Status: ${status.status}`); // "delivered" or "pending"
```

## 🔧 Integration with Exchange Component

### In Exchange.js

```javascript
import LayerZeroBridge from "perp/bridge/layerzero";
import PerpSDK from "perp/frontend-sdk/perp-sdk";

function Exchange() {
  const [lzBridge, setLzBridge] = useState(null);
  const [perpSDK, setPerpSDK] = useState(null);

  useEffect(() => {
    if (library && chainId) {
      // Initialize LayerZero Bridge
      const bridge = new LayerZeroBridge(library, library.getSigner(), chainId);
      bridge.init().then(() => {
        setLzBridge(bridge);

        // Register OFT tokens
        // USDC on different chains
        if (chainId === 42161) {
          // Arbitrum
          bridge.registerOFT(
            "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
            42161
          );
        } else if (chainId === 159) {
          // U2U
          bridge.registerOFT("0x...", 159);
        }
      });

      // Initialize Perp SDK
      const sdk = new PerpSDK(
        library,
        library.getSigner(),
        PERP_CONTRACTS[chainId]
      );
      sdk.init().then(() => setPerpSDK(sdk));
    }
  }, [library, chainId]);

  // Bridge tokens before trading
  const handleBridgeAndTrade = async () => {
    // 1. Bridge collateral to target chain
    await lzBridge.bridgeTokens({
      toChainId: 42161,
      toAddress: account,
      tokenAddress: usdcAddress,
      amount: collateralAmount,
    });

    // Wait for bridge confirmation (in production, use events)
    await new Promise((resolve) => setTimeout(resolve, 60000)); // ~1 min

    // 2. Open position on target chain
    await bridge.openCrossChainPosition({
      targetChainId: 42161,
      clearingHouseAddress: PERP_CONTRACTS[42161].ClearingHouse,
      baseToken: ethAddress,
      isLong: true,
      collateralAmount: collateralAmount,
      leverage: 10,
      minBaseAmount: minAmount,
    });
  };

  return (
    <div className="Exchange">
      {/* Your existing components */}

      {/* Cross-chain bridge UI */}
      {lzBridge && lzBridge.isSupported() && (
        <div className="CrossChain-controls">
          <button onClick={handleBridgeAndTrade}>
            Bridge & Trade on Arbitrum
          </button>
        </div>
      )}
    </div>
  );
}
```

### In SwapBox.js

```javascript
// Add chain selector
const [targetChain, setTargetChain] = useState(chainId);

// Check if cross-chain trading is needed
const isCrossChain = targetChain !== chainId;

// Modified submit handler
const onSubmit = async () => {
  if (isCrossChain && lzBridge) {
    // Use LayerZero bridge
    await handleCrossChainTrade();
  } else {
    // Use regular SDK
    await perpSDK.openPosition({...});
  }
};
```

## 🌐 Supported Chains

| Chain       | Chain ID | LZ Chain ID | Status                    |
| ----------- | -------- | ----------- | ------------------------- |
| Ethereum    | 1        | 101         | ✅ Supported              |
| Arbitrum    | 42161    | 110         | ✅ Supported              |
| Optimism    | 10       | 111         | ✅ Supported              |
| Polygon     | 137      | 109         | ✅ Supported              |
| BSC         | 56       | 102         | ✅ Supported              |
| Avalanche   | 43114    | 106         | ✅ Supported              |
| U2U Testnet | 159      | 159         | ⏳ Pending LZ Integration |

## 📊 LayerZero Architecture

```
┌─────────────┐           ┌──────────────┐           ┌─────────────┐
│   U2U Chain │           │  LayerZero   │           │  Arbitrum   │
│             │           │   Relayer    │           │             │
│  ┌────────┐ │           │              │           │  ┌────────┐ │
│  │  OFT   │─┼──send────▶│   Verify &   │──deliver─▶│  │  OFT   │ │
│  │ Token  │ │           │   Relay Msg  │           │  │ Token  │ │
│  └────────┘ │           │              │           │  └────────┘ │
│             │◀──confirm──│              │           │             │
└─────────────┘           └──────────────┘           └─────────────┘
```

## 🔐 Security Considerations

### Message Verification

- LayerZero uses Ultra Light Nodes (ULN) for verification
- Oracle + Relayer dual verification
- Configurable security parameters

### Gas Management

- Automatic gas estimation
- Configurable gas limits
- Refund mechanisms for excess gas

### Error Handling

- Retry mechanisms
- Failed message recovery
- Emergency pause functionality

## 📝 Advanced Configuration

### Custom Adapter Parameters

```javascript
// High-priority transaction
const adapterParams = ethers.utils.solidityPack(
  ["uint16", "uint256"],
  [1, 500000] // Version 1, 500k gas limit
);
```

### ZRO Token Payments

```javascript
// Pay fees in ZRO token instead of native
const { nativeFee, zroFee } = await oftContract.estimateSendFee(
  dstChainId,
  toAddress,
  amount,
  true, // Pay in ZRO
  adapterParams
);
```

## 🐛 Troubleshooting

### Issue: Transaction Stuck in Pending

**Solution**: Check message status and retry if needed

```javascript
const status = await bridge.getMessageStatus(srcChain, address, nonce);
if (status.status === "pending") {
  // Retry or contact LayerZero support
}
```

### Issue: Insufficient Gas on Destination

**Solution**: Increase gas limit in adapter params

```javascript
const adapterParams = ethers.utils.solidityPack(
  ["uint16", "uint256"],
  [1, 300000] // Increase to 300k
);
```

### Issue: U2U Chain Not Supported

**Solution**: U2U needs to integrate with LayerZero first

- Contact U2U team for LayerZero integration timeline
- Or use alternative bridge solutions temporarily
- Contribute to U2U LayerZero integration

## 🔗 Resources

- [LayerZero Docs](https://layerzero.gitbook.io/)
- [OFT Standard](https://layerzero.gitbook.io/docs/evm-guides/layerzero-omnichain-contracts/oft)
- [Endpoint Addresses](https://layerzero.gitbook.io/docs/technical-reference/mainnet/supported-chain-ids)
- [LayerZero Scan](https://layerzeroscan.com/) - Track cross-chain messages

## 📞 Support

- LayerZero Discord: https://discord.gg/layerzero
- GitHub: https://github.com/LayerZero-Labs
- Docs: https://layerzero.gitbook.io/

## ⚠️ Important Notes

1. **U2U Integration**: U2U chain needs official LayerZero integration. Contact U2U team.
2. **Gas Costs**: Cross-chain operations are more expensive. Always estimate fees first.
3. **Finality**: Messages take time to relay (typically 1-5 minutes).
4. **Testing**: Always test on testnets first!

## 🎯 Next Steps

1. **Deploy OFT Contracts**: Deploy LayerZero OFT contracts for your tokens
2. **Configure Endpoints**: Set up LayerZero endpoints on all chains
3. **Test Cross-Chain**: Thoroughly test cross-chain transfers
4. **Monitor Messages**: Set up monitoring for stuck messages
5. **User Education**: Educate users about cross-chain transaction times


