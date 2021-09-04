import "@nomiclabs/hardhat-waffle";
import "hardhat-typechain";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import "solidity-coverage";

import { resolve } from "path";
import { config as dotenvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/types";
dotenvConfig({ path: resolve(__dirname, "./.env") });

// Ensure that we have all the environment variables we need.
let mnemonic: string;
if (!process.env.MNEMONIC) {
  throw new Error("Please set your MNEMONIC in a .env file");
} else {
  mnemonic = process.env.MNEMONIC;
}
const accounts = {
  mnemonic,
};

const MAINNET_RPC_URL: string = process.env.MAINNET_RPC_URL || "";
const RINKEBY_RPC_URL: string = process.env.RINKEBY_RPC_URL || "";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts,
      chainId: 31337,
      forking: {
        url: MAINNET_RPC_URL,
      },
    },
    mainnet: {
      url: MAINNET_RPC_URL,
      accounts,
      chainId: 1,
    },
    rinkeby: {
      url: RINKEBY_RPC_URL,
      accounts,
      chainId: 4,
    },
  },
  namedAccounts: {
    deployer: 0,
    other: 1,
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 50,
    enabled: process.env.DISABLE_GAS_REPORT ? false : true,
  },
};

export default config;
