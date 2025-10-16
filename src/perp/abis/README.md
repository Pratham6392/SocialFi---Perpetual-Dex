# Contract ABIs

This directory will contain the compiled ABIs (Application Binary Interfaces) for all Perpetual Protocol contracts.

## 📋 What are ABIs?

ABIs are JSON files that describe how to interact with smart contracts. They contain:

- Function signatures
- Parameter types
- Return types
- Events
- State variables

## 🔨 How ABIs are Generated

ABIs are automatically generated when you compile contracts:

```bash
npm run compile
```

This creates ABIs in the `artifacts/` directory, which are then copied here for frontend use.

## 📁 Expected Files

After compilation and deployment, you should have:

- `ClearingHouse.json` - Core trading contract ABI
- `AccountBalance.json` - Account management ABI
- `InsuranceFund.json` - Insurance fund ABI
- `Funding.json` - Funding rate ABI
- `Vamm.json` - Virtual AMM ABI
- `Pool.json` - Liquidity pool ABI
- `ExchangeRouter.json` - Router contract ABI
- `Oracle.json` - Price oracle ABI

## 🔗 Usage in Frontend

These ABIs are imported by the SDK:

```javascript
// In perp-sdk.js
const ClearingHouseABI = require("../abis/ClearingHouse.json");

const contract = new ethers.Contract(address, ClearingHouseABI, signer);
```

## 📝 Note

ABIs are auto-generated - **do not edit them manually**!

If contracts change:

1. Update the .sol files
2. Run `npm run compile`
3. ABIs will be regenerated automatically
