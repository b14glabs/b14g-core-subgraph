import { VaultAction, User, Stats, Vault, VaultExchangeRate} from '../types/schema'
import {createUser, DUAL_CORE_VAULT, getId, handleVaultAction} from "./helpers";
import {ReInvest, Stake, Unbond, Withdraw, WithdrawDirect, CoreVault, ClaimReward} from "../types/CoreVault/CoreVault";
import {Address, BigInt, Bytes} from "@graphprotocol/graph-ts";
import { B14G_ID } from './helpers';

const coreVaultContract = CoreVault.bind(Address.fromString(DUAL_CORE_VAULT))

export function handleStake(event: Stake): void {
  let vaultAction = new VaultAction(getId(event));
  vaultAction.blockNumber = event.block.number;
  vaultAction.timestamp = event.block.timestamp;
  vaultAction.txHash = event.transaction.hash;
  vaultAction.type = "StakeCoreToVault";
  vaultAction.from = event.params.user;
  vaultAction.amount = event.params.coreAmount;
  vaultAction.to = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase());

  vaultAction.totalCoreStaked = handleVaultAction(
    event.params.coreAmount,
    event.params.dualCoreAmount,
    true,
    false
  );
  vaultAction.save();

  let user = User.load(event.params.user);
  if (user === null) {
    user = createUser(event.params.user);
  }
  user.totalDepositActions += 1;
  user.totalVaultActions += 1;
}

export function handleWithdrawDirect(event: WithdrawDirect): void {
  let vaultAction = new VaultAction(getId(event));
  vaultAction.blockNumber = event.block.number;
  vaultAction.timestamp = event.block.timestamp;
  vaultAction.txHash = event.transaction.hash;
  vaultAction.type = "RedeemInstantlyCoreFromVault";
  vaultAction.from = event.params.user;
  vaultAction.amount = event.params.coreAmount;
  vaultAction.to = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase());
  
  vaultAction.totalCoreStaked = handleVaultAction(
    event.params.coreAmount.plus(event.params.fee),
    event.params.dualCoreAmount,
    false,
    false
  );

  vaultAction.save();

  let user = User.load(event.params.user);
  if (user === null) {
    return;
  }
  user.totalInstantRedeemActions += 1;
  user.totalVaultActions += 1;
}

export function handleUnbond(event: Unbond): void {
  let vaultAction = new VaultAction(getId(event));
  vaultAction.blockNumber = event.block.number;
  vaultAction.timestamp = event.block.timestamp;
  vaultAction.txHash = event.transaction.hash;
  vaultAction.type = "RedeemNormallyCoreFromVault";
  vaultAction.from = event.params.user;
  vaultAction.amount = event.params.coreAmount;
  vaultAction.to = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase());

  vaultAction.totalCoreStaked = handleVaultAction(
    event.params.coreAmount,
    event.params.dualCoreAmount,
    false,
    true
  );
  vaultAction.save();

  let user = User.load(event.params.user);
  if (user === null) {
    return;
  }
  user.totalUnbondActions += 1;
  user.totalVaultActions += 1;
}

export function handleStakeWithdraw(event: Withdraw): void {
  let vaultAction = new VaultAction(getId(event));
  vaultAction.blockNumber = event.block.number;
  vaultAction.timestamp = event.block.timestamp;
  vaultAction.txHash = event.transaction.hash;
  vaultAction.type = "WithdrawCoreFromVault";
  vaultAction.from = event.params.user;
  vaultAction.amount = event.params.amount;
  vaultAction.to = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase());

  let stats = Stats.load(B14G_ID);
  let vault = Vault.load(Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase()));
  if (!stats || !vault) {
    return;
  }
  vaultAction.totalCoreStaked = stats.totalCoreStaked;
  vaultAction.save();

  vault.totalWithdrawActions += 1;
  vault.totalActions += 1;
  vault.save();

  let user = User.load(event.params.user);
  if (user === null) {
    return;
  }
  user.totalVaultWithdrawActions += 1;
  user.totalVaultActions += 1;
}

export function handleReInvest(event: ReInvest): void {
  let vaultAction = new VaultAction(getId(event));
  vaultAction.blockNumber = event.block.number;
  vaultAction.timestamp = event.block.timestamp;
  vaultAction.txHash = event.transaction.hash;
  vaultAction.type = "ReInvestVault";
  vaultAction.from = event.transaction.from;
  vaultAction.amount = coreVaultContract.totalStaked();
  vaultAction.to = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase());

  let stats = Stats.load(B14G_ID);
  let vault = Vault.load(Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase()));
  if (!stats || !vault) {
    return;
  }
  vaultAction.totalCoreStaked = stats.totalCoreStaked;
  vaultAction.save();

  vault.totalReInvestActions += 1;
  vault.totalActions += 1;
  vault.save();
}

export function handleClaimReward(event: ClaimReward): void {
    let stats = Stats.load(B14G_ID);
    if (!stats) {
      return
    }
    if (event.params.reward > new BigInt(0)) {
      let vaultExchangeRate = new VaultExchangeRate(getId(event))
      vaultExchangeRate.timestamp = event.block.timestamp;
      vaultExchangeRate.blockNumber = event.block.number;
      vaultExchangeRate.value = coreVaultContract.exchangeCore(BigInt.fromI64(1_000_000_000_000_000_000))
      vaultExchangeRate.save()
    }
    stats.totalCoreStaked = stats.totalCoreStaked.plus(event.params.reward);
    stats.save();
}
