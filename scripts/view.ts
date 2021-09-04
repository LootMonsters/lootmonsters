// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const ethers = hre.ethers;
import _ from "lodash";
import sharp from "sharp";

const MONSTERS_ADDRESS = "0xaa9c2198cc110a875be536896522bad2b5a9856f";
const NODE_URL = process.env.MAINNET_RPC_URL;
const PROVIDER = new ethers.providers.JsonRpcProvider(NODE_URL);
// const wallet = new ethers.Wallet(key, provider)

const IMAGES_PATH = "images";

async function main() {
  // We get the contract to deploy
  const monstersArtifact = await hre.artifacts.readArtifact("Monsters");
  const monsters = new ethers.Contract(MONSTERS_ADDRESS, monstersArtifact.abi, PROVIDER);

  const [start, size] = process.argv.slice(2).map(x => parseInt(x));
  const list = _.range(start, size);
  console.log(list);
  for (let arg of list) {
    console.log(`Generating #${arg}`);
    const uri = await monsters.tokenURI(arg);
    const svg = uriToSVG(uri);
    const buf = svgToBuf(svg);
    await sharp(buf, { density: 300 }).png().toFile(`${IMAGES_PATH}/${arg}.png`);
  }
}

function uriToSVG(uri: string): string {
  const decoded = decode(uri.split(",")[1]);
  const parsed = JSON.parse(decoded);
  const svg = parsed["image"];
  return svg;
}

function svgToBuf(svg: string): Buffer {
  return Buffer.from(svg.split(",")[1], "base64");
}

function decode(str: string) {
  return Buffer.from(str, "base64").toString("utf8");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
