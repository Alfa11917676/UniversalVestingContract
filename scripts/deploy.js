// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const VestingAddress = await hre.ethers.getContractFactory("UniversalVestingContract");
  const vesting = await VestingAddress.deploy();

  await vesting.deployed();
  // await vesting.setRewardTokenAddress("0x27382Fa4aC56622A34eFe3431EeAA6f5E2093ff7")
  // await vesting.setArray([0,0,50,100,200,0,0,0,0,30,200],[0,0,0,0,0,0,0,0,60,0,0],[0,1000,950,900,800,1000,1000,1000,940,970,800],[0,0,0,0,0,0,0,0,1800,0,0],[0,39600,32400,21900,10800,54000,65700,63000,43800,81000,28800])
  // const block = await ethers.getDefaultProvider().getBlock('latest')
  // await vesting.setThresholdTimeForVesting(block.timestamp + 360)
  console.log("vesting deployed to:", vesting.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
