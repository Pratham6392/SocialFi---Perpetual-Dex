const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Perpetual Protocol Integration", function () {
  let clearingHouse, accountBalance, insuranceFund, vamm, oracle;
  let owner, trader1, trader2;
  const AddressZero = ethers.constants.AddressZero;

  beforeEach(async function () {
    [owner, trader1, trader2] = await ethers.getSigners();

    // Deploy Oracle
    const Oracle = await ethers.getContractFactory("Oracle");
    oracle = await Oracle.deploy();

    // Deploy InsuranceFund(collateralToken, clearingHouse)
    const InsuranceFund = await ethers.getContractFactory("InsuranceFund");
    insuranceFund = await InsuranceFund.deploy(
      AddressZero,
      AddressZero
    );

    // Deploy AccountBalance(clearingHouse, vault)
    const AccountBalance = await ethers.getContractFactory("AccountBalance");
    accountBalance = await AccountBalance.deploy(AddressZero, AddressZero);

    // Deploy ClearingHouse(vault, accountBalance, insuranceFund, exchange)
    const ClearingHouse = await ethers.getContractFactory("ClearingHouse");
    clearingHouse = await ClearingHouse.deploy(
      AddressZero,
      accountBalance.address,
      insuranceFund.address,
      AddressZero
    );

    // Deploy vAMM with Decimal structs
    const Vamm = await ethers.getContractFactory("Vamm");
    const virtualBase = { value: ethers.utils.parseEther("1000") };
    const virtualQuote = { value: ethers.utils.parseEther("2000000") };
    vamm = await Vamm.deploy(virtualBase, virtualQuote, clearingHouse.address);

    // Add a market: using vamm address as placeholder baseToken (since no real base token)
    await clearingHouse.addMarket(vamm.address, vamm.address, 10000);
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

    it("Should open and then close a position", async function () {
      const baseToken = vamm.address;
      const collateral = ethers.utils.parseEther("100");
      const leverageBps = 1000; // 10x

      const baseAmount = await clearingHouse
        .connect(trader1)
        .callStatic.openPosition(baseToken, true, collateral, leverageBps, 0);
      expect(baseAmount).to.equal(collateral.mul(leverageBps).div(10000));

      await expect(
        clearingHouse.connect(trader1).openPosition(baseToken, true, collateral, leverageBps, 0)
      ).to.emit(clearingHouse, "PositionChanged");

      const pos = await clearingHouse.getPosition(trader1.address, baseToken);
      expect(pos.size).to.equal(baseAmount);
      expect(pos.collateral).to.equal(collateral);
      expect(pos.openNotional).to.equal(collateral.mul(leverageBps).div(10000));

      await expect(
        clearingHouse.connect(trader1).closePosition(baseToken, 10000)
      ).to.emit(clearingHouse, "PositionChanged");

      const posAfter = await clearingHouse.getPosition(trader1.address, baseToken);
      expect(posAfter.size).to.equal(0);
      expect(posAfter.collateral).to.equal(0);
      expect(posAfter.openNotional).to.equal(0);
    });

    it("Should revert when leverage exceeds max", async function () {
      const baseToken = vamm.address;
      const collateral = ethers.utils.parseEther("10");
      await expect(
        clearingHouse.connect(trader1).openPosition(baseToken, true, collateral, 10001, 0)
      ).to.be.revertedWith("Leverage too high");
    });
  });

  describe("AccountBalance", function () {
    it("Should deploy successfully", async function () {
      expect(accountBalance.address).to.properAddress;
    });

    it("Should have correct initial margin ratio", async function () {
      const ratio = await accountBalance.INITIAL_MARGIN_RATIO();
      expect(ratio).to.equal(100);
    });

    it("Should allow deposit and withdraw by clearingHouse", async function () {
      // Deploy a fresh AccountBalance with clearingHouse set to owner for this unit test
      const AB = await ethers.getContractFactory("AccountBalance");
      const ab = await AB.deploy(owner.address, AddressZero);

      const trader = trader1.address;
      const d50 = { value: ethers.utils.parseEther("50") };
      await expect(ab.connect(owner).deposit(trader, d50)).to.emit(ab, "CollateralAdded");
      expect(await ab.getCollateral(trader)).to.equal(ethers.utils.parseEther("50"));

      const d20 = { value: ethers.utils.parseEther("20") };
      await expect(ab.connect(owner).withdraw(trader, d20)).to.emit(ab, "CollateralRemoved");
      expect(await ab.getCollateral(trader)).to.equal(ethers.utils.parseEther("30"));
    });
  });

  describe("vAMM", function () {
    it("Should deploy successfully", async function () {
      expect(vamm.address).to.properAddress;
    });

    it("Should have correct initial reserves and k", async function () {
      const [base, quote] = await vamm.getReserves();
      expect(base.value).to.equal(ethers.utils.parseEther("1000"));
      expect(quote.value).to.equal(ethers.utils.parseEther("2000000"));
      const k = await vamm.getK();
      const expectedK = ethers.utils
        .parseEther("1000")
        .mul(ethers.utils.parseEther("2000000"))
        .div(ethers.utils.parseEther("1"));
      expect(k).to.equal(expectedK);
    });

    it("Should compute amountOut and price impact", async function () {
      const amountIn = ethers.utils.parseEther("1000");
      const outLong = await vamm.getAmountOut(true, amountIn);
      const outShort = await vamm.getAmountOut(false, amountIn);
      expect(outLong).to.be.gt(0);
      expect(outShort).to.be.gt(0);
      const impact = await vamm.getPriceImpact(true, amountIn);
      expect(impact).to.be.gte(0);
    });
  });

  describe("InsuranceFund", function () {
    it("Should deploy successfully", async function () {
      expect(insuranceFund.address).to.properAddress;
    });

    it("Should start with zero balance and not healthy", async function () {
      const bal = await insuranceFund.getBalance();
      expect(bal).to.equal(0);
      const healthy = await insuranceFund.isHealthy();
      expect(healthy).to.equal(false);
    });
  });

  describe("Oracle", function () {
    it("Should deploy successfully", async function () {
      expect(oracle.address).to.properAddress;
    });

    it("Should set deployer as admin", async function () {
      const admin = await oracle.admin();
      expect(admin).to.equal(owner.address);
    });

    it("Should add price feed and fetch price", async function () {
      const MockAgg = await ethers.getContractFactory("MockAggregator");
      const feed = await MockAgg.deploy(8, 200000000000); // 2000.00000000
      const heartbeat = 3600; // 1h

      await oracle.addPriceFeed(vamm.address, feed.address, heartbeat);
      const info = await oracle.getPriceFeedInfo(vamm.address);
      expect(info.feedAddress).to.equal(feed.address);
      expect(info.heartbeat).to.equal(heartbeat);
      expect(info.isActive).to.equal(true);

      const price = await oracle.getIndexPrice(vamm.address);
      // normalized to 18 decimals => 2000 * 1e18
      expect(price.value).to.equal(ethers.utils.parseEther("2000"));

      // TWAP returns cached price (simplified)
      const twap = await oracle.getTwapPrice(vamm.address, 3600);
      expect(twap.value).to.equal(price.value);
    });
  });

  describe("Funding", function () {
    it("Should update and settle funding", async function () {
      const Funding = await ethers.getContractFactory("Funding");
      const funding = await Funding.deploy(owner.address);

      // Set short funding period to allow immediate update
      await funding.setFundingPeriod(1);

      // mark 2100, index 2000 => positive premium => longs pay shorts
      const res = await funding.connect(owner).updateFundingRate(
        vamm.address,
        ethers.utils.parseEther("2100").toString(),
        ethers.utils.parseEther("2000").toString(),
        0,
        0
      );
      await res.wait();

      const [longRate, shortRate] = await funding.getFundingRate(vamm.address);
      // Sanity: cumulative funding updated and last funding time set
      const last = await funding.getLastFundingTime(vamm.address);
      expect(last).to.be.gt(0);

      // Settle for a long position size of 1 ETH (1e18)
      const settlement = await funding.connect(owner).settleFunding(trader1.address, vamm.address, ethers.utils.parseEther("1").toString());
      await settlement.wait();

      const pending = await funding.getPendingFunding(trader1.address, vamm.address, ethers.utils.parseEther("1").toString());
      // After settle, pending should be ~0
      expect(pending.value).to.equal(0);
    });
  });

  describe("Liquidation & Margin", function () {
    it("Should revert liquidation when position not liquidatable", async function () {
      const baseToken = vamm.address;
      const collateral = ethers.utils.parseEther("100");
      const leverageBps = 1000; // 10x -> margin ratio = 1% > 0.5%
      await clearingHouse.connect(trader1).openPosition(baseToken, true, collateral, leverageBps, 0);
      await expect(
        clearingHouse.connect(trader2).liquidate(trader1.address, baseToken)
      ).to.be.revertedWith("Not liquidatable");
    });

    it("Should return zero margin ratio when no positions", async function () {
      const ratio = await accountBalance.getMarginRatio(trader1.address);
      expect(ratio).to.equal(0);
    });
  });

  describe("Oracle staleness", function () {
    it("Should mark price as stale after heartbeat", async function () {
      const MockAgg = await ethers.getContractFactory("MockAggregator");
      const feed = await MockAgg.deploy(8, 200000000000);
      const heartbeat = 10; // 10 seconds
      await oracle.addPriceFeed(vamm.address, feed.address, heartbeat);

      expect(await oracle.isPriceStale(vamm.address)).to.equal(false);

      // Increase time by 11 seconds
      await ethers.provider.send("evm_increaseTime", [11]);
      await ethers.provider.send("evm_mine", []);

      expect(await oracle.isPriceStale(vamm.address)).to.equal(true);
    });
  });
});

