// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

import { Vamm } from "./Vamm.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Decimal } from "../libraries/Decimal.sol";

/**
 * @title Pool
 * @notice Manages liquidity provision for the vAMM
 * @dev Handles LP deposits, withdrawals, and fee distribution
 */
contract Pool {
    using Decimal for Decimal.D256;

    Vamm public vamm;
    IERC20 public collateralToken;
    Decimal.D256 public totalSupply;
    
    mapping(address => Decimal.D256) public lpBalances;
    Decimal.D256 public accumulatedFees;
    
    address public clearingHouse;
    address public admin;

    uint256 public constant MINIMUM_LIQUIDITY = 1000; // Minimum LP tokens to prevent division by zero

    event LiquidityAdded(address indexed provider, uint256 amount, uint256 shares);
    event LiquidityRemoved(address indexed provider, uint256 amount, uint256 shares);
    event FeesCollected(uint256 amount);
    event RewardsClaimed(address indexed provider, uint256 amount);

    modifier onlyClearingHouse() {
        require(msg.sender == clearingHouse, "Only ClearingHouse");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(
        address _vamm, 
        address _collateralToken,
        address _clearingHouse
    ) {
        vamm = Vamm(_vamm);
        collateralToken = IERC20(_collateralToken);
        clearingHouse = _clearingHouse;
        admin = msg.sender;
        totalSupply = Decimal.zero();
        accumulatedFees = Decimal.zero();
    }

    /**
     * @notice Add liquidity to the pool
     * @param amount Amount of collateral to add
     * @return shares Amount of LP shares minted
     */
    function addLiquidity(Decimal.D256 memory amount) external returns (Decimal.D256 memory) {
        require(amount.value > 0, "Amount must be positive");
        
        collateralToken.transferFrom(msg.sender, address(this), amount.value);
        
        Decimal.D256 memory shares;
        
        if (totalSupply.isZero()) {
            // First liquidity provider
            shares = amount;
            // Lock minimum liquidity permanently
            require(shares.value >= MINIMUM_LIQUIDITY, "Insufficient initial liquidity");
        } else {
            // Calculate shares proportional to pool value
            Decimal.D256 memory poolValue = getTotalValue();
            shares = amount.mulD(totalSupply).divD(poolValue);
        }
        
        lpBalances[msg.sender] = lpBalances[msg.sender].add(shares);
        totalSupply = totalSupply.add(shares);
        
        emit LiquidityAdded(msg.sender, amount.value, shares.value);
        
        return shares;
    }

    /**
     * @notice Remove liquidity from the pool
     * @param shares Amount of LP shares to burn
     * @return amount Amount of collateral returned
     */
    function removeLiquidity(Decimal.D256 memory shares) external returns (Decimal.D256 memory) {
        require(shares.value > 0, "Shares must be positive");
        require(lpBalances[msg.sender].gte(shares), "Insufficient shares");
        
        // Calculate collateral amount
        Decimal.D256 memory poolValue = getTotalValue();
        Decimal.D256 memory amount = shares.mulD(poolValue).divD(totalSupply);
        
        lpBalances[msg.sender] = lpBalances[msg.sender].sub(shares);
        totalSupply = totalSupply.sub(shares);
        
        collateralToken.transfer(msg.sender, amount.value);
        
        emit LiquidityRemoved(msg.sender, amount.value, shares.value);
        
        return amount;
    }

    /**
     * @notice Collect trading fees from the vAMM
     * @param feeAmount Amount of fees to collect
     */
    function collectTradingFee(Decimal.D256 memory feeAmount) external onlyClearingHouse {
        accumulatedFees = accumulatedFees.add(feeAmount);
        emit FeesCollected(feeAmount.value);
    }

    /**
     * @notice Claim accumulated rewards
     * @return rewards Amount of rewards claimed
     */
    function claimRewards() external returns (Decimal.D256 memory) {
        require(lpBalances[msg.sender].value > 0, "No LP position");
        
        // Calculate pro-rata share of accumulated fees
        Decimal.D256 memory rewards = accumulatedFees.mulD(lpBalances[msg.sender]).divD(totalSupply);
        
        require(rewards.value > 0, "No rewards to claim");
        
        accumulatedFees = accumulatedFees.sub(rewards);
        collateralToken.transfer(msg.sender, rewards.value);
        
        emit RewardsClaimed(msg.sender, rewards.value);
        
        return rewards;
    }

    /**
     * @notice Get total pool value (simplified)
     * @return Total value in collateral token
     */
    function getTotalValue() public view returns (Decimal.D256 memory) {
        // In a real implementation, this would calculate the value of virtual reserves
        // plus accumulated fees and other pool assets
        // Simplified: return collateral balance
        uint256 balance = collateralToken.balanceOf(address(this));
        return Decimal.d256(balance);
    }

    /**
     * @notice Get LP's share of the pool
     * @param provider LP address
     * @return value Value of LP's position
     */
    function getLiquidityValue(address provider) external view returns (Decimal.D256 memory) {
        if (totalSupply.isZero()) return Decimal.zero();
        
        Decimal.D256 memory poolValue = getTotalValue();
        return lpBalances[provider].mulD(poolValue).divD(totalSupply);
    }

    /**
     * @notice Get pending rewards for an LP
     * @param provider LP address
     * @return rewards Pending reward amount
     */
    function getPendingRewards(address provider) external view returns (Decimal.D256 memory) {
        if (totalSupply.isZero()) return Decimal.zero();
        
        return accumulatedFees.mulD(lpBalances[provider]).divD(totalSupply);
    }

    /**
     * @notice Get LP balance
     * @param provider LP address
     * @return balance LP share balance
     */
    function balanceOf(address provider) external view returns (uint256) {
        return lpBalances[provider].value;
    }

    /**
     * @notice Get total LP supply
     * @return Total LP tokens
     */
    function getTotalSupply() external view returns (uint256) {
        return totalSupply.value;
    }

    /**
     * @notice Get accumulated fees
     * @return Total accumulated fees
     */
    function getAccumulatedFees() external view returns (uint256) {
        return accumulatedFees.value;
    }
}
