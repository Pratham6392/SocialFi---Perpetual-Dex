const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Perpetual Protocol Integration", function () {
  let clearingHouse, accountBalance, insuranceFund, vamm, oracle;
  let owner, trader1, trader2;

  beforeEach(async function () {
    [owner, trader1, trader2] = await ethers.getSigners();

    // Deploy Oracle
    const Oracle = await ethers.getContractFactory("Oracle");
    oracle = await Oracle.deploy();

    // Deploy AccountBalance
    const AccountBalance = await ethers.getContractFactory("AccountBalance");
    accountBalance = await AccountBalance.deploy();

    // Deploy InsuranceFund
    const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
    insuranceFund = await InsuranceFund.deploy(
      ethers.constants.AddressZero, // vault
      ethers.constants.AddressZero  // clearingHouse - will be set later
    );

    // Deploy ClearingHouse
    const ClearingHouse = await ethers.getContractFactory("ClearingHouse");
    clearingHouse = await ClearingHouse.deploy(
      ethers.constants.AddressZero,  // vault
      accountBalance.address,
      insuranceFund.address,
      ethers.constants.AddressZero   // exchange
    );

    // Deploy vAMM
    const Vamm = await ethers.getContractFactory("Vamm");
    vamm = await Vamm.deploy(
      ethers.constants.AddressZero, // baseToken
      ethers.utils.parseEther("1000"),    // 1000 ETH virtual reserve
      ethers.utils.parseEther("2000000")  // 2M USD virtual reserve
    );
  });

  describe("ClearingHouse", function () {
    it("Should deploy successfully", async function () {
      expect(clearingHouse.address).to.properAddress;
    });

    it("Should have correct vault address", async function () {
      const vault = await clearingHouse.vault();
      expect(vault).to.equal(ethers.constants.AddressZero);
    });

    it("Should have correct accountBalance address", async function () {
      const ab = await clearingHouse.accountBalance();
      expect(ab).to.equal(accountBalance.address);
    });

    // TODO: Add more tests in next step
    // - Test opening position
    // - Test closing position
    // - Test liquidation
    // - Test margin requirements
  });

  describe("AccountBalance", function () {
    it("Should deploy successfully", async function () {
      expect(accountBalance.address).to.properAddress;
    });

    it("Should have correct initial margin ratio", async function () {
      const ratio = await accountBalance.INITIAL_MARGIN_RATIO();
      expect(ratio).to.equal(100);
    });

    // TODO: Add more tests
    // - Test deposit
    // - Test withdraw
    // - Test margin calculations
  });

  describe("vAMM", function () {
    it("Should deploy successfully", async function () {
      expect(vamm.address).to.properAddress;
    });

    it("Should have correct initial reserves", async function () {
      const baseReserve = await vamm.virtualBaseReserve();
      const quoteReserve = await vamm.virtualQuoteReserve();
      
      expect(baseReserve).to.equal(ethers.utils.parseEther("1000"));
      expect(quoteReserve).to.equal(ethers.utils.parseEther("2000000"));
    });

    it("Should calculate k correctly", async function () {
      const k = await vamm.k();
      const expectedK = ethers.utils.parseEther("1000").mul(ethers.utils.parseEther("2000000"));
      expect(k).to.equal(expectedK);
    });

    // TODO: Add more tests
    // - Test swap functionality
    // - Test price calculation
    // - Test price impact
    // - Test funding rate updates
  });

  describe("InsuranceFund", function () {
    it("Should deploy successfully", async function () {
      expect(insuranceFund.address).to.properAddress;
    });

    it("Should have correct insurance fee ratio", async function () {
      const ratio = await insuranceFund.INSURANCE_FEE_RATIO();
      expect(ratio).to.equal(5000); // 50%
    });

    // TODO: Add more tests
    // - Test adding funds
    // - Test covering bad debt
    // - Test fee distribution
  });

  describe("Oracle", function () {
    it("Should deploy successfully", async function () {
      expect(oracle.address).to.properAddress;
    });

    it("Should set deployer as admin", async function () {
      const admin = await oracle.admin();
      expect(admin).to.equal(owner.address);
    });

    // TODO: Add more tests
    // - Test adding price feeds
    // - Test price fetching
    // - Test TWAP calculation
  });
});

