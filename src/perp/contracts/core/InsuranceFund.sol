// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

import { Decimal } from "../libraries/Decimal.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title InsuranceFund
 * @notice Manages insurance fund for covering bad debt
 * @dev Collects fees and covers losses from liquidations
 */
contract InsuranceFund {
    using Decimal for Decimal.D256;

    IERC20 public collateralToken;
    Decimal.D256 public totalBalance;
    address public clearingHouse;
    address public admin;

    mapping(address => Decimal.D256) public contributions; // Track individual contributions

    event FundAdded(address indexed contributor, uint256 amount);
    event FundUsed(address indexed trader, uint256 amount, uint256 badDebt);
    event LiquidationFeeReceived(uint256 amount);
    event FundWithdrawn(address indexed recipient, uint256 amount);

    modifier onlyClearingHouse() {
        require(msg.sender == clearingHouse, "Only ClearingHouse");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(address _collateralToken, address _clearingHouse) {
        collateralToken = IERC20(_collateralToken);
        clearingHouse = _clearingHouse;
        admin = msg.sender;
        totalBalance = Decimal.zero();
    }

    function addFund(Decimal.D256 memory amount) external {
        require(amount.value > 0, "Amount must be positive");
        
        collateralToken.transferFrom(msg.sender, address(this), amount.value);
        totalBalance = totalBalance.add(amount);
        contributions[msg.sender] = contributions[msg.sender].add(amount);
        
        emit FundAdded(msg.sender, amount.value);
    }

    function coverBadDebt(address trader, Decimal.D256 memory badDebt) external onlyClearingHouse returns (bool) {
        if (totalBalance.lt(badDebt)) {
            // Insufficient funds - cover what we can
            Decimal.D256 memory covered = totalBalance;
            totalBalance = Decimal.zero();
            emit FundUsed(trader, covered.value, badDebt.value);
            return false;
        }
        
        totalBalance = totalBalance.sub(badDebt);
        emit FundUsed(trader, badDebt.value, badDebt.value);
        return true;
    }

    function receiveLiquidationFee(Decimal.D256 memory fee) external onlyClearingHouse {
        collateralToken.transferFrom(msg.sender, address(this), fee.value);
        totalBalance = totalBalance.add(fee);
        emit LiquidationFeeReceived(fee.value);
    }

    function withdrawFund(address recipient, Decimal.D256 memory amount) external onlyAdmin {
        require(totalBalance.gte(amount), "Insufficient balance");
        
        totalBalance = totalBalance.sub(amount);
        collateralToken.transfer(recipient, amount.value);
        
        emit FundWithdrawn(recipient, amount.value);
    }

    function getInsuranceFundCapacity() external view returns (Decimal.D256 memory) {
        return totalBalance;
    }

    function getBalance() external view returns (uint256) {
        return totalBalance.value;
    }

    function getContribution(address contributor) external view returns (uint256) {
        return contributions[contributor].value;
    }

    function isHealthy() external view returns (bool) {
        // Insurance fund is considered healthy if it has at least some minimum balance
        // Simplified - in production, compare against total open interest
        return totalBalance.value > 0;
    }
}
