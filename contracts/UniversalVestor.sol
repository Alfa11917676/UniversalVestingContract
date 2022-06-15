//SPDX-License-Identifier: MIT

pragma solidity >=0.8.7;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract UniversalVestingContract is Ownable, Pausable {


    IERC20 token;


    struct Investor {
        address account;
        uint256 amount;
        uint256 investorType;
    }


    struct vestingDetails {
        uint investorType;
        uint totalBalance;
        uint lastClaimTime;
        uint initialToBeClaimed;
        uint intermediateToBeClaimed;
        uint linearToBeClaimed;
        uint initialClaimed;
        uint intermediateClaimed;
        uint linearClaimed;
        bool hasInitialClaimed;
        bool hasIntermediateClaim;
        bool hasLinearClaimed;
    }

    event InvestorAddress(address account, uint _amout,uint investorType);
    event VestingAmountTaken(address account, uint _amout);
    mapping (address => vestingDetails) public Investors;
    mapping (address => bool) public isUserAdded;
//    address public signer;

    uint initialVestingAmountWithdrawThresholdTime;
    uint intermediateVestingAmountWithdrawThresholdTime;
    uint linearVestingAmountWithdrawThresholdTime;
    uint[] public initialAmountReleased;
    uint[] public intermediateAmountReleased;
    uint[] public linearVestingAmountReleased; // stores percentage
    uint[] public intermediateVestingTimePeriod;
    uint[] public linearVestingTimePeriod;

    function addMinter(Investor[] memory vest) external onlyOwner {
        for (uint i = 0;i < vest.length;i++) {
            require (!isUserAdded[vest[i].account],'User already whitelisted');
            isUserAdded[vest[i].account] = true;
            vestingDetails memory vesting;
            vesting.investorType = vest[i].investorType;
            vesting.totalBalance = vest[i].amount;
            vesting.initialToBeClaimed = (initialAmountReleased[vest[i].investorType] * 100)/(vest[i].amount);
            vesting.intermediateToBeClaimed = (intermediateAmountReleased[vest[i].investorType] * 100)/vest[i].amount;
            vesting.linearToBeClaimed = (linearVestingAmountReleased[vest[i].investorType] * 100) / vest[i].amount;
            if (vesting.intermediateToBeClaimed >= 0) vesting.lastClaimTime = intermediateVestingAmountWithdrawThresholdTime;
            else if (vesting.intermediateToBeClaimed == 0 && vesting.linearToBeClaimed >=0) vesting.lastClaimTime = linearVestingAmountWithdrawThresholdTime;
            Investors[vest[i].account] = vesting;
            emit InvestorAddress(vest[i].account, vest[i].amount,vest[i].investorType);
        }
    }

    function withdraw() external whenNotPaused {
        require (isUserAdded[msg.sender],'User Not Added');
        require (!Investors[msg.sender].hasLinearClaimed,'Vesting: All Amount Claimed');
        (uint amount, uint returnType) = getVestingBalance(msg.sender);
        require(returnType != 4,'Time Period is Not Over');
        if (returnType == 1) {
            Investors[msg.sender].hasInitialClaimed = true;
            token.transfer(msg.sender, amount);
            emit VestingAmountTaken(msg.sender, amount);
        } else if (returnType == 2) {
            Investors[msg.sender].lastClaimTime = block.timestamp;
            Investors[msg.sender].intermediateClaimed+=amount;
            require (Investors[msg.sender].intermediateToBeClaimed >= Investors[msg.sender].intermediateClaimed,'Intermediate Vesting: Cannot Claim More');
            if (Investors[msg.sender].intermediateToBeClaimed ==  Investors[msg.sender].intermediateClaimed)
            {
                Investors[msg.sender].hasIntermediateClaim = true;
                Investors[msg.sender].lastClaimTime = linearVestingAmountWithdrawThresholdTime;
            }
            token.transfer(msg.sender, amount);
            emit VestingAmountTaken(msg.sender, amount);
        }
        else {
            Investors[msg.sender].lastClaimTime = block.timestamp;
            Investors[msg.sender].linearClaimed += amount;
            require (Investors[msg.sender].linearToBeClaimed >= Investors[msg.sender].linearClaimed,'Linear Besting: Cannot Claim More');
            if (Investors[msg.sender].linearToBeClaimed == Investors[msg.sender].linearClaimed)
            {
                Investors[msg.sender].hasLinearClaimed = true;
            }
            token.transfer(msg.sender, amount);
            emit VestingAmountTaken(msg.sender, amount);
        }
    }

    //@dev Contract Setters

    function setRewardTokenAddress (address _tokenAddress) external onlyOwner {
        token = IERC20(_tokenAddress);
    }
    
    function setThresholdTimeForVesting (uint initial, uint intermediate, uint linear) external onlyOwner {
        initialVestingAmountWithdrawThresholdTime = initial;
        intermediateVestingAmountWithdrawThresholdTime = intermediate;
        linearVestingAmountWithdrawThresholdTime = linear;
    }

    function setArray (
        uint[] memory initialAmountPerInvestor,
        uint[] memory intermediateAmountReleasedPerInvestor,
        uint[] memory linearAmountReleasedAmountReleasedPerInvestor,
        uint[] memory intermediateVestingTimePeriodPerInvestor,
        uint[] memory linearVestingTimePeriodPerInvestor) external  onlyOwner {
        if (initialAmountPerInvestor.length > 0)
            initialAmountReleased = initialAmountPerInvestor;
        if (intermediateAmountReleasedPerInvestor.length > 0)
            intermediateAmountReleased = intermediateAmountReleasedPerInvestor;
        if (linearAmountReleasedAmountReleasedPerInvestor.length > 0)
            linearVestingAmountReleased = linearAmountReleasedAmountReleasedPerInvestor;
        if (intermediateVestingTimePeriodPerInvestor.length > 0)
            intermediateVestingTimePeriod = intermediateVestingTimePeriodPerInvestor;
        if (linearVestingTimePeriodPerInvestor.length > 0)
            linearVestingTimePeriod = linearVestingTimePeriodPerInvestor;
    }


    //@dev Get Details About Vesting Time Period

    function getVestingBalance(address _userAddress) public view returns (uint, uint) {
        if (!Investors[_userAddress].hasInitialClaimed && block.timestamp >= initialVestingAmountWithdrawThresholdTime) return (Investors[_userAddress].initialToBeClaimed,1);
        else if (!Investors[_userAddress].hasIntermediateClaim && Investors[_userAddress].intermediateToBeClaimed > 0 && block.timestamp <= intermediateVestingTimePeriod[Investors[_userAddress].investorType]+intermediateVestingAmountWithdrawThresholdTime) return (intermediatevesttatus(_userAddress),2);
        else if (!Investors[_userAddress].hasLinearClaimed && Investors[_userAddress].linearToBeClaimed > 0 && block.timestamp >= linearVestingAmountWithdrawThresholdTime) return (linearVestingDetails(_userAddress),3);
        else return (0,4);
    }

    function intermediatevesttatus(address _userAddress) public view returns (uint) {
        uint lastClaimTime = Investors[_userAddress].lastClaimTime;
        uint timeDifference = block.timestamp - lastClaimTime;
        timeDifference = timeDifference / 1 days;
        uint intermediateReleaseTimeSpan = intermediateVestingTimePeriod[Investors[_userAddress].investorType];
        uint totalIntermediateFund = Investors[_userAddress].intermediateToBeClaimed;
        uint perDayFund = totalIntermediateFund / intermediateReleaseTimeSpan;
        return perDayFund * timeDifference;
    }

    function linearVestingDetails(address _userAddress) public view returns (uint) {
        uint lastClaimTime = Investors[_userAddress].lastClaimTime;
        uint timeDifference = block.timestamp - lastClaimTime;
        timeDifference = timeDifference / 1 days;
        uint linearReleaseTimeSpan = linearVestingTimePeriod[Investors[_userAddress].investorType];
        uint totalIntermediateFund = Investors[_userAddress].linearToBeClaimed;
        uint perDayFund = totalIntermediateFund / linearReleaseTimeSpan;
        return perDayFund * timeDifference;
    }

    //@dev strictly owner function
    function setPauseStatus(bool status) external onlyOwner {
        if (status) _pause();
        else _unpause();
    }
}