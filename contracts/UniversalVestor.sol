//SPDX-License-Identifier: MIT

pragma solidity >=0.8.7;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "hardhat/console.sol";
contract UniversalVestingContract is Ownable, Pausable {


    IERC20 token;
    uint public globalStartTime;

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

    constructor () {
//        setPauseStatus(true);
    }

    event InvestorAddress(address account, uint _amout,uint investorType);
    event VestingAmountTaken(address account, uint _amout);
    mapping (address => vestingDetails) public Investors;
    mapping (address => bool) public isUserAdded;
    mapping (address => bool) public isBlackListed;


    uint[] public initialVestingAmountWithdrawThresholdTime;
    uint[] public intermediateVestingAmountWithdrawThresholdTime;
    uint[] public linearVestingAmountWithdrawThresholdTime;
    uint[] public initialAmountReleased;
    uint[] public intermediateAmountReleased;
    uint[] public linearVestingAmountReleased; // stores percentage
    uint[] public intermediateVestingTimePeriod;
    uint[] public linearVestingTimePeriod;

    function addMinter(Investor[] memory vest) external onlyOwner {
        for (uint i = 0;i < vest.length;i++) {
            require (!isUserAdded[vest[i].account],'User already whitelisted');
            require (!isBlackListed[vest[i].account],'User BlackListed');
            isUserAdded[vest[i].account] = true;
            vestingDetails memory vesting;
            vesting.investorType = vest[i].investorType;
            vesting.totalBalance = vest[i].amount;
            vesting.initialToBeClaimed = (initialAmountReleased[vest[i].investorType] * vest[i].amount) / 1000;
            vesting.intermediateToBeClaimed = (intermediateAmountReleased[vest[i].investorType] * vest[i].amount)/ 1000;
            vesting.linearToBeClaimed = (linearVestingAmountReleased[vest[i].investorType] * vest[i].amount ) / 1000;
            Investors[vest[i].account] = vesting;
            emit InvestorAddress(vest[i].account, vest[i].amount,vest[i].investorType);
        }
    }




    function withdraw() external whenNotPaused {
        require (isUserAdded[msg.sender],'User Not Added');
        require (!isBlackListed[msg.sender],'User BlackListed');
        require (!Investors[msg.sender].hasLinearClaimed,'Vesting: All Amount Claimed');


        if (initialAmountReleased[Investors[msg.sender].investorType] == 0 && intermediateAmountReleased[Investors[msg.sender].investorType] > 0 && Investors[msg.sender].intermediateClaimed == 0)
                 {
                     Investors[msg.sender].lastClaimTime = intermediateVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType];
                     console.log('Inside if',Investors[msg.sender].lastClaimTime);
                 }
        else if (initialAmountReleased[Investors[msg.sender].investorType] == 0 && intermediateAmountReleased[Investors[msg.sender].investorType] == 0 && Investors[msg.sender].linearClaimed == 0 )
                {
                    Investors[msg.sender].lastClaimTime = linearVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType];
                    console.log('inside else if',Investors[msg.sender].lastClaimTime);
                }


        (uint amount, uint returnType) = getVestingBalance(msg.sender);
        require(returnType != 4,'Time Period is Not Over');
        if (returnType == 1) {
            require (amount >0,'Initial Vesting: 0 amount');
            Investors[msg.sender].hasInitialClaimed = true;
            Investors[msg.sender].initialClaimed += amount;
            token.transfer(msg.sender, amount);
            if (intermediateAmountReleased[Investors[msg.sender].investorType] > 0)
                Investors[msg.sender].lastClaimTime = intermediateVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType];
            else if (intermediateAmountReleased[Investors[msg.sender].investorType] == 0 )
                Investors[msg.sender].lastClaimTime = linearVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType];
            emit VestingAmountTaken(msg.sender, amount);
        } else if (returnType == 2) {
            require (amount >0,'Intermediate Vesting: 0 amount');
            Investors[msg.sender].lastClaimTime = block.timestamp;
            Investors[msg.sender].intermediateClaimed+=amount;
            require (Investors[msg.sender].intermediateToBeClaimed >= Investors[msg.sender].intermediateClaimed,'Intermediate Vesting: Cannot Claim More');
            if (Investors[msg.sender].intermediateToBeClaimed ==  Investors[msg.sender].intermediateClaimed)
            {
                Investors[msg.sender].hasIntermediateClaim = true;
                Investors[msg.sender].lastClaimTime = linearVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType];
            }
            token.transfer(msg.sender, amount);
            emit VestingAmountTaken(msg.sender, amount);
        }
        else {
            require (amount >0,'Linear Vesting: 0 amount');
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
    
    function setThresholdTimeForVesting (uint startTime) external onlyOwner {
        globalStartTime = startTime;
        initialVestingAmountWithdrawThresholdTime = [0,startTime,startTime,startTime,startTime,startTime,startTime,startTime,startTime,startTime,startTime];
        intermediateVestingAmountWithdrawThresholdTime = [0,0,0,0,0,0,0,0,startTime + 14 minutes,0,0];
        linearVestingAmountWithdrawThresholdTime= [0,startTime+61 minutes,startTime + 1 minutes,startTime + 1 minutes,startTime + 1 minutes,startTime + 181 minutes,startTime + 31 minutes,startTime + 31 minutes,startTime + 181 minutes, startTime + 91 minutes,startTime + 1 minutes];
//        setPauseStatus(false);
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
        if (!Investors[_userAddress].hasInitialClaimed &&
            block.timestamp >= initialVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType] &&
            Investors[_userAddress].initialToBeClaimed > 0) {return (Investors[_userAddress].initialToBeClaimed, 1);}
        else if (
            !Investors[_userAddress].hasIntermediateClaim &&
            Investors[_userAddress].intermediateToBeClaimed > 0 &&
            block.timestamp >= intermediateVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType]) {
            (uint balance,uint _bal) = intermediateVestStatus(_userAddress);
            console.log('Balance',balance);
            return (balance,_bal);
        }
        else if (!Investors[_userAddress].hasLinearClaimed && Investors[_userAddress].linearToBeClaimed > 0 && block.timestamp >= linearVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType]) return (linearVestingDetails(_userAddress),3);
        else return (0,4);
    }

    function intermediateVestStatus(address _userAddress) public view returns (uint,uint) {
        uint lastClaimTime = Investors[_userAddress].lastClaimTime;
        uint timeDifference;
        uint[11] memory intermediateArray = [0,0,0,0,0,0,0,0,globalStartTime + 14 minutes,0,0];
        if (block.timestamp <= intermediateVestingTimePeriod[Investors[_userAddress].investorType]+intermediateArray[Investors[_userAddress].investorType])
        {
            timeDifference = block.timestamp - lastClaimTime;
        }
        else
        {
            //@dev to return people the exact amount if the intermediate vesting period is over
           return(Investors[_userAddress].intermediateToBeClaimed - Investors[_userAddress].intermediateClaimed,2);
        }
        timeDifference = timeDifference / 1 minutes;
        uint intermediateReleaseTimeSpan = intermediateVestingTimePeriod[Investors[_userAddress].investorType];
        uint totalIntermediateFund = Investors[_userAddress].intermediateToBeClaimed;
        uint perDayFund = totalIntermediateFund / (intermediateReleaseTimeSpan / 1 minutes);
        uint price = perDayFund * timeDifference;
        return (price,2);
    }

    function linearVestingDetails(address _userAddress) public view returns (uint) {

        uint lastClaimTime = Investors[_userAddress].lastClaimTime;
        uint timeDifference;
        uint[11] memory linearTime = [0,globalStartTime+61 minutes,globalStartTime + 1 minutes,globalStartTime + 1 minutes,globalStartTime + 1 minutes,globalStartTime + 181 minutes,globalStartTime + 31 minutes,globalStartTime + 31 minutes,globalStartTime + 181 minutes, globalStartTime + 91 minutes,globalStartTime + 1 minutes];
        if (block.timestamp <= linearVestingTimePeriod[Investors[_userAddress].investorType]+linearTime[Investors[_userAddress].investorType])
        {
              timeDifference = block.timestamp - lastClaimTime;
        }
        else
        {
            //@dev to return people the exact amount if the intermediate vesting period is over
            return(Investors[_userAddress].linearToBeClaimed - Investors[_userAddress].linearClaimed);
        }
        timeDifference = timeDifference / 1 minutes;
        uint linearReleaseTimeSpan = linearVestingTimePeriod[Investors[_userAddress].investorType];
        uint totalIntermediateFund = Investors[_userAddress].linearToBeClaimed;
        uint perDayFund = totalIntermediateFund / (linearReleaseTimeSpan / 1 minutes);
        return perDayFund * timeDifference;
    }

    //@dev strictly owner function
    function setPauseStatus(bool status) public onlyOwner {
        if (status) _pause();
        else _unpause();
    }

    function blackListUser (address[] memory blackListedAddresses) external onlyOwner {
        for (uint i=0; i< blackListedAddresses.length; i++) {
            isBlackListed[blackListedAddresses[i]] = true;
        }
    }

    function whitelistListUser (address[] memory whitelistListedAddresses) external onlyOwner {
        for (uint i=0; i< whitelistListedAddresses.length; i++) {
            isBlackListed[whitelistListedAddresses[i]] = false;
        }
    }

    function removeUser (address[] memory usersToRemove) external onlyOwner {
        for (uint i=0; i< usersToRemove.length; i++) {
             if (initialVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType] > 0)
                require (initialVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType] > block.timestamp,'Initial Vesting Has Started');
            if (intermediateVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType] > 0)
                require (intermediateVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType] > block.timestamp, 'Intermediate Vesting Has Started');
            if (linearVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType] > 0)
                require (linearVestingAmountWithdrawThresholdTime[Investors[msg.sender].investorType] > block.timestamp, 'Linear Vesting Has Started');
            isUserAdded[usersToRemove[i]] = false;
            delete Investors[usersToRemove[i]];
        }
    }

}