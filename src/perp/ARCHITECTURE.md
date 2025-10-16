# Perpetual Protocol Architecture

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Exchange.js │  │ SwapBox.js  │  │PositionsList│             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                 │                 │                    │
│         └─────────────────┴─────────────────┘                    │
│                           │                                       │
│                    ┌──────▼───────┐                             │
│                    │   Perp SDK   │                             │
│                    │ (perp-sdk.js)│                             │
│                    └──────┬───────┘                             │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   Web3/Ethers  │
                    └───────┬────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    SMART CONTRACTS                               │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    ExchangeRouter                         │  │
│  │              (User-facing Interface)                      │  │
│  └───────────┬──────────────────────────┬───────────────────┘  │
│              │                           │                       │
│  ┌───────────▼────────┐     ┌──────────▼───────────┐           │
│  │   ClearingHouse    │────▶│   AccountBalance     │           │
│  │  (Main Trading)    │     │  (Margin & Balance)  │           │
│  └─┬──────────────┬───┘     └──────────────────────┘           │
│    │              │                                              │
│  ┌─▼────────┐  ┌──▼──────────┐                                 │
│  │  vAMM    │  │InsuranceFund│                                 │
│  │(Pricing) │  │(Bad Debt)   │                                 │
│  └─┬────────┘  └─────────────┘                                 │
│    │                                                             │
│  ┌─▼────────┐  ┌──────────────┐                                │
│  │  Pool    │  │   Funding    │                                │
│  │(Liquidity│  │(Funding Rate)│                                │
│  └──────────┘  └──────────────┘                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Oracle                                │  │
│  │              (Chainlink Price Feeds)                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## 🔄 Trading Flow

### Opening a Position

```
User (Frontend)
    │
    ├─1. Select token, leverage, amount
    │
    ▼
Perp SDK
    │
    ├─2. Calculate min output (slippage protection)
    │
    ▼
ExchangeRouter
    │
    ├─3. Transfer collateral from user
    │
    ▼
ClearingHouse
    │
    ├─4. Check margin requirements
    │
    ▼
AccountBalance
    │
    ├─5. Update account balances
    │
    ▼
vAMM
    │
    ├─6. Execute swap (price discovery)
    │
    ▼
Funding
    │
    ├─7. Update funding index
    │
    └─8. Position opened ✅
```

### Closing a Position

```
User (Frontend)
    │
    ├─1. Request to close position
    │
    ▼
Perp SDK
    │
    ├─2. Get current position size
    │
    ▼
ExchangeRouter
    │
    ├─3. Calculate min output
    │
    ▼
ClearingHouse
    │
    ├─4. Close position via vAMM
    │
    ▼
vAMM
    │
    ├─5. Swap position for collateral
    │
    ▼
AccountBalance
    │
    ├─6. Calculate realized PnL
    │
    ├─7. Settle funding payments
    │
    ▼
ExchangeRouter
    │
    ├─8. Transfer collateral + PnL to user
    │
    └─9. Position closed ✅
```

### Liquidation Flow

```
Liquidation Bot
    │
    ├─1. Monitor positions
    │
    ▼
AccountBalance
    │
    ├─2. Check margin ratio < maintenance
    │
    ▼
ClearingHouse.liquidate()
    │
    ├─3. Close position forcefully
    │
    ▼
vAMM
    │
    ├─4. Execute liquidation swap
    │
    ▼
AccountBalance
    │
    ├─5. Calculate loss
    │
    ▼
InsuranceFund
    │
    ├─6. Cover bad debt (if any)
    │
    ├─7. Receive liquidation fee
    │
    └─8. Position liquidated ⚠️
```

## 📊 Data Flow

### Price Discovery

```
Chainlink Oracle
    │
    ├─ Index Price (Spot)
    │
    ▼
Oracle Contract
    │
    ├─ Store & validate price
    │
    ▼
vAMM
    │
    ├─ Mark Price = QuoteReserve / BaseReserve
    │
    ▼
Funding Contract
    │
    ├─ Funding Rate = (Mark - Index) / Index
    │
    └─ Premium/Discount
```

### Funding Rate Calculation

```
Every 8 hours:

1. Get Index Price from Oracle
2. Get Mark Price from vAMM
3. Calculate: Premium = (Mark - Index) / Index
4. Funding Rate = Premium * (8hr / 1yr) * 100%
5. If Mark > Index: Longs pay Shorts
6. If Mark < Index: Shorts pay Longs
7. Update cumulative funding index
```

## 🔐 Security Layers

### Layer 1: Input Validation

- Slippage protection
- Maximum leverage limits
- Minimum position size
- Deadline checks

### Layer 2: Margin Requirements

- Initial margin ratio (1% = 100x max)
- Maintenance margin ratio (0.5%)
- Real-time margin monitoring

### Layer 3: Risk Management

- Insurance fund for bad debt
- Liquidation incentives
- Price impact limits
- Circuit breakers (TODO)

### Layer 4: Oracle Security

- Price staleness checks
- Multiple price feeds (TODO)
- TWAP for manipulation resistance

## 📈 Key Metrics

### Position Metrics

- **Size**: Position size in base token
- **Collateral**: Margin deposited
- **Leverage**: Size / Collateral
- **Entry Price**: Average entry price
- **Mark Price**: Current vAMM price
- **Unrealized PnL**: (Mark - Entry) \* Size
- **Margin Ratio**: Collateral / Size

### Market Metrics

- **Open Interest**: Total long + short positions
- **Funding Rate**: Current funding rate
- **Index Price**: Oracle spot price
- **Mark Price**: vAMM price
- **Price Impact**: % change for trade
- **Liquidity**: Available in vAMM

### Account Metrics

- **Account Value**: Collateral + Unrealized PnL
- **Margin Ratio**: Account Value / Total Position Size
- **Buying Power**: Max position with current collateral
- **Liquidation Price**: Price at which margin ratio < maintenance

## 🎯 Core Concepts

### Virtual AMM (vAMM)

- **No real tokens**: Only virtual reserves
- **Constant Product**: x \* y = k
- **Price**: Quote / Base reserves
- **Slippage**: Larger trades = more slippage
- **Rebalancing**: Market makers adjust k

### Funding Rate

- **Purpose**: Keep perpetual price aligned with spot
- **Mechanism**: Periodic payments between longs/shorts
- **Direction**:
  - Mark > Index → Longs pay Shorts
  - Mark < Index → Shorts pay Longs
- **Frequency**: Every 8 hours
- **Cap**: Max ±10% per period

### Leverage & Margin

- **Initial Margin**: Collateral needed to open (1%)
- **Maintenance Margin**: Min to avoid liquidation (0.5%)
- **Max Leverage**: 100x (1% initial margin)
- **Cross Margin**: Shared across positions

### Liquidation

- **Trigger**: Margin ratio < maintenance
- **Process**: Position closed at market
- **Bad Debt**: Loss > collateral
- **Coverage**: Insurance fund pays
- **Incentive**: Liquidator receives fee

## 🔌 Integration Points

### Frontend → SDK

```javascript
const sdk = new PerpSDK(provider, signer, addresses);
await sdk.init();
await sdk.openPosition({...});
```

### SDK → Contracts

```javascript
const tx = await contracts.exchangeRouter.openPositionWithCollateral(
  baseToken,
  isLong,
  collateral,
  leverage,
  minOutput,
  deadline
);
```

### Contracts → Blockchain

```solidity
emit PositionChanged(trader, baseToken, size, notional, fee);
```

## 📝 Implementation Order

### Phase 1: Core Trading

1. ClearingHouse.openPosition()
2. ClearingHouse.closePosition()
3. AccountBalance (deposit, withdraw, update)
4. vAMM.swap() & price functions

### Phase 2: Risk Management

5. AccountBalance margin calculations
6. ClearingHouse.liquidate()
7. InsuranceFund integration

### Phase 3: Funding

8. Funding.updateFundingRate()
9. Funding.settleFunding()
10. Integration with positions

### Phase 4: Liquidity

11. Pool.addLiquidity()
12. Pool.removeLiquidity()
13. Fee distribution

### Phase 5: Oracle

14. Oracle.addPriceFeed()
15. Oracle.getPrice()
16. TWAP calculations

## 🚀 Deployment Flow

1. **Deploy Oracle** → Get price feeds working
2. **Deploy Vault** → Use existing or deploy new
3. **Deploy InsuranceFund** → Set up safety net
4. **Deploy AccountBalance** → Enable margin tracking
5. **Deploy Funding** → Set up funding mechanism
6. **Deploy ClearingHouse** → Core trading logic
7. **Deploy vAMM** → Price discovery per market
8. **Deploy Pool** → Liquidity provision
9. **Deploy ExchangeRouter** → User interface
10. **Configure** → Set permissions & parameters
11. **Verify** → On block explorer
12. **Test** → With real users on testnet

## 📚 Resources

- Contract code: `src/perp/contracts/`
- Tests: `src/perp/test/`
- SDK: `src/perp/frontend-sdk/`
- Deployment: `src/perp/scripts/`
