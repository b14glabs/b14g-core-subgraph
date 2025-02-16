/* eslint-disable prefer-const */
import {BigInt, ethereum} from '@graphprotocol/graph-ts'
import {Transaction, User} from "../types/schema";


export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export let ZERO_BI = BigInt.fromI32(0)
export const DUAL_CORE_VAULT = "0xee21ab613d30330823D35Cf91A84cE964808B83F"
export function createUser(id: string): User {
    let user = new User(id);
    user.coretoshiBalance = 0
    user.dualCoreBalance = ZERO_BI
    user.save()
    return user;
}

export function createTransaction(id: string, event: ethereum.Event): Transaction {
    let transaction = new Transaction(id)
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.coretoshiTransfer = []
    transaction.dualCoreTransfer = []
    return transaction;
}
