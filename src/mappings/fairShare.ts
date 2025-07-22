import {ClaimReward, UnbondReward, WithdrawCoreReward} from "../types/FairShare/FairShareOrder";
import {Stats, User, Vault, VaultAction, FairShareActionCount} from "../types/schema";
import {Bytes} from "@graphprotocol/graph-ts";
import {B14G_ID, createTransaction, createUser, createVault, FAIR_SHARE_ORDER, getId, LENDING_VAULT} from "./helpers";

// disable until have realdata
export function handleWithdrawCoreReward(event: WithdrawCoreReward): void {
  let fairShareVault = Vault.load(Bytes.fromHexString(FAIR_SHARE_ORDER));
  if (!fairShareVault) {
    fairShareVault = createVault(FAIR_SHARE_ORDER);
  }
  let user = User.load(event.params.user);
  if (user === null) {
    createUser(event.params.user, event.block.timestamp);
  }
  const stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }
  const action = new VaultAction(getId(event));
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.params.user,
    Bytes.fromHexString(FAIR_SHARE_ORDER),
    "FairShare",
    "Withdraw",
    event.params.amount,
    event.transaction.hash
  );
  action.transaction = getId(event);
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "WithdrawCoreReward";
  action.from = event.params.user;
  action.amount = event.params.amount;
  action.rewardAmount = event.params.amount;
  action.toVault = Bytes.fromHexString(FAIR_SHARE_ORDER.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  fairShareVault.withdraw += 1;
  fairShareVault.total += 1;
  fairShareVault.save();

  action.save();

  let fairShareActionCount = FairShareActionCount.load(event.params.user);
  if (!fairShareActionCount) {
    fairShareActionCount = new FairShareActionCount(event.params.user);
    fairShareActionCount.user = event.params.user;
    fairShareActionCount.total = 0;
    fairShareActionCount.withdrawCore = 0;
    fairShareActionCount.claimDualCore = 0;
    fairShareActionCount.unbond = 0;
    fairShareActionCount.save();
    return;
  }
  fairShareActionCount.total += 1;
  fairShareActionCount.withdrawCore += 1;
  fairShareActionCount.save();
}

export function handleUnbondReward(event: UnbondReward): void {
  let fairShareVault = Vault.load(Bytes.fromHexString(FAIR_SHARE_ORDER));
  if (!fairShareVault) {
    fairShareVault = createVault(FAIR_SHARE_ORDER);
  }
  let user = User.load(event.params.user);
  if (user === null) {
    createUser(event.params.user, event.block.timestamp);
  }
  const stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }
  const action = new VaultAction(getId(event));
  const transaction = createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.params.user,
    Bytes.fromHexString(FAIR_SHARE_ORDER),
    "FairShare",
    "Withdraw",
    event.params.core,
    event.transaction.hash
  );
  transaction.rewardAmount = event.params.dualCore;
  transaction.save();

  action.transaction = getId(event);
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "UnbondReward";
  action.from = event.params.user;
  action.amount = event.params.core;
  action.rewardAmount = event.params.dualCore;
  action.toVault = Bytes.fromHexString(FAIR_SHARE_ORDER.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  fairShareVault.unbond += 1;
  fairShareVault.total += 1;
  fairShareVault.save();

  action.save();

  let fairShareActionCount = FairShareActionCount.load(event.params.user);
  if (!fairShareActionCount) {
    fairShareActionCount = new FairShareActionCount(event.params.user);
    fairShareActionCount.user = event.params.user;
    fairShareActionCount.total = 0;
    fairShareActionCount.withdrawCore = 0;
    fairShareActionCount.claimDualCore = 0;
    fairShareActionCount.unbond = 0;
    fairShareActionCount.save();
    return;
  }
  fairShareActionCount.total += 1;
  fairShareActionCount.unbond += 1;
  fairShareActionCount.save();
}

//totalInstantRedeemActions in vault
export function handleClaimReward(event: ClaimReward): void {
    let fairShareVault = Vault.load(Bytes.fromHexString(FAIR_SHARE_ORDER));
    if (!fairShareVault) {
        fairShareVault = createVault(FAIR_SHARE_ORDER);
    }
    let user = User.load(event.params.user);
    if (user === null) {
        createUser(event.params.user, event.block.timestamp);
    }
    const stats = Stats.load(B14G_ID);
    if (!stats) {
        return;
    }
    const action = new VaultAction(getId(event));
    const transaction = createTransaction(
      getId(event),
      event.block.number,
      event.block.timestamp,
      event.params.user,
      Bytes.fromHexString(FAIR_SHARE_ORDER),
      "FairShare",
      "ClaimReward",
      event.params.dualCore,
      event.transaction.hash
    );
    transaction.rewardAmount = event.params.dualCore;
    transaction.save();
    
    action.transaction = getId(event);
    action.blockNumber = event.block.number;
    action.timestamp = event.block.timestamp;
    action.txHash = event.transaction.hash;
    action.type = "ClaimReward";
    action.from = event.params.user;
    action.amount = event.params.dualCore;
    action.rewardAmount = event.params.dualCore;
    action.toVault = Bytes.fromHexString(FAIR_SHARE_ORDER.toLowerCase());
    action.totalCoreStaked = stats.totalCoreStaked;

    fairShareVault.redeemInstantly += 1;
    fairShareVault.total += 1;


    fairShareVault.save();
    action.save();


    let fairShareActionCount = FairShareActionCount.load(event.params.user);
    if (!fairShareActionCount) {
        fairShareActionCount = new FairShareActionCount(event.params.user);
        fairShareActionCount.user = event.params.user;
        fairShareActionCount.total = 0;
        fairShareActionCount.withdrawCore = 0;
        fairShareActionCount.claimDualCore = 0;
        fairShareActionCount.unbond = 0;
        fairShareActionCount.save();
    }
    fairShareActionCount.total += 1;
    fairShareActionCount.claimDualCore += 1;
    fairShareActionCount.save();

}
