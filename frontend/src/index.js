import { ethers } from "ethers";
import { isAddress } from "ethers/lib/utils";
import { allowedNodeEnvironmentFlags } from "process";
import { addEmitHelpers } from "typescript";
import SPCJSON from "../../artifacts/contracts/SpaceCoin.sol/SpaceCoin.json";
import ICOJSON from "../../artifacts/contracts/SpaceCoinICO.sol/SpaceCoinICO.json";

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// const icoAddr = "0xf27DD9c3342F938e3d99F525740f9FaFB912B12d"; // Goerli
const icoAddr = "0x3C681Ca14A58a054513786BF91b5C112684D50c1"; // Goerli v2
const icoContract = new ethers.Contract(icoAddr, ICOJSON.abi, provider);

// For playing around with in the browser
window.ethers = ethers;
window.provider = provider;
window.signer = signer;
window.contract = icoContract;

// Kick things off
go();

async function go() {
  await connectToMetamask();
  const connectedAddress = await signer.getAddress();
  currentPhase.innerText = await getCurrentPhase();
  weiRaisedDisplay.innerText = await icoContract.weiRaised();
  icoAddress.innerText = icoAddr;
  tokenAddress.innerText = await icoContract.tokenContract();
  pauseStatus.innerText = await getPauseStatus();

  await refreshContributionValues(connectedAddress);

  buyTokensButton.addEventListener("click", async () => {
    console.log("input: ", buyTokensInput.value);
    try {
      const amount = ethers.utils.parseEther(buyTokensInput.value);
      const receipt = await icoContract
        .connect(signer)
        .buyTokens(connectedAddress, { value: amount });
      buyTokensResult.innerText = "Waiting for transaction to be mined.";
      await receipt.wait();
      await refreshContributionValues(connectedAddress);
      buyTokensResult.innerText = "Done";
    } catch (err) {
      if (err.message.startsWith("invalid decimal value")) {
        buyTokensResult.innerText = "Invalid decimal value";
      } else if (err.message.includes("insufficient funds")) {
        buyTokensResult.innerText = "Not enough funds. Get richer.";
      } else if (err.message.includes("ICO must be active")) {
        buyTokensResult.innerText = "ICO must be active";
      } else if (err.message.includes("Only whitelisted address")) {
        buyTokensResult.innerText = "Need to be on whitelist";
      } else {
        buyTokensResult.innerText = "Unable to buy tokens";
        console.log(err);
        alert(err);
      }
    }
  });

  const manager = await icoContract.manager();
  const isManager = manager === connectedAddress;
  if (isManager) {
    console.log("manager is connected");
    managerPanelDesc.innerText = "You are connected as the manager";
  } else {
    managerPanelDesc.innerText = "You are NOT connected as the manager";
    console.log("manager is not connected");
  }

  addToWhiteList.addEventListener("click", async () => {
    if (!isManager) {
      addToWhiteListResult.innerText = `${connectedAddress} is not a manager`;
      return;
    }
    const addr = whitelistInput.value;
    console.log(addr);
    if (ethers.utils.isAddress(addr)) {
      console.log(`Adding ${addr} to whitelist`);
      await icoContract.connect(signer).addToWhitelist(addr);
      addToWhiteListResult.innerText = `Added ${addr} to whitelist`;
    } else {
      addToWhiteListResult.innerText = `${addr} is not a valid address.`;
    }
  });

  pauseButton.addEventListener("click", async () => {
    if (!isManager) {
      pauseResult.innerText = `Pause: ${connectedAddress} is not a manager`;
      return;
    }
    try {
      await icoContract.connect(signer).pauseICO();
      pauseStatus.innerText = await getPauseStatus();
      pauseResult.innerText = "ICO Paused";
    } catch (err) {
      if (err.message.includes("ICO is already paused")) {
        pauseResult.innerText = "ICO is already paused";
      } else if (err.message.includes("Invalid permissions")) {
        pauseResult.innerText = "Invalid permissions";
      } else {
        console.log(err);
        alert(err.message);
      }
    }
  });

  unpauseButton.addEventListener("click", async () => {
    if (!isManager) {
      pauseResult.innerText = `Unpause: ${connectedAddress} is not a manager`;
      return;
    }
    try {
      await icoContract.connect(signer).resumeICO();
      pauseStatus.innerText = await getPauseStatus();
      pauseResult.innerText = "ICO unpaused";
    } catch (err) {
      if (err.message.includes("ICO is already active")) {
        pauseResult.innerText = "ICO is already active";
      } else if (err.message.includes("Invalid permissions")) {
        pauseResult.innerText = "Invalid permissions";
      } else {
        console.log(err);
        alert(err.message);
      }
    }
  });
}

async function refreshContributionValues(addr) {
  const contribAmt = await icoContract.contributions(addr);
  contributionAmt.innerText = ethers.utils.formatEther(5 * contribAmt);
  contributionAmtWei.innerText = ethers.utils.formatEther(contribAmt);
}

async function getPauseStatus() {
  if (await icoContract.isPaused()) {
    return "Paused";
  } else {
    return "Active";
  }
}

async function getCurrentPhase() {
  const phase = await icoContract.currentPhase();
  switch (phase) {
    case 0: {
      return "Seed Phase";
    }
    case 1: {
      return "General Phase";
    }
    case 2: {
      return "Open Phase";
    }
  }
  return "unknown";
}

async function connectToMetamask() {
  try {
    console.log("Signed in", await signer.getAddress());
  } catch (err) {
    console.log("Not signed in");
    await provider.send("eth_requestAccounts", []);
  }
}
