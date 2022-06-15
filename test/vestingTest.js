const { expect } = require("chai");
const { ethers } = require("hardhat");
const Web3 = require('web3')
const {fromWei} = Web3.utils

describe("Testing Vesting", function () {
  let owner, alice, bob, deepan, bhargab, token, vesting, initialTime, finalTime;
  let oneDay = 86400
  before('Setting Up The Suite', async() => {
    [alice,bob,deepan,bhargab] = await ethers.getSigners()
    Dummy = await ethers.getContractFactory('MyToken')
    token = await Dummy.deploy()
    await token.deployed()
    Vesting = await ethers.getContractFactory('UniversalVestingContract')
    vesting = await Vesting.deploy()
    await vesting.deployed()
    await vesting.setRewardTokenAddress(token.address)
    await token.mint(vesting.address, ethers.utils.parseEther('100000'))
    await vesting.setArray(
      [0,100,200,0],
      [0,0,100,0],
      [0,900,700,1000],
      [0,0,10*24*60*60,0],
      [0,120*24*60*60,70*24*60*60,100*24*60*60])
    const block = await ethers.getDefaultProvider().getBlock('latest')

    initialTime = block.timestamp
    console.log('Timestamp inside before', initialTime)
    await vesting.setThresholdTimeForVesting(initialTime+24*60*60,initialTime + 4*24*60*60,initialTime + 30*24*60*60)
  });
  it("Adding Investors: ", async function () {
       await vesting.addMinter([[alice.address,ethers.utils.parseEther('1000'),1],[bob.address,ethers.utils.parseEther('1000'),2],[deepan.address,ethers.utils.parseEther('2000'),3]])
       const aliceDetails = await vesting.Investors(alice.address)
       const bobDetails = await vesting.Investors(bob.address)
       const deepanDetails = await vesting.Investors(deepan.address)
       expect(aliceDetails[3]).to.equal(ethers.utils.parseEther('100'));
       expect(aliceDetails[5]).to.equal(ethers.utils.parseEther('900'));
       expect(deepanDetails[3]).to.equal(ethers.utils.parseEther('0'));
       expect(deepanDetails[5]).to.equal(ethers.utils.parseEther('2000'));
       expect(bobDetails[3]).to.equal(ethers.utils.parseEther('200'));
       expect(bobDetails[5]).to.equal(ethers.utils.parseEther('700'));
       expect(bobDetails[4]).to.equal(ethers.utils.parseEther('100'));
  });

  it ("Claiming Initial Amount ", async() => {
    await expect (vesting.withdraw()).to.be.revertedWith('Time Period is Not Over');
    await network.provider.send("evm_setNextBlockTimestamp", [initialTime+86400])
    await network.provider.send("evm_mine")
    await vesting.withdraw()
    expect (await token.balanceOf(alice.address)).to.equal(ethers.utils.parseEther('100'))
    await expect (vesting.withdraw()).to.be.revertedWith('Time Period is Not Over');
    await expect (vesting.connect(deepan).withdraw()).to.be.revertedWith('Initial Vesting: 0 amount');
    await vesting.connect(bob).withdraw()
    expect (await token.balanceOf(bob.address)).to.equal(ethers.utils.parseEther('200'))
  })

  it ("Claiming Intermediate Amount ", async() =>{
    await network.provider.send("evm_setNextBlockTimestamp", [initialTime+10 * oneDay])
    await network.provider.send("evm_mine")
    await vesting.connect(bob).withdraw()
    BobBal = await token.balanceOf(bob.address)
    expect(fromWei(BobBal.toString(),'ether')).to.equal('260')
    await network.provider.send("evm_setNextBlockTimestamp", [initialTime+14 * oneDay])
    await network.provider.send("evm_mine")
    await vesting.connect(bob).withdraw()
    BobBalance = await token.balanceOf(bob.address)
    expect (fromWei(BobBalance.toString(),'ether')).to.equal('300')
    vestingDetails = await vesting.Investors(bob.address)
    expect(vestingDetails[10]).to.equal(true)
    expect(fromWei(vestingDetails[7].toString(),'ether')).to.equal('100');
    await expect (vesting.connect(bob).withdraw()).to.be.revertedWith('Time Period is Not Over');
    await expect (vesting.connect(alice).withdraw()).to.be.revertedWith('Time Period is Not Over');
  })

  it ('Claiming Linear Vesting', async() =>{
    time = await network.provider.send("evm_setNextBlockTimestamp", [initialTime+30 * oneDay])
    await network.provider.send("evm_mine")
    vestingDetails = await vesting.Investors(bob.address)
    expect(time).to.equal(vestingDetails[2])
    time = await network.provider.send("evm_setNextBlockTimestamp", [initialTime+31 * oneDay])
    await network.provider.send("evm_mine")
    let alicePreviousBalance = await token.balanceOf(alice.address)
    let bobPreviousBalance = await token.balanceOf(bob.address)
    let deepanPreviousBalance = await token.balanceOf(deepan.address)
    alicePreviousBalance = (fromWei(alicePreviousBalance.toString(),'ether'))
    bobPreviousBalance = (fromWei(bobPreviousBalance.toString(),'ether'))
    deepanPreviousBalance = (fromWei(deepanPreviousBalance.toString(),'ether'))
    await vesting.connect(alice).withdraw();
    await vesting.connect(bob).withdraw();
    await vesting.connect(deepan).withdraw();
    let aliceCurrentBalance = await token.balanceOf(alice.address)
    let bobCurrentBalance = await token.balanceOf(bob.address)
    let deepanCurrentBalance = await token.balanceOf(deepan.address)
    aliceCurrentBalance = (fromWei(alicePreviousBalance.toString(),'ether'))
    bobCurrentBalance = (fromWei(bobPreviousBalance.toString(),'ether'))
    deepanCurrentBalance = (fromWei(deepanPreviousBalance.toString(),'ether'))
    expect(aliceCurrentBalance).to.equal((parseInt(alicePreviousBalance)+7.5).toString())
    expect(bobCurrentBalance).to.equal((parseInt(bobPreviousBalance)+10).toString())
    expect(deepanCurrentBalance).to.equal((parseInt(deepanCurrentBalance)+10).toString())
  })
});
