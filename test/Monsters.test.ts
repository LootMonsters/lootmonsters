import hre, { ethers } from "hardhat";
import { Artifact } from "hardhat/types";
import { contract } from "./utils/context";
import { Monsters } from "../typechain/Monsters";
import { expect } from "chai";

const { deployContract } = hre.waffle;

function decode(str: string) {
  return Buffer.from(str, "base64").toString("utf8");
}

const MONSTER_ID = 1;
const MIN_PRICE = "0.1"; // 0.1 ETH
const LONG_SWORD_LOOT_ID = 528; // Long sword: https://opensea.io/assets/0xff9c1b15b16263c61d017ee9f65c50e4ae0113d7/528

contract("Monsters", function () {
  beforeEach(async function () {
    const MonstersArtifact: Artifact = await hre.artifacts.readArtifact("Monsters");
    this.monsters = <Monsters>await deployContract(this.signers.owner, MonstersArtifact, []);
  });

  it("returns name and symbol", async function () {
    expect(await this.monsters.name()).to.equal("Monsters");
    expect(await this.monsters.symbol()).to.equal("MNST");
  });

  it("returns a monster", async function () {
    const ID = 10000;
    const output = await this.monsters.tokenURI(ID);
    const decoded = decode(output.split(",")[1]);
    console.log(decoded);
    const parsed = JSON.parse(decoded);
    console.log(parsed["image"]);
  });

  it("anyone can mint 1 - 9800 for price", async function () {
    const tokenId = 1;
    const otherTokenId = 9800;

    // Check lower bound
    await this.monsters.connect(this.signers.other).mint(tokenId, { value: ethers.utils.parseEther(MIN_PRICE) });
    expect(await this.monsters.ownerOf(tokenId)).to.equal(this.signers.other.address);

    // Cannot mint duplicates
    await expect(
      this.monsters.connect(this.signers.other).mint(tokenId, { value: ethers.utils.parseEther(MIN_PRICE) }),
    ).to.be.revertedWith("ERC721: token already minted");

    // Check upper bound
    await this.monsters.connect(this.signers.other).mint(otherTokenId, { value: ethers.utils.parseEther(MIN_PRICE) });
    expect(await this.monsters.ownerOf(otherTokenId)).to.equal(this.signers.other.address);
  });

  it("cannot mint for less than price", async function () {
    await expect(
      this.monsters.connect(this.signers.other).mint(8001, { value: ethers.utils.parseEther("0.049") }),
    ).to.be.revertedWith("Insufficient Ether");
  });

  it("monster owners can set name", async function () {
    const m = this.monsters.connect(this.signers.other);
    const name1 = "Foo";
    const name2 = "Bar";

    await m.mint(MONSTER_ID, { value: ethers.utils.parseEther(MIN_PRICE) });
    expect(await m.ownerOf(MONSTER_ID)).to.equal(this.signers.other.address);
    await m.setName(MONSTER_ID, name1);
    expect(await m.getName(MONSTER_ID)).to.equal(name1);
    await m.setName(MONSTER_ID, name2);
    expect(await m.getName(MONSTER_ID)).to.equal(name2);
  });

  it("non-monster owners cannot set name", async function () {
    await this.monsters.connect(this.signers.owner).mint(MONSTER_ID, { value: ethers.utils.parseEther(MIN_PRICE) });
    await expect(this.monsters.connect(this.signers.other).setName(MONSTER_ID, "foo")).to.be.revertedWith(
      "Not monster owner",
    );
  });

  it("owners can reservedMint", async function () {
    await this.monsters.connect(this.signers.owner).reservedMint(9801);
    await this.monsters.connect(this.signers.owner).reservedMint(10000);
  });

  it("non-owners cannot reservedMint", async function () {
    await expect(this.monsters.connect(this.signers.other).reservedMint(11801)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
    await expect(this.monsters.connect(this.signers.other).reservedMint(12000)).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("only loot owners can mintWithLoot for free", async function () {
    const lootOwner = await this.monsters.lootOwnerOf(LONG_SWORD_LOOT_ID);

    // Impersonate as loot owner
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lootOwner],
    });

    // lootOwner can mintWithLoot at discounted price
    const lootOwnerSigner = await ethers.getSigner(lootOwner);
    await this.monsters.connect(lootOwnerSigner).mintWithLoot(LONG_SWORD_LOOT_ID);
    expect(await this.monsters.ownerOf(LONG_SWORD_LOOT_ID)).to.equal(lootOwnerSigner.address);

    // cannot mintWithLoot a different loot id
    await expect(this.monsters.connect(lootOwnerSigner).mintWithLoot(LONG_SWORD_LOOT_ID + 1)).to.be.revertedWith(
      "Not loot owner",
    );

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lootOwner],
    });
  });

  it("can get lootOwnerOf", async function () {
    const lootOwner = await this.monsters.lootOwnerOf(1);
    expect(lootOwner);
  });

  it("monster owners can slay with loot", async function () {
    this.timeout(80000);

    const WEAK_TO_LONG_SWORD_MONSTER_ID = 1;
    expect(await this.monsters.canSlay(WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID)).to.equal(true);

    // Impersonate as loot owner
    const lootOwner = await this.monsters.lootOwnerOf(LONG_SWORD_LOOT_ID);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lootOwner],
    });

    // Mint to lootOwner
    const lootOwnerSigner = await ethers.getSigner(lootOwner);
    await this.monsters
      .connect(lootOwnerSigner)
      .mint(WEAK_TO_LONG_SWORD_MONSTER_ID, { value: ethers.utils.parseEther(MIN_PRICE) });
    expect(await this.monsters.ownerOf(WEAK_TO_LONG_SWORD_MONSTER_ID)).to.equal(lootOwner);

    const NEW_MONSTER_NAME = "New Monster Name";
    expect(
      await this.monsters
        .connect(lootOwnerSigner)
        .slay(WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID, NEW_MONSTER_NAME),
    )
      .to.emit(this.monsters, "Slain")
      .withArgs(lootOwner, WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID, NEW_MONSTER_NAME);

    expect(await this.monsters.slayerOf(WEAK_TO_LONG_SWORD_MONSTER_ID)).to.equal(lootOwner);
    expect(await this.monsters.slainWith(WEAK_TO_LONG_SWORD_MONSTER_ID)).to.equal(LONG_SWORD_LOOT_ID);
    expect(await this.monsters.getName(WEAK_TO_LONG_SWORD_MONSTER_ID)).to.equal(NEW_MONSTER_NAME);

    // Display slain
    const output = await this.monsters.tokenURI(1);
    const decoded = decode(output.split(",")[1]);
    console.log(decoded);
    const parsed = JSON.parse(decoded);
    console.log(parsed["image"]);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lootOwner],
    });
  });

  it("monsters cannot be slain twice", async function () {
    this.timeout(40000);
    const WEAK_TO_LONG_SWORD_MONSTER_ID = 1;

    // Impersonate as loot owner
    const lootOwner = await this.monsters.lootOwnerOf(LONG_SWORD_LOOT_ID);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lootOwner],
    });

    // Mint to lootOwner
    const lootOwnerSigner = await ethers.getSigner(lootOwner);
    await this.monsters
      .connect(lootOwnerSigner)
      .mint(WEAK_TO_LONG_SWORD_MONSTER_ID, { value: ethers.utils.parseEther(MIN_PRICE) });

    const NEW_MONSTER_NAME = "New Monster Name";
    await this.monsters
      .connect(lootOwnerSigner)
      .slay(WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID, NEW_MONSTER_NAME);
    await expect(
      this.monsters.connect(lootOwnerSigner).slay(WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID, "foo"),
    ).to.be.revertedWith("Already slain");

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lootOwner],
    });
  });

  it("monsters cannot be named beyond 32 characters", async function () {
    this.timeout(40000);
    const WEAK_TO_LONG_SWORD_MONSTER_ID = 1;

    // Impersonate as loot owner
    const lootOwner = await this.monsters.lootOwnerOf(LONG_SWORD_LOOT_ID);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lootOwner],
    });

    // Mint to lootOwner
    const lootOwnerSigner = await ethers.getSigner(lootOwner);
    await this.monsters
      .connect(lootOwnerSigner)
      .mint(WEAK_TO_LONG_SWORD_MONSTER_ID, { value: ethers.utils.parseEther(MIN_PRICE) });

    const TOO_LONG_NAME = "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFG";
    await expect(
      this.monsters.connect(lootOwnerSigner).slay(WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID, TOO_LONG_NAME),
    ).to.be.revertedWith("Name > 32 chars");

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lootOwner],
    });
  });

  it("monster slayer can rename", async function () {
    this.timeout(40000);
    const WEAK_TO_LONG_SWORD_MONSTER_ID = 1;

    // Impersonate as loot owner
    const lootOwner = await this.monsters.lootOwnerOf(LONG_SWORD_LOOT_ID);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lootOwner],
    });

    // Mint to lootOwner
    const lootOwnerSigner = await ethers.getSigner(lootOwner);
    await this.monsters
      .connect(lootOwnerSigner)
      .mint(WEAK_TO_LONG_SWORD_MONSTER_ID, { value: ethers.utils.parseEther(MIN_PRICE) });

    // Test name is overwritten by slaying
    await this.monsters.connect(lootOwnerSigner).setName(MONSTER_ID, "Old Name");

    const NEW_MONSTER_NAME = "NEW_MONSTER_NAME";
    await this.monsters
      .connect(lootOwnerSigner)
      .slay(WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID, NEW_MONSTER_NAME);
    expect(await this.monsters.getName(WEAK_TO_LONG_SWORD_MONSTER_ID)).to.equal(NEW_MONSTER_NAME);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lootOwner],
    });
  });

  it("slain monsters cannot be renamed", async function () {
    this.timeout(40000);
    const WEAK_TO_LONG_SWORD_MONSTER_ID = 1;

    // Impersonate as loot owner
    const lootOwner = await this.monsters.lootOwnerOf(LONG_SWORD_LOOT_ID);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lootOwner],
    });

    // Mint to lootOwner
    const lootOwnerSigner = await ethers.getSigner(lootOwner);
    await this.monsters
      .connect(lootOwnerSigner)
      .mint(WEAK_TO_LONG_SWORD_MONSTER_ID, { value: ethers.utils.parseEther(MIN_PRICE) });

    const NEW_MONSTER_NAME = "NEW_MONSTER_NAME";
    await this.monsters
      .connect(lootOwnerSigner)
      .slay(WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID, NEW_MONSTER_NAME);

    await expect(this.monsters.connect(lootOwnerSigner).setName(MONSTER_ID, "Blah")).to.be.revertedWith(
      "Already slain",
    );
    expect(await this.monsters.getName(WEAK_TO_LONG_SWORD_MONSTER_ID)).to.equal(NEW_MONSTER_NAME);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lootOwner],
    });
  });

  it("monster owners cannot slay with unowned loot", async function () {
    const WEAK_TO_LONG_SWORD_MONSTER_ID = 1;
    expect(await this.monsters.canSlay(WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID)).to.equal(true);

    await this.monsters
      .connect(this.signers.other)
      .mint(WEAK_TO_LONG_SWORD_MONSTER_ID, { value: ethers.utils.parseEther(MIN_PRICE) });
    expect(await this.monsters.ownerOf(WEAK_TO_LONG_SWORD_MONSTER_ID)).to.equal(this.signers.other.address);

    const NEW_MONSTER_NAME = "New Monster Name";
    await expect(
      this.monsters
        .connect(this.signers.other)
        .slay(WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID, NEW_MONSTER_NAME),
    ).to.be.revertedWith("Not loot owner");
  });

  it("monsters cannot be slain by invalid weapon type", async function () {
    this.timeout(40000);
    const NOT_WEAK_TO_LONG_SWORD_MONSTER_ID = 2;
    expect(await this.monsters.canSlay(NOT_WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID)).to.equal(false);

    // Impersonate as loot owner
    const lootOwner = await this.monsters.lootOwnerOf(LONG_SWORD_LOOT_ID);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lootOwner],
    });

    // Mint to lootOwner
    const lootOwnerSigner = await ethers.getSigner(lootOwner);
    await this.monsters
      .connect(lootOwnerSigner)
      .mint(NOT_WEAK_TO_LONG_SWORD_MONSTER_ID, { value: ethers.utils.parseEther(MIN_PRICE) });

    await expect(
      this.monsters.connect(lootOwnerSigner).slay(NOT_WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID, "foo"),
    ).to.be.revertedWith("Immune");

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lootOwner],
    });
  });

  it("monsters cannot be slain by non-owner", async function () {
    this.timeout(40000);
    const WEAK_TO_LONG_SWORD_MONSTER_ID = 1;

    // Impersonate as loot owner
    const lootOwner = await this.monsters.lootOwnerOf(LONG_SWORD_LOOT_ID);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [lootOwner],
    });
    const lootOwnerSigner = await ethers.getSigner(lootOwner);

    // Monster belongs to someone else
    await this.monsters
      .connect(this.signers.owner)
      .mint(WEAK_TO_LONG_SWORD_MONSTER_ID, { value: ethers.utils.parseEther(MIN_PRICE) });

    await expect(
      this.monsters.connect(lootOwnerSigner).slay(WEAK_TO_LONG_SWORD_MONSTER_ID, LONG_SWORD_LOOT_ID, "foo"),
    ).to.be.revertedWith("Not monster owner");

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [lootOwner],
    });
  });

  it("non-owner cannot withdraw", async function () {
    await expect(this.monsters.connect(this.signers.other).withdraw()).to.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });

  it("owner can withdraw", async function () {
    await expect(this.monsters.connect(this.signers.owner).withdraw()).to.not.be.revertedWith(
      "Ownable: caller is not the owner",
    );
  });
});
