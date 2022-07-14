import chai, { expect } from "chai";
import { ethers, network, waffle } from "hardhat";
import { BigNumber } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  SpaceCoin,
  SpaceCoinICO,
  SpaceCoinICO__factory,
  SpaceCoin__factory,
} from "../typechain";
import { isAddress } from "ethers/lib/utils";
import { doesNotReject, ok } from "assert";

chai.use(waffle.solidity);

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ONE_ETHER: BigNumber = ethers.utils.parseEther("1");

const FIVE_TOKENS: BigNumber = ethers.utils.parseEther("5");
const TEN_TOKENS: BigNumber = ethers.utils.parseEther("10");
const TOTAL_SUPPLY: BigNumber = ethers.utils.parseEther("500000");

const SEED_PHASE = 0;
const GENERAL_PHASE = 1;
const OPEN_PHASE = 2;

// funds 150k ETH
const fundICOSeedGoal = async (
  ico: SpaceCoinICO,
  deployer: SignerWithAddress
) => {
  var wallets: SignerWithAddress[] = await ethers.getSigners();
  for (var x = 0; x < 10; x++) {
    let i = x + 6; // first six for saved for testing
    await ico.connect(deployer).addToWhitelist(wallets[i].address);
    await ico.connect(wallets[i]).buyTokens(wallets[i].address, {
      value: ethers.utils.parseEther("1500"),
    });
  }
};

// must be called after fundICOSeedGoal()
// funds 15k ETH
const fundICOGeneralGoal = async (
  ico: SpaceCoinICO,
  deployer: SignerWithAddress
) => {
  var wallets: SignerWithAddress[] = await ethers.getSigners();
  for (var x = 0; x < 15; x++) {
    let i = x + 10 + 6; // ten from fundICOSeedGoal() and six saved for testing
    await ico.connect(wallets[i]).buyTokens(wallets[i].address, {
      value: ethers.utils.parseEther("1000"),
    });
  }
};

describe("SpaceCoin", () => {
  /**
   * deployer   : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
     treasury   : 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
     icoTreasury: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
     alice      : 0x90F79bf6EB2c4f870365E785982E1f101E93b906
     bob        : 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
     chris      : 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
   */
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let icoTreasury: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let whitelistChris: SignerWithAddress;

  let SpaceCoin: SpaceCoin__factory;
  let spc: SpaceCoin;

  beforeEach(async () => {
    [deployer, treasury, icoTreasury, alice, bob, whitelistChris] =
      await ethers.getSigners();

    SpaceCoin = await ethers.getContractFactory("SpaceCoin");
    spc = (await SpaceCoin.deploy(
      deployer.address,
      treasury.address,
      icoTreasury.address
    )) as SpaceCoin;
    await spc.deployed();
  });

  describe("Token Contract", () => {
    it("Deploys a Contract", async () => {
      expect(spc.address).to.be.ok;
    });
    it('Is named "SpaceCoin"', async () => {
      expect(await spc.name()).to.equal("SpaceCoin");
    });
    it('Is represented by the symbol "SPC"', async () => {
      expect(await spc.symbol()).to.equal("SPC");
    });
    it("Has a total supply of 500,000 SPC", async () => {
      expect(await spc.totalSupply()).to.eq(TOTAL_SUPPLY);
    });
    it("Allocates 150,000 SPC of supply to ICO investors (30,000 ETH worth)", async () => {
      expect(await spc.balanceOf(icoTreasury.address)).to.equal(
        ethers.utils.parseEther("150000")
      );
    });
    it("Stores the remaining 350,000 SPC of supply in the treasury", async () => {
      expect(await spc.balanceOf(treasury.address)).to.equal(
        ethers.utils.parseEther("350000")
      );
    });
    it("Transfers maintain total supply and balances changed for from and to", async () => {
      const beforeAlice = await spc.balanceOf(alice.address);
      const beforeTreasury = await spc.balanceOf(treasury.address);
      expect(await spc.connect(treasury).transfer(alice.address, TEN_TOKENS)).to
        .be.ok;

      const afterAlice = await spc.balanceOf(alice.address);
      const afterTreasury = await spc.balanceOf(treasury.address);
      expect(afterAlice).to.equal(beforeAlice.add(TEN_TOKENS));
      expect(afterTreasury).to.equal(beforeTreasury.sub(TEN_TOKENS));
      expect(await spc.totalSupply()).to.equal(TOTAL_SUPPLY);
    });
    it("Allows owner to toggle on/off a 2% tax for transfers into the treasury account", async () => {
      expect(await spc.connect(deployer).enableTransferTax()).to.be.ok;
      expect(await spc.connect(deployer).disableTransferTax()).to.be.ok;
    });
    it("Prevents non-owners from toggling on/off the 2% tax", async () => {
      await expect(spc.connect(alice).enableTransferTax()).to.be.revertedWith(
        "Invalid permissions"
      );
      await expect(spc.connect(alice).disableTransferTax()).to.be.revertedWith(
        "Invalid permissions"
      );
    });
    it("Defaults to no tax charged for SPC transfers", async () => {
      const before = await spc.balanceOf(alice.address);
      expect(await spc.connect(treasury).transfer(alice.address, TEN_TOKENS)).to
        .be.ok;
      const after = await spc.balanceOf(alice.address);
      expect(after).to.equal(before.add(TEN_TOKENS));
      expect(await spc.totalSupply()).to.equal(TOTAL_SUPPLY);
    });
    it("Charges 2% for SPC transfers (deposited into the treasury) when tax is toggled on", async () => {
      expect(await spc.connect(deployer).enableTransferTax()).to.be.ok;
      const before = await spc.balanceOf(alice.address);
      expect(await spc.connect(treasury).transfer(alice.address, TEN_TOKENS)).to
        .be.ok;
      const after = await spc.balanceOf(alice.address);
      expect(after).to.not.equal(before.add(TEN_TOKENS));
      const fee = TEN_TOKENS.mul(2).div(100);
      expect(after).to.equal(before.add(TEN_TOKENS).sub(fee));
      expect(await spc.totalSupply()).to.equal(TOTAL_SUPPLY);
    });
  });
  describe("ICO Contract", () => {
    let SpaceCoinICO: SpaceCoinICO__factory;
    let ico: SpaceCoinICO;

    beforeEach(async () => {
      SpaceCoinICO = await ethers.getContractFactory("SpaceCoinICO");
      ico = (await SpaceCoinICO.deploy(
        deployer.address,
        treasury.address
      )) as SpaceCoinICO;
      await ico.deployed();
      spc = await ethers.getContractAt("SpaceCoin", await ico.tokenContract());
    });
    describe("Deployment", () => {
      it("Deploys a contract", async () => {
        expect(ico.address).to.be.ok;
      });
      it("Starts in Seed phase", async () => {
        expect(await ico.currentPhase()).to.equal(SEED_PHASE);
      });
      it("Starts active", async () => {
        expect(await ico.isPaused()).to.be.false;
      });
      it("Unable to add zero address as treasury", async () => {
        const spcICO = await ethers.getContractFactory("SpaceCoinICO");
        await expect(
          spcICO.deploy(deployer.address, ZERO_ADDRESS)
        ).to.be.revertedWith("Cannot use zero address");
      });
      it("Unable to add zero address as manager", async () => {
        const spcICO = await ethers.getContractFactory("SpaceCoinICO");
        await expect(
          spcICO.deploy(ZERO_ADDRESS, deployer.address)
        ).to.be.revertedWith("Cannot use zero address");
      });
      it("Emits SpaceCoinDeployedAndMinted when deployed", async () => {
        expect(
          await SpaceCoinICO.deploy(deployer.address, treasury.address)
        ).to.emit(ico, "SpaceCoinDeployedAndMinted");
      });
    });
    describe("Management", () => {
      it("Allows owner to advance phase forward", async () => {
        expect(await ico.currentPhase()).to.equal(SEED_PHASE);
        expect(await ico.connect(deployer).beginGeneralPhase()).to.be.ok;
        expect(await ico.currentPhase()).to.equal(GENERAL_PHASE);
        expect(await ico.connect(deployer).beginOpenPhase()).to.be.ok;
        expect(await ico.currentPhase()).to.equal(OPEN_PHASE);
      });
      it("Prevents owner from skipping General, straight to phase Open", async () => {
        expect(await ico.currentPhase()).to.equal(SEED_PHASE);
        await expect(ico.connect(deployer).beginOpenPhase()).to.revertedWith(
          "Project must be in General Phase to advance to Open"
        );
        expect(await ico.currentPhase()).to.equal(SEED_PHASE);
      });
      it("Prevents non-owners from advancing phase forward", async () => {
        expect(await ico.currentPhase()).to.equal(SEED_PHASE);
        await expect(ico.connect(alice).beginGeneralPhase()).to.be.revertedWith(
          "Invalid permissions"
        );
        expect(await ico.currentPhase()).to.equal(SEED_PHASE);
        await expect(ico.connect(alice).beginOpenPhase()).to.be.revertedWith(
          "Invalid permissions"
        );
        expect(await ico.currentPhase()).to.equal(SEED_PHASE);
      });
      it("Emits a ICOPhaseChanged event after phase is advanced forward", async () => {
        await expect(ico.connect(deployer).beginGeneralPhase())
          .to.emit(ico, "ICOPhaseChanged")
          .withArgs(GENERAL_PHASE, 0);
        await expect(ico.connect(deployer).beginOpenPhase())
          .to.emit(ico, "ICOPhaseChanged")
          .withArgs(OPEN_PHASE, 0);
      });
      it("Allows owner to pause or resume funding at any time", async () => {
        expect(await ico.isPaused()).to.be.false;
        expect(await ico.connect(deployer).pauseICO()).to.be.ok;
        expect(await ico.isPaused()).to.be.true;
      });
      it("Emits ICONowPaused event when paused", async () => {
        await expect(ico.connect(deployer).pauseICO()).to.emit(
          ico,
          "ICONowPaused"
        );
      });
      it("Emits ICONowActive event when unpaused", async () => {
        await ico.connect(deployer).pauseICO();
        await expect(ico.connect(deployer).resumeICO()).to.emit(
          ico,
          "ICONowActive"
        );
      });
      it("Prevents non-owners from pausing or resuming funding at any time", async () => {
        await expect(ico.connect(alice).pauseICO()).to.be.revertedWith(
          "Invalid permissions"
        );
        expect(await ico.isPaused()).to.be.false;
      });
      it("Allows owner to add seed investors to the whitelist", async () => {
        expect(await ico.isWhitelisted(alice.address)).to.be.false;
        expect(await ico.connect(deployer).addToWhitelist(alice.address)).to.be
          .ok;
        expect(await ico.isWhitelisted(alice.address)).to.be.true;
      });
      it("Adding whitelist emits WhitelistAdded event", async () => {
        await expect(ico.connect(deployer).addToWhitelist(alice.address))
          .to.emit(ico, "WhitelistAdded")
          .withArgs(alice.address);
      });
      it("Prevents non-owners from adding a single seed investor to the whitelist", async () => {
        await expect(
          ico.connect(alice).addToWhitelist(alice.address)
        ).to.be.revertedWith("Invalid permissions");
        expect(await ico.isWhitelisted(alice.address)).to.be.false;
      });
      it("Prevents adding an invalid address to whitelist", async () => {
        await expect(
          ico.connect(deployer).addToWhitelist(ZERO_ADDRESS)
        ).to.be.revertedWith("Invalid account for whitelist");
        await expect(ico.isWhitelisted(ZERO_ADDRESS)).to.be.revertedWith(
          "Invalid account"
        );
      });
      it("Prevents adding to whitelist in General phase", async () => {
        await ico.connect(deployer).beginGeneralPhase();
        await expect(
          ico.connect(deployer).addToWhitelist(bob.address)
        ).to.be.revertedWith("Whitelist is for seed phase investors");
      });
      it("Prevents adding to whitelist in Open phase", async () => {
        await ico.connect(deployer).beginGeneralPhase();
        await ico.connect(deployer).beginOpenPhase();
        await expect(
          ico.connect(deployer).addToWhitelist(bob.address)
        ).to.be.revertedWith("Whitelist is for seed phase investors");
      });
    });
    describe("Contributions & Redemptions", () => {
      let treasuryStartBalance: BigNumber;
      let treasuryEndBalance: BigNumber;

      beforeEach(async () => {
        treasuryStartBalance = await treasury.getBalance();
        await ico.connect(deployer).addToWhitelist(whitelistChris.address);
        expect(await ico.isWhitelisted(whitelistChris.address)).is.true;
      });
      describe("Seed Phase", () => {
        it("Allows contributions through sending eth to contract", async () => {
          expect(await ico.weiRaised()).to.equal(0);
          await whitelistChris.sendTransaction({
            to: ico.address,
            value: ONE_ETHER,
          });
          expect(await ico.weiRaised()).to.equal(ONE_ETHER);
          expect(await ico.contributions(whitelistChris.address)).to.equal(
            ONE_ETHER
          );
          treasuryEndBalance = await treasury.getBalance();
          expect(await ico.weiRaised()).to.equal(
            treasuryEndBalance.sub(treasuryStartBalance)
          );
        });
        it("Allows contributions from whitelisted investors", async () => {
          expect(
            await ico.buyTokens(whitelistChris.address, { value: ONE_ETHER })
          ).to.be.ok;
          expect(await ico.contributions(whitelistChris.address)).to.equal(
            ONE_ETHER
          );
          expect(await ico.tokensToCollect(whitelistChris.address)).to.equal(
            FIVE_TOKENS
          );
        });
        it("Blocks non-whitelist investors via direct transfer", async () => {
          await expect(
            alice.sendTransaction({
              to: ico.address,
              value: ONE_ETHER,
            })
          ).to.be.revertedWith(
            "Only whitelisted addresses can buy tokens at this phase"
          );
        });
        it("Blocks contributions above individual Limit from whitelisted investors", async () => {
          await expect(
            ico.buyTokens(whitelistChris.address, {
              value: ethers.utils.parseEther("1501"),
            })
          ).to.be.revertedWith(
            "Contribution exceeds Seed Phase individual limit"
          );
          await ico.buyTokens(whitelistChris.address, {
            value: ethers.utils.parseEther("1500"),
          });
          await expect(
            ico.buyTokens(whitelistChris.address, {
              value: ONE_ETHER,
            })
          ).to.be.revertedWith(
            "Contribution exceeds Seed Phase individual limit"
          );
          expect(await ico.contributions(whitelistChris.address)).to.equal(
            ethers.utils.parseEther("1500")
          );
          expect(await ico.tokensToCollect(whitelistChris.address)).to.equal(
            ethers.utils.parseEther("7500")
          );
        });
        it("Blocks contributions above funding round limit from whitelisted investors", async () => {
          await fundICOSeedGoal(ico, deployer);
          expect(await ico.weiRaised()).to.equal(
            ethers.utils.parseEther("15000")
          );
          await expect(
            ico.buyTokens(whitelistChris.address, {
              value: ONE_ETHER,
            })
          ).to.be.revertedWith(
            "Contribution exceeds Seed Phase total contribution limit"
          );
          expect(await ico.weiRaised()).to.equal(
            ethers.utils.parseEther("15000")
          );
        });
        it("Blocks contributions from non-whitelisted investors", async () => {
          await expect(
            ico.buyTokens(alice.address, { value: ONE_ETHER })
          ).to.be.revertedWith(
            "Only whitelisted addresses can buy tokens at this phase"
          );
        });
        it("Emits a TokensPurchased event after a contribution is made from a whitelisted investor", async () => {
          await expect(
            ico.buyTokens(whitelistChris.address, { value: ONE_ETHER })
          )
            .to.emit(ico, "TokensPurchased")
            .withArgs(
              deployer.address,
              whitelistChris.address,
              ONE_ETHER,
              FIVE_TOKENS
            );
          await expect(
            whitelistChris.sendTransaction({
              to: ico.address,
              value: ONE_ETHER,
            })
          )
            .to.emit(ico, "TokensPurchased")
            .withArgs(
              whitelistChris.address,
              whitelistChris.address,
              ONE_ETHER,
              FIVE_TOKENS
            );
        });
        it("Blocks contributions when fundraising is paused", async () => {
          await ico.connect(deployer).pauseICO();
          await expect(
            ico.buyTokens(whitelistChris.address, { value: ONE_ETHER })
          ).to.be.revertedWith("ICO must be active");
        });
        it("Prevents token redemptions", async () => {
          await ico.buyTokens(whitelistChris.address, { value: ONE_ETHER });
          await expect(
            ico.connect(whitelistChris).redeemTokens()
          ).to.be.revertedWith("Must be Open Phase to redeem tokens");
          expect(await ico.tokensToCollect(whitelistChris.address)).to.be.equal(
            FIVE_TOKENS
          );
        });
        it("Moves sales to treasury address", async () => {
          expect(
            await ico
              .connect(whitelistChris)
              .buyTokens(whitelistChris.address, {
                value: ethers.utils.parseEther("1000"),
              })
          ).to.be.ok;
          treasuryEndBalance = await treasury.getBalance();
          expect(treasuryEndBalance).to.equal(
            treasuryStartBalance.add(ethers.utils.parseEther("1000"))
          );
        });
      });
      describe("General Phase", () => {
        beforeEach(async () => {
          await ico.connect(deployer).addToWhitelist(alice.address);
          await ico.connect(deployer).addToWhitelist(whitelistChris.address);
        });
        it("Allows contributions from whitelisted investors", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          expect(await ico.currentPhase()).to.equal(GENERAL_PHASE);
          expect(await ico.buyTokens(alice.address, { value: ONE_ETHER })).to.be
            .ok;
          expect(await ico.tokensToCollect(alice.address)).to.equal(
            FIVE_TOKENS
          );
          expect(await ico.weiRaised()).to.equal(ONE_ETHER);
        });
        it("Allows contributions from non-whitelisted investors", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          expect(
            await ico.connect(bob).buyTokens(bob.address, { value: ONE_ETHER })
          ).to.be.ok;
          expect(await ico.contributions(bob.address)).to.equal(ONE_ETHER);
          expect(await ico.tokensToCollect(bob.address)).to.equal(FIVE_TOKENS);
          expect(await ico.weiRaised()).to.equal(ONE_ETHER);
        });
        it("Blocks contributions from seed investors who are already above general individual limit", async () => {
          await ico.connect(whitelistChris).buyTokens(whitelistChris.address, {
            value: ethers.utils.parseEther("1500"),
          });
          await ico.connect(deployer).beginGeneralPhase();
          expect(await ico.weiRaised()).to.equal(
            ethers.utils.parseEther("1500")
          );
          await expect(
            ico.connect(whitelistChris).buyTokens(whitelistChris.address, {
              value: ONE_ETHER,
            })
          ).to.be.revertedWith(
            "Contribution exceeds Seed General individual limits"
          );
          expect(await ico.weiRaised()).to.equal(
            ethers.utils.parseEther("1500")
          );
          expect(await ico.contributions(whitelistChris.address)).to.equal(
            ethers.utils.parseEther("1500")
          );
        });
        it("Blocks contributions above individual limit", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          await expect(
            ico.connect(alice).buyTokens(alice.address, {
              value: ethers.utils.parseEther("1001"),
            })
          ).to.be.revertedWith(
            "Contribution exceeds Seed General individual limits"
          );
          await ico.connect(alice).buyTokens(alice.address, {
            value: ethers.utils.parseEther("980"),
          });
          await expect(
            ico.connect(alice).buyTokens(alice.address, {
              value: ethers.utils.parseEther("50"),
            })
          ).to.be.revertedWith(
            "Contribution exceeds Seed General individual limits"
          );
          expect(await ico.contributions(alice.address)).to.equal(
            ethers.utils.parseEther("980")
          );
          expect(await ico.weiRaised()).to.equal(
            ethers.utils.parseEther("980")
          );
        });
        it("Blocks contributions above funding round limit", async () => {
          await fundICOSeedGoal(ico, deployer);
          await ico.connect(deployer).beginGeneralPhase();
          await fundICOGeneralGoal(ico, deployer);
          expect(await ico.weiRaised()).to.equal(
            ethers.utils.parseEther("30000")
          );
          await expect(
            ico.connect(alice).buyTokens(alice.address, {
              value: ONE_ETHER,
            })
          ).to.be.revertedWith("Contribution exceeds ICO goal");
          expect(await ico.weiRaised()).to.equal(
            ethers.utils.parseEther("30000")
          );
        });
        it("Emits a TokensPurchased event after a contribution is made", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          await expect(ico.buyTokens(alice.address, { value: ONE_ETHER }))
            .to.emit(ico, "TokensPurchased")
            .withArgs(deployer.address, alice.address, ONE_ETHER, FIVE_TOKENS);
          await expect(
            alice.sendTransaction({
              to: ico.address,
              value: ONE_ETHER,
            })
          )
            .to.emit(ico, "TokensPurchased")
            .withArgs(alice.address, alice.address, ONE_ETHER, FIVE_TOKENS);
        });
        it("Blocks contributions when fundraising is paused", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          await ico.connect(deployer).pauseICO();
          await expect(
            ico.connect(alice).buyTokens(alice.address, { value: ONE_ETHER })
          ).to.be.revertedWith("ICO must be active");
          await ico.connect(deployer).resumeICO();
          await expect(
            ico.connect(alice).buyTokens(alice.address, { value: ONE_ETHER })
          ).to.not.reverted;
        });
        it("Prevents token redemptions", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          await expect(ico.connect(alice).redeemTokens()).to.be.revertedWith(
            "Must be Open Phase to redeem tokens"
          );
        });
        it("Moves sales to treasury address", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          expect(
            await ico.connect(alice).buyTokens(alice.address, {
              value: ethers.utils.parseEther("1000"),
            })
          ).to.be.ok;
          treasuryEndBalance = await treasury.getBalance();
          expect(treasuryEndBalance).to.equal(
            treasuryStartBalance.add(ethers.utils.parseEther("1000"))
          );
        });
      });
      describe("Open Phase", () => {
        it("Automatically redeems new contributions for tokens", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          await ico.connect(deployer).beginOpenPhase();
          expect(
            await ico
              .connect(alice)
              .buyTokens(alice.address, { value: ONE_ETHER })
          ).to.be.ok;
          expect(await ico.tokensToCollect(alice.address)).to.equal(0);
          expect(await ico.weiRaised()).to.equal(ONE_ETHER);
          expect(await spc.balanceOf(alice.address)).to.equal(FIVE_TOKENS);

          expect(
            await bob.sendTransaction({ to: ico.address, value: ONE_ETHER })
          ).to.be.ok;
          expect(await ico.tokensToCollect(bob.address)).to.equal(0);
          expect(await ico.weiRaised()).to.equal(ONE_ETHER.add(ONE_ETHER));
          expect(await spc.balanceOf(bob.address)).to.equal(FIVE_TOKENS);
        });
        it("Blocks contributions above funding round limit", async () => {
          await fundICOSeedGoal(ico, deployer);
          await ico.connect(deployer).beginGeneralPhase();
          await fundICOGeneralGoal(ico, deployer);
          await ico.connect(deployer).beginOpenPhase();
          expect(await ico.weiRaised()).to.equal(
            ethers.utils.parseEther("30000")
          );
          await expect(
            ico.connect(alice).buyTokens(alice.address, {
              value: ONE_ETHER,
            })
          ).to.be.revertedWith("Contribution exceeds ICO goal");
        });
        it("Emits a TokensPurchased event after a contribution is made", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          await ico.connect(deployer).beginOpenPhase();
          await expect(
            ico.connect(alice).buyTokens(alice.address, { value: ONE_ETHER })
          )
            .to.emit(ico, "TokensPurchased")
            .withArgs(alice.address, alice.address, ONE_ETHER, FIVE_TOKENS);
          await expect(
            alice.sendTransaction({
              to: ico.address,
              value: ONE_ETHER,
            })
          )
            .to.emit(ico, "TokensPurchased")
            .withArgs(alice.address, alice.address, ONE_ETHER, FIVE_TOKENS);
          expect(await ico.weiRaised()).to.equal(ethers.utils.parseEther("2"));
          expect(await ico.contributions(alice.address)).to.equal(
            ethers.utils.parseEther("2")
          );
          expect(await ico.tokensToCollect(alice.address)).to.equal(0);
        });
        it("Blocks contributions when fundraising is paused", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          await ico.connect(deployer).beginOpenPhase();
          await ico.connect(deployer).pauseICO();
          await expect(
            ico.connect(alice).buyTokens(alice.address, { value: ONE_ETHER })
          ).to.be.revertedWith("ICO must be active");
          await ico.connect(deployer).resumeICO();
          await expect(
            ico.connect(alice).buyTokens(alice.address, { value: ONE_ETHER })
          ).to.not.reverted;
        });
        it("Allows pre-open phase contributions to be redeemed for tokens", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          expect(
            await ico
              .connect(alice)
              .buyTokens(alice.address, { value: ONE_ETHER })
          ).to.be.ok;
          expect(await spc.balanceOf(alice.address)).to.equal(0);
          expect(await ico.contributions(alice.address)).to.equal(ONE_ETHER);
          expect(await ico.tokensToCollect(alice.address)).to.equal(
            FIVE_TOKENS
          );
          await ico.connect(deployer).beginOpenPhase();
          // await spc.connect(alice).approve();
          expect(await ico.connect(alice).redeemTokens()).to.be.ok;
          expect(await spc.balanceOf(alice.address)).to.equal(FIVE_TOKENS);
          expect(await ico.contributions(alice.address)).to.equal(ONE_ETHER);
          expect(await ico.tokensToCollect(alice.address)).to.equal(0);
        });
        it("Emits a TokensRedeemed event after tokens are redeemed", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          await ico
            .connect(alice)
            .buyTokens(alice.address, { value: ONE_ETHER });
          await ico.connect(deployer).beginOpenPhase();
          await expect(ico.connect(alice).redeemTokens())
            .to.emit(ico, "TokensRedeemed")
            .withArgs(alice.address, FIVE_TOKENS);
        });
        it("Prevents unearned token redemptions", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          await ico
            .connect(bob)
            .buyTokens(bob.address, { value: ethers.utils.parseEther("50") });
          await ico.connect(deployer).beginOpenPhase();
          await expect(ico.connect(alice).redeemTokens()).to.be.revertedWith(
            "No tokens to collect"
          );
        });
        it("Allows individual contributions greater than 1500", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          await ico.connect(deployer).beginOpenPhase();
          expect(
            await ico.connect(alice).buyTokens(alice.address, {
              value: ethers.utils.parseEther("5000"),
            })
          ).to.be.ok;
          expect(await spc.balanceOf(alice.address)).to.equal(
            ethers.utils.parseEther("25000")
          );
          expect(await ico.contributions(alice.address)).to.equal(
            ethers.utils.parseEther("5000")
          );
          expect(await ico.tokensToCollect(alice.address)).to.equal(0);
          expect(await ico.weiRaised()).to.equal(
            ethers.utils.parseEther("5000")
          );
        });
        it("Moves sales to treasury address", async () => {
          await ico.connect(deployer).beginGeneralPhase();
          await ico.connect(deployer).beginOpenPhase();
          expect(
            await ico.connect(bob).buyTokens(bob.address, {
              value: ethers.utils.parseEther("5000"),
            })
          ).to.be.ok;
          treasuryEndBalance = await treasury.getBalance();
          expect(treasuryEndBalance).to.equal(
            treasuryStartBalance.add(ethers.utils.parseEther("5000"))
          );
        });
        it("Given away all tokens when ICO is fully funded", async () => {
          // Getting more account with ETH to fund the ICO.
          // alice, bob, chris, etc. have low eth around this point.
          const wallets = await ethers.getSigners();
          const david = wallets[32];
          const eric = wallets[33];
          const frank = wallets[34];

          const numTokensStartForICO = await spc.balanceOf(ico.address);
          expect(numTokensStartForICO).to.be.equal(
            ethers.utils.parseEther("150000")
          );
          expect(await ico.weiRaised()).to.equal(0);
          const almostTenGrand = ethers.utils.parseEther("9999");
          await ico.connect(deployer).beginGeneralPhase();
          await ico.connect(deployer).beginOpenPhase();
          await ico.connect(david).buyTokens(david.address, {
            value: almostTenGrand,
          });
          await ico.connect(eric).buyTokens(eric.address, {
            value: almostTenGrand,
          });
          await ico.connect(frank).buyTokens(frank.address, {
            value: almostTenGrand,
          });
          await ico.connect(deployer).buyTokens(deployer.address, {
            value: ethers.utils.parseEther("3"),
          });
          expect(await ico.weiRaised()).to.equal(
            ethers.utils.parseEther("30000")
          );

          // Now ICO is fully funded.
          const rate = 5;
          expect(await spc.balanceOf(david.address)).to.equal(
            almostTenGrand.mul(rate)
          );
          expect(await spc.balanceOf(eric.address)).to.equal(
            almostTenGrand.mul(rate)
          );
          expect(await spc.balanceOf(frank.address)).to.equal(
            almostTenGrand.mul(rate)
          );
          expect(await spc.balanceOf(deployer.address)).to.equal(
            ethers.utils.parseEther("3").mul(rate)
          );
          const numTokensLeftForICO = await spc.balanceOf(ico.address);
          expect(numTokensLeftForICO).to.equal(0);
          treasuryEndBalance = await treasury.getBalance();
          expect(treasuryEndBalance).to.equal(
            treasuryStartBalance.add(ethers.utils.parseEther("30000"))
          );
        });
        after(async () => {
          // const wallets = await ethers.getSigners();
          // for (const account of wallets) {
          //   console.log(`${account.address}: ${await account.getBalance()}`);
          // }
        });
      });
    });
  });
});
