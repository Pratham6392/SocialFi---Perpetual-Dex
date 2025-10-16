# Perpetual Protocol Integration

This directory contains the Perpetual Protocol smart contracts and SDK for the trading platform.

## 🏗️ Architecture

```
perp/
├── contracts/          # Solidity smart contracts
│   ├── core/          # Core trading logic
│   ├── amm/           # Virtual AMM implementation
│   ├── periphery/     # User-facing routers
│   └── oracle/        # Price oracles
├── scripts/           # Deployment scripts
├── test/              # Contract tests
├── frontend-sdk/      # JavaScript SDK for React
└── abis/              # Compiled contract ABIs (auto-generated)
```

## 📋 Core Contracts

### Core

- **ClearingHouse.sol** - Main entry point for opening/closing positions
- **AccountBalance.sol** - Tracks account balances, collateral, and PnL
- **InsuranceFund.sol** - Manages insurance fund for bad debt coverage
- **Funding.sol** - Handles funding rate calculations and payments

### AMM

- **Vamm.sol** - Virtual Automated Market Maker for price discovery
- **Pool.sol** - Liquidity pool management and LP rewards

### Periphery

- **ExchangeRouter.sol** - Simplified user interface for trading

### Oracle

- **Oracle.sol** - Price feeds from Chainlink or other sources

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd src/perp
npm install
```

### 2. Configure Environment

```bash
cp env.example .env
# Edit .env with your configuration
```

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Run Tests

```bash
npm run test
```

### 5. Deploy Contracts

**To U2U Testnet:**

```bash
npm run deploy:u2u
```

**To Arbitrum:**

```bash
npm run deploy:arbitrum
```

**To Local Network:**

```bash
npm run node  # In one terminal
npm run deploy:local  # In another terminal
```

## 🔧 Integration with Frontend

### 1. Import the SDK

```javascript
import PerpSDK from "perp/frontend-sdk/perp-sdk";
```

### 2. Initialize

```javascript
const sdk = new PerpSDK(provider, signer, contractAddresses);
await sdk.init();
```

### 3. Use in Components

```javascript
// Open a position
await sdk.openPosition({
  baseToken: ethTokenAddress,
  isLong: true,
  collateralAmount: ethers.utils.parseEther("100"),
  leverage: 10,
  slippageTolerance: 0.01,
});

// Get position info
const position = await sdk.getPosition(traderAddress, baseToken);

// Close position
await sdk.closePosition({
  baseToken: ethTokenAddress,
  positionSize: position.size,
  slippageTolerance: 0.01,
});
```

## 📊 Contract Addresses

After deployment, contract addresses are saved to `deployments/{network}.json`

Example:

```json
{
  "network": "arbitrum",
  "clearingHouse": "0x...",
  "accountBalance": "0x...",
  "vamm": "0x...",
  "oracle": "0x..."
}
```

## 🧪 Testing

Run all tests:

```bash
npm run test
```

Run specific test:

```bash
npx hardhat test test/perp.test.js
```

## 📝 Development Workflow

### Step 1: Implement Contract Logic

Each contract has TODO comments marking where implementation is needed.

### Step 2: Write Tests

Add comprehensive tests in `test/perp.test.js`

### Step 3: Deploy to Testnet

Test on U2U or Arbitrum testnet before mainnet

### Step 4: Integrate with Frontend

Use the SDK to connect contracts with React components

### Step 5: Generate ABIs

ABIs are auto-generated in `abis/` after compilation

## 🔐 Security Considerations

- [ ] Never commit private keys
- [ ] Use `.env` for sensitive data
- [ ] Audit contracts before mainnet deployment
- [ ] Test liquidation scenarios thoroughly
- [ ] Verify oracle price feeds
- [ ] Implement circuit breakers for extreme volatility

## 📚 Resources

- [Perpetual Protocol Docs](https://docs.perp.com/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Chainlink Price Feeds](https://docs.chain.link/data-feeds)

## 🐛 Troubleshooting

### Compilation Errors

```bash
npm run clean
npm run compile
```

### Deployment Failures

- Check RPC URL is correct
- Ensure you have enough gas
- Verify network configuration in `hardhat.config.js`

### ABI Not Found

- Run `npm run compile` first
- Check `artifacts/` directory was created

## 📞 Next Steps

1. **Implement Contract Functions**: Fill in TODO sections in each .sol file
2. **Write Comprehensive Tests**: Expand test coverage
3. **Deploy to Testnet**: Test in real environment
4. **Integrate with UI**: Connect SDK to Exchange.js component
5. **Add Liquidity Pools**: Enable LP staking and rewards
6. **Oracle Integration**: Connect Chainlink price feeds
