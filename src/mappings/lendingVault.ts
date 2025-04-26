import { Address, Bytes } from "@graphprotocol/graph-ts";
import {
  CoreInvest,
  LendingInvest,
  LendingVault,
  Redeem,
  Stake,
  Withdraw,
} from "../types/LendingVault/LendingVault";
import {
  Stats,
  User,
  Vault,
  VaultAction,
  VaultActionCount,
} from "../types/schema";
import {
  B14G_ID,
  LENDING_VAULT,
  createUser,
  createVault,
  getId,
} from "./helpers";

const lendingVaultContract = LendingVault.bind(
  Address.fromString(LENDING_VAULT)
);

export function handleStake(event: Stake): void {
  let user = User.load(event.params.user);
  if (!user) {
    user = createUser(event.params.user);
  }
  const actionCount = VaultActionCount.load(user.id);
  if (!actionCount) {
    return;
  }

  let lendingVault = Vault.load(Bytes.fromHexString(LENDING_VAULT));
  if (!lendingVault) {
    lendingVault = createVault(LENDING_VAULT);
  }
  const stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }

  const action = new VaultAction(getId(event));
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "StakeWbtc";
  action.from = event.params.user;
  action.amount = event.params.amount;
  action.to = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  lendingVault.totalDepositActions += 1;
  lendingVault.totalActions += 1;

  actionCount.wbtc += 1;
  actionCount.wbtcStake += 1;

  actionCount.save();
  lendingVault.save();
  action.save();
}

export function handleRedeem(event: Redeem): void {
  const lendingVault = Vault.load(Bytes.fromHexString(LENDING_VAULT));
  if (!lendingVault) {
    return;
  }
  const stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }
  const actionCount = VaultActionCount.load(event.params.user);
  if (!actionCount) {
    return;
  }

  const action = new VaultAction(getId(event));
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "RedeemWbtc";
  action.from = event.params.user;
  action.amount = event.params.stakedAmount;
  action.rewardAmount = event.params.rewardAmount;
  action.to = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  lendingVault.totalUnbondActions += 1;
  lendingVault.totalActions += 1;
  actionCount.wbtc += 1;
  actionCount.wbtcRedeem += 1;

  actionCount.save();
  lendingVault.save();
  action.save();
}

export function handleWithdraw(event: Withdraw): void {
  const lendingVault = Vault.load(Bytes.fromHexString(LENDING_VAULT));
  if (!lendingVault) {
    return;
  }
  const stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }
  const actionCount = VaultActionCount.load(event.params.user);
  if (!actionCount) {
    return;
  }

  const action = new VaultAction(getId(event));
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "WithdrawWbtc";
  action.from = event.params.user;
  action.amount = event.params.amount;
  action.to = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  lendingVault.totalWithdrawActions += 1;
  lendingVault.totalActions += 1;
  actionCount.wbtc += 1;
  actionCount.wbtcWithdraw += 1;

  actionCount.save();
  lendingVault.save();
  action.save();
}

export function handleLending(event: LendingInvest): void {
  const lendingVault = Vault.load(Bytes.fromHexString(LENDING_VAULT));
  if (!lendingVault) {
    return;
  }
  const stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }

  const action = new VaultAction(getId(event));
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = event.params.isLend ? "BorrowCore" : "RepayCore";
  action.from = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.amount = event.params.lendAmount;
  action.to = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  if (event.params.isLend) {
    if (!lendingVault.totalBorrowCoreActions) {
      lendingVault.totalBorrowCoreActions = 1;
    } else {
      lendingVault.totalBorrowCoreActions += 1;
    }
  } else {
    if (!lendingVault.totalRepayCoreActions) {
      lendingVault.totalRepayCoreActions = 1;
    } else {
      lendingVault.totalRepayCoreActions += 1;
    }
  }

  lendingVault.save();
  action.save();
}

export function handleCoreInvest(event: CoreInvest): void {
  const lendingVault = Vault.load(Bytes.fromHexString(LENDING_VAULT));
  if (!lendingVault) {
    return;
  }
  const stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }

  const action = new VaultAction(getId(event));
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "CoreInvest";
  action.from = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.amount = lendingVaultContract.getTotalCoreReward();
  action.to = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  lendingVault.totalActions += 1;
  lendingVault.totalReInvestActions += 1;
  lendingVault.save();
  action.save();
}
