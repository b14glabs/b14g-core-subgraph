/* eslint-disable prefer-const */
import {BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts'
import { Order, Stats, User, Vault } from "../types/schema";

export enum ORDER_ACTION  {
    STAKE,
    WITHDRAW,
    CLAIM
}

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export let ZERO_BI = BigInt.fromI32(0)
export const DUAL_CORE_VAULT = "0xee21ab613d30330823D35Cf91A84cE964808B83F"
export const MARKETPLACE_STRATEGY_ADDRESS = '0xcd6D74b6852FbeEb1187ec0E231aB91E700eC3BA'
export const B14G_ID = 'b14g'

export function createUser(id: Bytes): User {
    let user = new User(id);
    user.dualCoreBalance = ZERO_BI
    user.coreStakedInOrder = ZERO_BI
    user.save()
    let stats = Stats.load(B14G_ID);
    if (!stats) {
      stats = new Stats(B14G_ID);
      stats.totalStaker = 0;
      stats.totalCoreStaked = ZERO_BI;
      stats.totalDualCore = ZERO_BI
    //   stats.listOrder = []
    }
    stats.totalStaker += 1;
    stats.save();
    return user;
}

export function createVault(id: string): Vault {
    let vault = new Vault(Bytes.fromHexString(id));
    vault.totalStaked = ZERO_BI
    vault.totalActions = 0
    vault.save()
    return vault;
}

export function getId(event: ethereum.Event): Bytes {
    return event.transaction.hash.concatI32(event.logIndex.toI32())
}

export function handleVaultAction(coreAmount: BigInt, dualCoreAmount: BigInt, isStake: boolean): BigInt {
    let stats = Stats.load(B14G_ID);
    let vault = Vault.load(Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase()))
    if (!stats ) {
      return ZERO_BI
    }
    if( !vault) {
        vault = createVault(DUAL_CORE_VAULT.toLowerCase())
    }
    if (isStake) {
        stats.totalCoreStaked = stats.totalCoreStaked.plus(coreAmount);
        stats.totalDualCore = stats.totalDualCore.plus(dualCoreAmount)
    } else {
        stats.totalCoreStaked = stats.totalCoreStaked.minus(coreAmount);
        stats.totalDualCore = stats.totalDualCore.minus(dualCoreAmount)
    }
    vault.totalActions += 1

    vault.save()
    stats.save()
    return stats.totalCoreStaked
}

export function handleOrderAction(coreAmount: BigInt, orderId: Bytes, user: Bytes, type: ORDER_ACTION): BigInt {
    let stats = Stats.load(B14G_ID);
    let order = Order.load(orderId);
    if (!stats || !order) {
        return ZERO_BI
    }

    if(type == ORDER_ACTION.CLAIM) {
        order.totalActions += 1
        order.save()
        return stats.totalCoreStaked
    } else {
        if (user.toHexString().toLowerCase() != MARKETPLACE_STRATEGY_ADDRESS.toLowerCase()) {
            if (type == ORDER_ACTION.STAKE) {
                stats.totalCoreStaked = stats.totalCoreStaked.plus(coreAmount)
            } else {
                stats.totalCoreStaked = stats.totalCoreStaked.minus(coreAmount)
            }
        }
        order.totalActions +=1
        order.save()
        stats.save()

        return stats.totalCoreStaked
    }
}
