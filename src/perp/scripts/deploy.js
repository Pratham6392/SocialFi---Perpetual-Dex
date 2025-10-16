const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of Perp Protocol contracts...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Step 1: Deploy Oracle
  console.log("\n1. Deploying Oracle...");
  const Oracle = await ethers.getContractFactory("Oracle");
  const oracle = await Oracle.deploy();
  await oracle.deployed();
  console.log("Oracle deployed to:", oracle.address);

  // Step 2: Deploy Vault (placeholder - use existing vault if available)
  const vaultAddress = process.env.VAULT_ADDRESS || ethers.constants.AddressZero;
  console.log("\n2. Using Vault at:", vaultAddress);

  // Step 3: Deploy InsuranceFund
  console.log("\n3. Deploying InsuranceFund...");
  const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
  const insuranceFund = await InsuranceFund.deploy(
    vaultAddress,
    ethers.constants.AddressZero // Will set ClearingHouse later
  );
  await insuranceFund.deployed();
  console.log("InsuranceFund deployed to:", insuranceFund.address);

  // Step 4: Deploy AccountBalance
  console.log("\n4. Deploying AccountBalance...");
  const AccountBalance = await ethers.getContractFactory("AccountBalance");
  const accountBalance = await AccountBalance.deploy();
  await accountBalance.deployed();
  console.log("AccountBalance deployed to:", accountBalance.address);

  // Step 5: Deploy Funding
  console.log("\n5. Deploying Funding...");
  const Funding = await ethers.getContractFactory("Funding");
  const funding = await Funding.deploy();
  await funding.deployed();
  console.log("Funding deployed to:", funding.address);

  // Step 6: Deploy ClearingHouse
  console.log("\n6. Deploying ClearingHouse...");
  const ClearingHouse = await ethers.getContractFactory("ClearingHouse");
  const clearingHouse = await ClearingHouse.deploy(
    vaultAddress,
    accountBalance.address,
    insuranceFund.address,
    ethers.constants.AddressZero // Exchange/Vamm to be set later
  );
  await clearingHouse.deployed();
  console.log("ClearingHouse deployed to:", clearingHouse.address);

  // Step 7: Deploy vAMM for ETH market (example)
  console.log("\n7. Deploying vAMM for ETH...");
  const Vamm = await ethers.getContractFactory("Vamm");
  const ethBaseToken = process.env.ETH_TOKEN_ADDRESS || ethers.constants.AddressZero;
  const vammETH = await Vamm.deploy(
    ethBaseToken,
    ethers.utils.parseEther("1000"), // Initial base reserve
    ethers.utils.parseEther("2000000") // Initial quote reserve (price ~2000)
  );
  await vammETH.deployed();
  console.log("vAMM ETH deployed to:", vammETH.address);

  // Step 8: Deploy Pool for liquidity
  console.log("\n8. Deploying Pool...");
  const Pool = await ethers.getContractFactory("Pool");
  const pool = await Pool.deploy();
  await pool.deployed();
  console.log("Pool deployed to:", pool.address);

  // Step 9: Deploy ExchangeRouter
  console.log("\n9. Deploying ExchangeRouter...");
  const ExchangeRouter = await ethers.getContractFactory("ExchangeRouter");
  const exchangeRouter = await ExchangeRouter.deploy(
    clearingHouse.address,
    vaultAddress,
    accountBalance.address
  );
  await exchangeRouter.deployed();
  console.log("ExchangeRouter deployed to:", exchangeRouter.address);

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("Oracle:", oracle.address);
  console.log("InsuranceFund:", insuranceFund.address);
  console.log("AccountBalance:", accountBalance.address);
  console.log("Funding:", funding.address);
  console.log("ClearingHouse:", clearingHouse.address);
  console.log("vAMM (ETH):", vammETH.address);
  console.log("Pool:", pool.address);
  console.log("ExchangeRouter:", exchangeRouter.address);

  // Save addresses to file
  const fs = require("fs");
  const addresses = {
    network: hre.network.name,
    oracle: oracle.address,
    insuranceFund: insuranceFund.address,
    accountBalance: accountBalance.address,
    funding: funding.address,
    clearingHouse: clearingHouse.address,
    vammETH: vammETH.address,
    pool: pool.address,
    exchangeRouter: exchangeRouter.address,
  };

  fs.writeFileSync(
    `./deployments/${hre.network.name}.json`,
    JSON.stringify(addresses, null, 2)
  );
  console.log(`\nAddresses saved to ./deployments/${hre.network.name}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

