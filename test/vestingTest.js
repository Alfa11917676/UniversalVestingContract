const { expect } = require("chai");
const { ethers } = require("hardhat");
const Web3 = require('web3')
const {fromWei} = Web3.utils

describe("Testing Vesting", function () {
  let alice, bob, deepan, bhargab, arnab, token, vesting, initialTime;
  let oneDay = 86400
  before('Setting Up The Suite', async() => {
    [alice,bob,deepan,bhargab,arnab] = await ethers.getSigners()
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
    await vesting.setThresholdTimeForVesting([0,initialTime+24*60*60,initialTime+24*60*60,initialTime+24*60*60],[0,initialTime + 4*24*60*60,initialTime + 4*24*60*60,initialTime + 4*24*60*60],[0,initialTime + 30*24*60*60,initialTime + 30*24*60*60,initialTime + 30*24*60*60])
  });

  it("Adding Investors: ", async function () {
       await vesting.addMinter([[alice.address,ethers.utils.parseEther('1000'),1],[bob.address,ethers.utils.parseEther('1000'),2],[deepan.address,ethers.utils.parseEther('2000'),3]])
       await vesting.addMinter([[arnab.address,ethers.utils.parseEther('100'),1]])
       await vesting.removeUser([arnab.address])
       await vesting.addMinter([[arnab.address,ethers.utils.parseEther('1000'),1]])
       const aliceDetails = await vesting.Investors(alice.address)
       const bobDetails = await vesting.Investors(bob.address)
       const deepanDetails = await vesting.Investors(deepan.address)
       const arnabDetails = await vesting.Investors(arnab.address)
       expect(arnabDetails[1]).to.equal(ethers.utils.parseEther('1000'))
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
    await expect (vesting.connect(deepan).withdraw()).to.be.revertedWith('Time Period is Not Over');
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

  it ('Claiming Linear Vesting', async() => {
    time = await network.provider.send("evm_setNextBlockTimestamp", [initialTime+30 * oneDay])
    await network.provider.send("evm_mine")
    vestingDetails = await vesting.Investors(bob.address)
    expect(time).to.equal(vestingDetails[2])
    time = await network.provider.send("evm_setNextBlockTimestamp", [initialTime+31 * oneDay])
    await network.provider.send("evm_mine")
    await vesting.connect(alice).withdraw();
    await vesting.connect(bob).withdraw();
    await vesting.connect(deepan).withdraw();
    let aliceCurrentBalance = await token.balanceOf(alice.address)
    let bobCurrentBalance = await token.balanceOf(bob.address)
    let deepanCurrentBalance = await token.balanceOf(deepan.address)
    var timebefore = await vesting.Investors(deepan.address)
    expect(aliceCurrentBalance).to.equal(ethers.utils.parseEther('107.5'))
    expect(bobCurrentBalance).to.equal(ethers.utils.parseEther('310'))
    expect(deepanCurrentBalance).to.equal(ethers.utils.parseEther('20'))

    await network.provider.send("evm_setNextBlockTimestamp", [initialTime+50 * oneDay])
    await network.provider.send("evm_mine")
    await vesting.connect(alice).withdraw();
    await vesting.connect(bob).withdraw();
    await vesting.connect(deepan).withdraw();
    let aliceCurrentBalance2 = await token.balanceOf(alice.address)
    let bobCurrentBalance2 = await token.balanceOf(bob.address)
    let deepanCurrentBalance2 = await token.balanceOf(deepan.address)
    var timeafter = await vesting.Investors(deepan.address)
    console.log('timebefore',timebefore[2], 'timeafter', timeafter[2])
    expect(aliceCurrentBalance2).to.equal(ethers.utils.parseEther('250'))
    expect(bobCurrentBalance2).to.equal(ethers.utils.parseEther('500'))
    expect(deepanCurrentBalance2).to.equal(ethers.utils.parseEther('400'))

    await network.provider.send("evm_setNextBlockTimestamp", [initialTime+51 * oneDay])
    await network.provider.send("evm_mine")
    await vesting.connect(alice).withdraw();
    await vesting.connect(bob).withdraw();
    await vesting.connect(deepan).withdraw();
    let aliceCurrentBalance3 = await token.balanceOf(alice.address)
    let bobCurrentBalance3 = await token.balanceOf(bob.address)
    let deepanCurrentBalance3 = await token.balanceOf(deepan.address)
    expect(aliceCurrentBalance3).to.equal(ethers.utils.parseEther('257.5'))
    expect(bobCurrentBalance3).to.equal(ethers.utils.parseEther('510'))
    expect(deepanCurrentBalance3).to.equal(ethers.utils.parseEther('420'))

    await network.provider.send("evm_setNextBlockTimestamp", [initialTime+100 * oneDay])
    await network.provider.send("evm_mine")
    await vesting.connect(alice).withdraw();
    await vesting.connect(bob).withdraw();
    await vesting.connect(deepan).withdraw();
    let aliceCurrentBalance4 = await token.balanceOf(alice.address)
    let bobCurrentBalance4 = await token.balanceOf(bob.address)
    let deepanCurrentBalance4 = await token.balanceOf(deepan.address)
    expect(aliceCurrentBalance4).to.equal(ethers.utils.parseEther('625'))
    expect(bobCurrentBalance4).to.equal(ethers.utils.parseEther('1000'))
    expect(deepanCurrentBalance4).to.equal(ethers.utils.parseEther('1400'))
    vestingDetails = await vesting.Investors(bob.address)
    expect(vestingDetails[11]).to.equal(true)

    await network.provider.send("evm_setNextBlockTimestamp", [initialTime+130 * oneDay])
    await network.provider.send("evm_mine")
    await vesting.connect(alice).withdraw();
    await expect (vesting.connect(bob).withdraw()).to.be.revertedWith('Vesting: All Amount Claimed');
    await vesting.connect(deepan).withdraw();
    let aliceCurrentBalance5 = await token.balanceOf(alice.address)
    let bobCurrentBalance5 = await token.balanceOf(bob.address)
    let deepanCurrentBalance5 = await token.balanceOf(deepan.address)
    expect(aliceCurrentBalance5).to.equal(ethers.utils.parseEther('850'))
    expect(bobCurrentBalance5).to.equal(ethers.utils.parseEther('1000'))
    expect(deepanCurrentBalance5).to.equal(ethers.utils.parseEther('2000'))
    vestingDetails = await vesting.Investors(deepan.address)
    expect(vestingDetails[11]).to.equal(true)


    await network.provider.send("evm_setNextBlockTimestamp", [initialTime+160 * oneDay])
    await network.provider.send("evm_mine")
    await vesting.connect(alice).withdraw();
    await vesting.setPauseStatus(true);
    await expect (vesting.connect(bob).withdraw()).to.be.reverted;
    await expect (vesting.connect(deepan).withdraw()).to.be.reverted;
    let aliceCurrentBalance6 = await token.balanceOf(alice.address)
    let bobCurrentBalance6 = await token.balanceOf(bob.address)
    let deepanCurrentBalance6 = await token.balanceOf(deepan.address)
    expect(aliceCurrentBalance6).to.equal(ethers.utils.parseEther('1000'))
    expect(bobCurrentBalance6).to.equal(ethers.utils.parseEther('1000'))
    expect(deepanCurrentBalance6).to.equal(ethers.utils.parseEther('2000'))
    vestingDetails = await vesting.Investors(alice.address)
    expect(vestingDetails[11]).to.equal(true)
    await vesting.setPauseStatus(false)
    await network.provider.send("evm_setNextBlockTimestamp", [initialTime+161 * oneDay])
    await network.provider.send("evm_mine")
    await expect (vesting.connect(alice).withdraw()).to.be.revertedWith('Vesting: All Amount Claimed');
    await expect (vesting.connect(bob).withdraw()).to.be.revertedWith('Vesting: All Amount Claimed');
    await expect (vesting.connect(deepan).withdraw()).to.be.revertedWith('Vesting: All Amount Claimed');
  })

  it ('Testing BlackList', async function() {
    await vesting.blackListUser([bhargab.address]);
    await expect (vesting.addMinter([[bhargab.address,ethers.utils.parseEther('1000'),1]])).to.be.revertedWith('User BlackListed')
  })

  it ('Testing Whitelist', async function() {
    await vesting.whitelistListUser([bhargab.address]);
    await vesting.addMinter([[bhargab.address,ethers.utils.parseEther('1000'),1]])
    let VestingData = await vesting.Investors(bhargab.address)
    expect(VestingData[0]).to.equal(1)
  })
  
  it ('Trying To Remove User Before Starting', async() => {
    await expect(vesting.connect(alice).removeUser([deepan.address])).to.be.revertedWith('Any Vesting Has Started')
  })
});
