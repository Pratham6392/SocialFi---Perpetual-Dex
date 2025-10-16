# Perpetual Protocol Setup Guide

## 📋 Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- MetaMask or another Web3 wallet
- Some testnet tokens for deployment

## 🚀 Installation Steps

### Step 1: Navigate to Perp Directory

```bash
cd catalystv1/src/perp
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:

- Hardhat (Ethereum development environment)
- Hardhat Toolbox (testing, verification tools)
- OpenZeppelin contracts (secure contract templates)
- Ethers.js (Ethereum library)

### Step 3: Environment Configuration

```bash
cp env.example .env
```

Edit `.env` file:

```env
PRIVATE_KEY=your_wallet_private_key_here
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ARBISCAN_API_KEY=your_arbiscan_key_here
```

⚠️ **IMPORTANT**: Never commit your `.env` file!

## 🔨 Development Workflow

### Compile Contracts

```bash
npm run compile
```

This generates:

- Bytecode for deployment
- ABIs in `artifacts/` directory
- Type definitions (if using TypeScript)

### Run Tests

```bash
npm run test
```

Test files are in `test/perp.test.js`. Add more tests as you implement functionality.

### Local Development

```bash
# Terminal 1: Start local blockchain
npm run node

# Terminal 2: Deploy to local network
npm run deploy:local
```

## 🌐 Deployment

### Deploy to U2U Testnet

```bash
npm run deploy:u2u
```

### Deploy to Arbitrum Testnet

```bash
npm run deploy:arbitrum-sepolia
```

### Deploy to Arbitrum Mainnet

```bash
npm run deploy:arbitrum
```

After deployment, addresses are saved to `deployments/{network}.json`

## 🔗 Frontend Integration

### Step 1: Update Contract Addresses

After deployment, update `catalystv1/src/config/contracts.ts`:

```typescript
export const PERP_CONTRACTS = {
  [ARBITRUM]: {
    ClearingHouse: "0x...",
    AccountBalance: "0x...",
    Vamm: "0x...",
    ExchangeRouter: "0x...",
    Oracle: "0x...",
  },
  [U2U_TESTNET]: {
    ClearingHouse: "0x...",
    // ... etc
  },
};
```

### Step 2: Copy ABIs

Copy compiled ABIs to main abis folder:

```bash
# From perp directory
cp artifacts/contracts/core/ClearingHouse.sol/ClearingHouse.json ../abis/
cp artifacts/contracts/amm/Vamm.sol/Vamm.json ../abis/
# ... etc for all contracts
```

Or create a script:

```bash
# Create copy-abis.sh
#!/bin/bash
cp artifacts/contracts/core/ClearingHouse.sol/ClearingHouse.json ../abis/
cp artifacts/contracts/core/AccountBalance.sol/AccountBalance.json ../abis/
cp artifacts/contracts/amm/Vamm.sol/Vamm.json ../abis/
cp artifacts/contracts/periphery/ExchangeRouter.sol/ExchangeRouter.json ../abis/
cp artifacts/contracts/oracle/Oracle.sol/Oracle.json ../abis/
```

### Step 3: Initialize SDK in React

In `Exchange.js` or a custom hook:

```javascript
import PerpSDK from "perp/frontend-sdk/perp-sdk";
import { PERP_CONTRACTS } from "config/contracts";

const [perpSDK, setPerpSDK] = useState(null);

useEffect(() => {
  if (library && chainId) {
    const sdk = new PerpSDK(
      library,
      library.getSigner(),
      PERP_CONTRACTS[chainId]
    );

    sdk.init().then(() => {
      setPerpSDK(sdk);
    });
  }
}, [library, chainId]);
```

### Step 4: Use SDK Functions

```javascript
// Open position
const handleOpenPosition = async () => {
  if (!perpSDK) return;

  const tx = await perpSDK.openPosition({
    baseToken: selectedToken.address,
    isLong: swapOption === LONG,
    collateralAmount: parseEther(amount),
    leverage: leverageOption,
    slippageTolerance: savedSlippageAmount / 10000,
  });

  console.log("Position opened:", tx);
};

// Get position data
const fetchPosition = async () => {
  if (!perpSDK || !account) return;

  const position = await perpSDK.getPosition(account, baseToken);
  console.log("Position:", position);
};
```

## 📝 Implementation Checklist

### Phase 1: Core Contracts

- [ ] Implement ClearingHouse.openPosition()
- [ ] Implement ClearingHouse.closePosition()
- [ ] Implement ClearingHouse.liquidate()
- [ ] Implement AccountBalance functions
- [ ] Implement Funding rate calculations

### Phase 2: AMM

- [ ] Implement Vamm.swap()
- [ ] Implement price calculations
- [ ] Implement Pool liquidity functions
- [ ] Add LP rewards distribution

### Phase 3: Oracle

- [ ] Integrate Chainlink price feeds
- [ ] Implement TWAP calculations
- [ ] Add price staleness checks

### Phase 4: Testing

- [ ] Write unit tests for all contracts
- [ ] Test liquidation scenarios
- [ ] Test funding payments
- [ ] Test extreme market conditions
- [ ] Gas optimization tests

### Phase 5: Frontend

- [ ] Integrate SDK with SwapBox
- [ ] Display positions in PositionsList
- [ ] Show funding rates
- [ ] Add liquidation warnings
- [ ] Display PnL calculations

### Phase 6: Deployment

- [ ] Deploy to testnet
- [ ] Verify contracts on block explorer
- [ ] Test with real users
- [ ] Security audit
- [ ] Deploy to mainnet

## 🐛 Common Issues

### Issue: Cannot find module 'hardhat'

**Solution**: Run `npm install` in the perp directory

### Issue: Error: No deployments found

**Solution**: Run `npm run compile` first, then deploy

### Issue: Invalid private key

**Solution**: Ensure your .env PRIVATE_KEY is correct (without 0x prefix)

### Issue: Insufficient funds for gas

**Solution**: Get testnet tokens from faucet:

- Arbitrum Sepolia: https://faucet.quicknode.com/arbitrum/sepolia
- U2U Testnet: (check U2U documentation)

## 📚 Next Steps

1. **Read the Contracts**: Understand each contract's purpose
2. **Implement TODOs**: Fill in the contract logic step by step
3. **Write Tests**: Ensure everything works correctly
4. **Deploy & Test**: Test on testnet before mainnet
5. **Integrate UI**: Connect with your React components
6. **Monitor**: Set up monitoring for deployed contracts

## 🔐 Security Best Practices

1. **Never** commit `.env` file
2. **Always** test on testnet first
3. **Verify** contracts on block explorer
4. **Audit** before mainnet deployment
5. **Monitor** for unusual activity
6. **Implement** emergency pause mechanisms

## 📞 Support

- Check `README.md` for detailed documentation
- Review test files for usage examples
- See contract comments for function details
- Consult Perpetual Protocol documentation

Happy Building! 🚀
