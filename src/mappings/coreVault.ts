import {Order, VaultAction, StakedInOrder, User, Vault, Stats} from '../types/schema'
import {createUser, createVault, DUAL_CORE_VAULT, getId, ZERO_BI} from "./helpers";
import {ReInvest, Stake, Unbond, Withdraw, WithdrawDirect, CoreVault, ClaimReward} from "../types/CoreVault/CoreVault";
import {Address, BigInt} from "@graphprotocol/graph-ts";

const coreVaultContract = CoreVault.bind(Address.fromString(DUAL_CORE_VAULT))

export function handleStake(event: Stake): void {
    let vault = Vault.load(DUAL_CORE_VAULT)
    if (vault === null) {
        vault = createVault(DUAL_CORE_VAULT)
    }

    let vaultAction = new VaultAction(getId(event))
    vaultAction.blockNumber = event.block.number;
    vaultAction.timestamp = event.block.timestamp;
    vaultAction.txHash = event.transaction.hash;
    vaultAction.type = "StakeCoreToVault"
    vaultAction.from = event.params.user;
    vaultAction.amount = event.params.coreAmount;

    let stats = Stats.load("b14g");
    if (!stats) {
      stats = new Stats("b14g");
      stats.totalStaker = 0;
      stats.totalCoreStaked = new BigInt(0);
    //   stats.listOrder = []
    }
    stats.totalCoreStaked = stats.totalCoreStaked.plus(
      event.params.coreAmount
    );

    vaultAction.totalCoreStaked = stats.totalCoreStaked
    stats.save()
    vaultAction.save()

    let user = User.load(event.params.user.toHexString());
    if (user === null) {
        user = createUser(event.params.user.toHexString());
    }
    user.vaultActionActivities = user.vaultActionActivities.concat([vaultAction.id])
    user.save()


    vault.activities = vault.activities.concat([vaultAction.id])
    vault.save()

}

export function handleWithdrawDirect(event: WithdrawDirect): void {
    let vault = Vault.load(DUAL_CORE_VAULT)
    if (vault === null) {
        return
    }

    let vaultAction = new VaultAction(getId(event))
    vaultAction.blockNumber = event.block.number;
    vaultAction.timestamp = event.block.timestamp;
    vaultAction.txHash = event.transaction.hash;
    vaultAction.type = "RedeemInstantlyCoreFromVault"
    vaultAction.from = event.params.user;
    vaultAction.amount = event.params.coreAmount;

    let stats = Stats.load("b14g");
    if (!stats) {
      return
    }
    stats.totalCoreStaked = (stats.totalCoreStaked.minus(
      event.params.coreAmount
    )).minus(event.params.fee);

    vaultAction.totalCoreStaked = stats.totalCoreStaked

    stats.save()
    vaultAction.save()

    let user = User.load(event.params.user.toHexString());
    if (user === null) {
        return
    }
    user.vaultActionActivities = user.vaultActionActivities.concat([vaultAction.id])
    user.save()

    vault.activities = vault.activities.concat([vaultAction.id])
    vault.save()

}

export function handleUnbond(event: Unbond): void {
    let vault = Vault.load(DUAL_CORE_VAULT)
    if (vault === null) {
        return
    }

    let vaultAction = new VaultAction(getId(event))
    vaultAction.blockNumber = event.block.number;
    vaultAction.timestamp = event.block.timestamp;
    vaultAction.txHash = event.transaction.hash;
    vaultAction.type = "RedeemNormallyCoreFromVault"
    vaultAction.from = event.params.user;
    vaultAction.amount = event.params.coreAmount;

    let stats = Stats.load("b14g");
    if (!stats) {
      return
    }
    stats.totalCoreStaked = stats.totalCoreStaked.minus(
      event.params.coreAmount
    );

    vaultAction.totalCoreStaked = stats.totalCoreStaked
    stats.save()
    vaultAction.save()

    let user = User.load(event.params.user.toHexString());
    if (user === null) {
        return
    }
    user.vaultActionActivities = user.vaultActionActivities.concat([vaultAction.id])
    user.save()


    vault.activities = vault.activities.concat([vaultAction.id])
    vault.save()

}

export function handleStakeWithdraw(event: Withdraw): void {
    let vault = Vault.load(DUAL_CORE_VAULT)
    if (vault === null) {
        return
    }

    let vaultAction = new VaultAction(getId(event))
    vaultAction.blockNumber = event.block.number;
    vaultAction.timestamp = event.block.timestamp;
    vaultAction.txHash = event.transaction.hash;
    vaultAction.type = "WithdrawCoreFromVault"
    vaultAction.from = event.params.user;
    vaultAction.amount = event.params.amount;

    let stats = Stats.load("b14g");
    if (!stats) {
      return
    }
    vaultAction.totalCoreStaked = stats.totalCoreStaked
    vaultAction.save()

    let user = User.load(event.params.user.toHexString());
    if (user === null) {
        return
    }
    user.vaultActionActivities = user.vaultActionActivities.concat([vaultAction.id])
    user.save()


    vault.activities = vault.activities.concat([vaultAction.id])
    vault.save()

}

export function handleReInvest(event: ReInvest): void {
    let vault = Vault.load(DUAL_CORE_VAULT)
    if (vault === null) {
        return
    }

    let vaultAction = new VaultAction(getId(event))
    vaultAction.blockNumber = event.block.number;
    vaultAction.timestamp = event.block.timestamp;
    vaultAction.txHash = event.transaction.hash;
    vaultAction.type = "ReInvestVault"
    vaultAction.from = event.transaction.from;
    vaultAction.amount = coreVaultContract.totalStaked();

    let stats = Stats.load("b14g");
    if (!stats) {
      return
    }
    vaultAction.totalCoreStaked = stats.totalCoreStaked
    vaultAction.save()

    let user = User.load(event.transaction.from.toHexString());
    if (user === null) {
        return
    }
    user.vaultActionActivities = user.vaultActionActivities.concat([vaultAction.id])
    user.save()


    vault.activities = vault.activities.concat([vaultAction.id])
    vault.save()

}

export function handleClaimReward(event: ClaimReward): void {
    let stats = Stats.load("b14g");
    if (!stats) {
      return
    }
    stats.totalCoreStaked = stats.totalCoreStaked.plus(event.params.reward);
  
    stats.save();
}
