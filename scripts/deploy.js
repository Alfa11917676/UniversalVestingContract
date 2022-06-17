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
  await vesting.setRewardTokenAddress("0x27382Fa4aC56622A34eFe3431EeAA6f5E2093ff7")
  await vesting.setArray([0,0,50,100,200,0,0,0,0,30,200],[0,0,0,0,0,0,0,0,60,0,0],[0,1000,950,900,800,1000,1000,1000,940,970,800],[0,0,0,0,0,0,0,0,1800,0,0],[0,39600,32400,21900,10800,54000,65700,63000,43800,81000,28800])
  const block = await ethers.getDefaultProvider().getBlock('latest')
  await vesting.setThresholdTimeForVesting(block.timestamp + 600)
  await vesting.addMinter([["0xf7AA4111Ab7a447d0426D9633aF618a190fF9D92",1000,1],["0x6f317c2DE11797493E3a21c0976c6a5DECDF63da",2000,2],["0x5CD71711a4B3D61ed5184f0a76c1C6733C579e03",3000,3],["0x74e8b2160F1B1D86186722285D61F248771354bf",1000,4],["0x055D7FB88691100b6B8274dcBd9F4b4B2473988c",1500,5],["0xB19d92cbFbD8D1e29e5A5C222ae0Bc80c929F039",2000,6],["0x79BF6Ab2d78D81da7d7E91990a25A81e93724a60",2000,8]])
  console.log("vesting deployed to:", vesting.address);
}
//[["0xf7AA4111Ab7a447d0426D9633aF618a190fF9D92",1000,1],["0x6f317c2DE11797493E3a21c0976c6a5DECDF63da",2000,2],["0x5CD71711a4B3D61ed5184f0a76c1C6733C579e03",3000,3],["0x74e8b2160F1B1D86186722285D61F248771354bf",1000,4],["0x055D7FB88691100b6B8274dcBd9F4b4B2473988c",1500,5],["0xB19d92cbFbD8D1e29e5A5C222ae0Bc80c929F039",2000,6]]

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
