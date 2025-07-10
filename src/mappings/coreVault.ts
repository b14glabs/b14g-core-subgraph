import {
  User,
  Stats,
  Vault,
  VaultExchangeRate,
  UserActionCount,
  VaultAction,
} from "../types/schema";
import {
  createTransaction,
  createUser,
  createUserActionCount,
  DUAL_CORE_VAULT,
  getId,
  handleVaultAction,
} from "./helpers";
import {
  ReInvest,
  Stake,
  Unbond,
  Withdraw,
  WithdrawDirect,
  CoreVault,
  ClaimReward,
  UpdateMaxCap,
} from "../types/CoreVault/CoreVault";
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { B14G_ID } from "./helpers";

const coreVaultContract = CoreVault.bind(Address.fromString(DUAL_CORE_VAULT));

export function handleStake(event: Stake): void {
  let vaultAction = new VaultAction(getId(event));
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.params.user
  );
  vaultAction.transaction = getId(event);
  vaultAction.blockNumber = event.block.number;
  vaultAction.timestamp = event.block.timestamp;
  vaultAction.txHash = event.transaction.hash;
  vaultAction.type = "Stake";
  vaultAction.from = event.params.user;
  vaultAction.amount = event.params.coreAmount;
  vaultAction.toVault = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase());

  vaultAction.totalCoreStaked = handleVaultAction(
    event.params.coreAmount,
    event.params.dualCoreAmount,
    true,
    false
  );
  vaultAction.save();

  let user = User.load(event.params.user);
  if (user === null) {
    user = createUser(event.params.user, event.block.timestamp);
  }

  let userActionCount = UserActionCount.load(
    user.id.concat(Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase()))
  );
  if (!userActionCount) {
    userActionCount = createUserActionCount(
      event.params.user,
      Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase())
    );
  }
  userActionCount.stake += 1;
  userActionCount.total += 1;
  userActionCount.save();
}

export function handleWithdrawDirect(event: WithdrawDirect): void {
  let vaultAction = new VaultAction(getId(event));
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.params.user
  );
  vaultAction.transaction = getId(event);
  vaultAction.blockNumber = event.block.number;
  vaultAction.timestamp = event.block.timestamp;
  vaultAction.txHash = event.transaction.hash;
  vaultAction.type = "RedeemInstantly";
  vaultAction.from = event.params.user;
  vaultAction.amount = event.params.coreAmount;
  vaultAction.toVault = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase());

  vaultAction.totalCoreStaked = handleVaultAction(
    event.params.coreAmount.plus(event.params.fee),
    event.params.dualCoreAmount,
    false,
    false
  );

  vaultAction.save();

  let userActionCount = UserActionCount.load(
    event.params.user.concat(Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase()))
  );
  if (!userActionCount) {
    return;
  }
  userActionCount.withdrawDirect += 1;
  userActionCount.total += 1;
  userActionCount.save();
}

export function handleUnbond(event: Unbond): void {
  let vaultAction = new VaultAction(getId(event));
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.params.user
  );
  vaultAction.transaction = getId(event);
  vaultAction.blockNumber = event.block.number;
  vaultAction.timestamp = event.block.timestamp;
  vaultAction.txHash = event.transaction.hash;
  vaultAction.type = "Redeem";
  vaultAction.from = event.params.user;
  vaultAction.amount = event.params.coreAmount;
  vaultAction.toVault = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase());

  vaultAction.totalCoreStaked = handleVaultAction(
    event.params.coreAmount,
    event.params.dualCoreAmount,
    false,
    true
  );
  vaultAction.save();
  let userActionCount = UserActionCount.load(
    event.params.user.concat(Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase()))
  );
  if (!userActionCount) {
    return;
  }
  userActionCount.unbond += 1;
  userActionCount.total += 1;
  userActionCount.save();
}

export function handleStakeWithdraw(event: Withdraw): void {
  let vaultAction = new VaultAction(getId(event));
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.params.user
  );
  vaultAction.transaction = getId(event);
  vaultAction.blockNumber = event.block.number;
  vaultAction.timestamp = event.block.timestamp;
  vaultAction.txHash = event.transaction.hash;
  vaultAction.type = "Withdraw";
  vaultAction.from = event.params.user;
  vaultAction.amount = event.params.amount;
  vaultAction.toVault = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase());

  let stats = Stats.load(B14G_ID);
  let vault = Vault.load(Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase()));
  if (!stats || !vault) {
    return;
  }
  vaultAction.totalCoreStaked = stats.totalCoreStaked;
  vaultAction.save();

  vault.withdraw += 1;
  vault.total += 1;
  vault.save();

  let userActionCount = UserActionCount.load(
    event.params.user.concat(Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase()))
  );
  if (!userActionCount) {
    return;
  }
  userActionCount.withdraw += 1;
  userActionCount.total += 1;
  userActionCount.save();
}

export function handleReInvest(event: ReInvest): void {
  let vaultAction = new VaultAction(getId(event));
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.transaction.from
  );
  vaultAction.transaction = getId(event);
  vaultAction.blockNumber = event.block.number;
  vaultAction.timestamp = event.block.timestamp;
  vaultAction.txHash = event.transaction.hash;
  vaultAction.type = "ReInvest";
  vaultAction.from = event.transaction.from;
  vaultAction.amount = coreVaultContract.totalStaked();
  vaultAction.toVault = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase());

  let stats = Stats.load(B14G_ID);
  let vault = Vault.load(Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase()));
  if (!stats || !vault) {
    return;
  }
  vaultAction.totalCoreStaked = stats.totalCoreStaked;
  vaultAction.save();

  vault.reInvest += 1;
  vault.total += 1;
  vault.save();
}

export function handleClaimReward(event: ClaimReward): void {
  let stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }
  if (event.params.reward > new BigInt(0)) {
    let vaultExchangeRate = new VaultExchangeRate(getId(event));
    vaultExchangeRate.timestamp = event.block.timestamp;
    vaultExchangeRate.blockNumber = event.block.number;
    vaultExchangeRate.value = coreVaultContract.exchangeCore(
      BigInt.fromI64(1_000_000_000_000_000_000)
    );
    vaultExchangeRate.save();
  }
  stats.totalCoreStaked = stats.totalCoreStaked.plus(event.params.reward);
  stats.save();
}

export function handleMaxCapChange(event: UpdateMaxCap): void {
  let stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }
  stats.vaultMaxCap = event.params.maxCap;
  stats.save();
}
