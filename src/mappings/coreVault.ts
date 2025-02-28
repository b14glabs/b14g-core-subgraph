import { VaultAction, User, Stats} from '../types/schema'
import {createUser, DUAL_CORE_VAULT, getId, ZERO_BI} from "./helpers";
import {ReInvest, Stake, Unbond, Withdraw, WithdrawDirect, CoreVault, ClaimReward} from "../types/CoreVault/CoreVault";
import {Address, BigInt, Bytes} from "@graphprotocol/graph-ts";
import { B14G_ID } from './helpers';

const coreVaultContract = CoreVault.bind(Address.fromString(DUAL_CORE_VAULT))

export function handleStake(event: Stake): void {
    let vaultAction = new VaultAction(getId(event))
    vaultAction.blockNumber = event.block.number;
    vaultAction.timestamp = event.block.timestamp;
    vaultAction.txHash = event.transaction.hash;
    vaultAction.type = "StakeCoreToVault"
    vaultAction.from = event.params.user;
    vaultAction.amount = event.params.coreAmount;
    vaultAction.to = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase())

    let stats = Stats.load(B14G_ID);
    if (!stats) {
      stats = new Stats(B14G_ID);
      stats.totalStaker = 0;
      stats.totalCoreStaked = ZERO_BI;
    }
    stats.totalCoreStaked = stats.totalCoreStaked.plus(
      event.params.coreAmount
    );

    vaultAction.totalCoreStaked = stats.totalCoreStaked
    stats.save()
    vaultAction.save()

    let user = User.load(event.params.user);
    if (user === null) {
        user = createUser(event.params.user);
    }

}

export function handleWithdrawDirect(event: WithdrawDirect): void {
    let vaultAction = new VaultAction(getId(event))
    vaultAction.blockNumber = event.block.number;
    vaultAction.timestamp = event.block.timestamp;
    vaultAction.txHash = event.transaction.hash;
    vaultAction.type = "RedeemInstantlyCoreFromVault"
    vaultAction.from = event.params.user;
    vaultAction.amount = event.params.coreAmount;
    vaultAction.to = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase())

    let stats = Stats.load(B14G_ID);
    if (!stats) {
      return
    }
    stats.totalCoreStaked = (stats.totalCoreStaked.minus(
      event.params.coreAmount
    )).minus(event.params.fee);

    vaultAction.totalCoreStaked = stats.totalCoreStaked

    stats.save()
    vaultAction.save()

}

export function handleUnbond(event: Unbond): void {

    let vaultAction = new VaultAction(getId(event))
    vaultAction.blockNumber = event.block.number;
    vaultAction.timestamp = event.block.timestamp;
    vaultAction.txHash = event.transaction.hash;
    vaultAction.type = "RedeemNormallyCoreFromVault"
    vaultAction.from = event.params.user;
    vaultAction.amount = event.params.coreAmount;
    vaultAction.to = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase())

    let stats = Stats.load(B14G_ID);
    if (!stats) {
      return
    }
    stats.totalCoreStaked = stats.totalCoreStaked.minus(
      event.params.coreAmount
    );

    vaultAction.totalCoreStaked = stats.totalCoreStaked
    stats.save()
    vaultAction.save()

}

export function handleStakeWithdraw(event: Withdraw): void {
    let vaultAction = new VaultAction(getId(event))
    vaultAction.blockNumber = event.block.number;
    vaultAction.timestamp = event.block.timestamp;
    vaultAction.txHash = event.transaction.hash;
    vaultAction.type = "WithdrawCoreFromVault"
    vaultAction.from = event.params.user;
    vaultAction.amount = event.params.amount;
    vaultAction.to = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase())

    let stats = Stats.load(B14G_ID);
    if (!stats) {
      return
    }
    vaultAction.totalCoreStaked = stats.totalCoreStaked
    vaultAction.save()

}

export function handleReInvest(event: ReInvest): void {
    let vaultAction = new VaultAction(getId(event))
    vaultAction.blockNumber = event.block.number;
    vaultAction.timestamp = event.block.timestamp;
    vaultAction.txHash = event.transaction.hash;
    vaultAction.type = "ReInvestVault"
    vaultAction.from = event.transaction.from;
    vaultAction.amount = coreVaultContract.totalStaked();
    vaultAction.to = Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase())

    let stats = Stats.load(B14G_ID);
    if (!stats) {
      return
    }
    vaultAction.totalCoreStaked = stats.totalCoreStaked
    vaultAction.save()

}

export function handleClaimReward(event: ClaimReward): void {
    let stats = Stats.load(B14G_ID);
    if (!stats) {
      return
    }
    stats.totalCoreStaked = stats.totalCoreStaked.plus(event.params.reward);
  
    stats.save();
}
