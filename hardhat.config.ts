import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(`${account.address}: ${await account.getBalance()}`);
  }
});

const ALCHEMY_API_KEY = process.env.GOERLI_URL || "";
const GOERLI_PVK_1 = `0x${process.env.GOERLI_PVK_1}`;
const GOERLI_PVK_2 = `0x${process.env.GOERLI_PVK_2}`;
const GOERLI_PVK_3 = `0x${process.env.GOERLI_PVK_3}`;

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    hardhat: {
      accounts: {
        count: 35,
      },
    },
    // goerli: {
    //   url: ALCHEMY_API_KEY,
    //   accounts: [GOERLI_PVK_1, GOERLI_PVK_2, GOERLI_PVK_3],
    //   chainId: 5,
    // },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
