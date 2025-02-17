/* eslint-disable prefer-const */
import {BigInt, ethereum} from '@graphprotocol/graph-ts'
import {User, Vault} from "../types/schema";


export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export let ZERO_BI = BigInt.fromI32(0)
export const DUAL_CORE_VAULT = "0xee21ab613d30330823D35Cf91A84cE964808B83F"

export function createUser(id: string): User {
    let user = new User(id);
    user.dualCoreBalance = ZERO_BI
    user.coreStakedInOrder = ZERO_BI
    user.orderActionActivities = []
    user.vaultActionActivities = []
    user.stakedOrder = [];
    user.save()
    return user;
}

export function createVault(id: string): Vault {
    let vault = new Vault(id);
    vault.totalStaked = ZERO_BI
    vault.activities = []
    vault.save()
    return vault;
}

export function getId(event: ethereum.Event): string {
    return event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString());
}
