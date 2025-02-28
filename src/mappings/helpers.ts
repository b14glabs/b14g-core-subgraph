/* eslint-disable prefer-const */
import {BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts'
import { Stats, User, Vault } from "../types/schema";


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
    //   stats.listOrder = []
    }
    stats.totalStaker += 1;
    stats.save();
    return user;
}

export function createVault(id: string): Vault {
    let vault = new Vault(Bytes.fromHexString(id));
    vault.totalStaked = ZERO_BI
    vault.save()
    return vault;
}

export function getId(event: ethereum.Event): Bytes {
    return event.transaction.hash.concatI32(event.logIndex.toI32())
}
