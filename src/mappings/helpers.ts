/* eslint-disable prefer-const */
import {BigInt, Bytes, ethereum} from '@graphprotocol/graph-ts'
import {ListValidator, Stats, User, Validator, Vault} from "../types/schema";


export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export let ZERO_BI = BigInt.fromI32(0)
export const DUAL_CORE_VAULT = "0xee21ab613d30330823D35Cf91A84cE964808B83F"
export const MARKETPLACE = "0x04EA61C431F7934d51fEd2aCb2c5F942213f8967"
export const B14G_ID = 'b14g'

export function createUser(id: Bytes): User {
    let user = new User(id);
    user.dualCoreBalance = ZERO_BI
    user.coreStakedInOrder = ZERO_BI
    user.save()
    let stats = Stats.load("b14g");
    if (!stats) {
        stats = new Stats("b14g");
        stats.totalStaker = 0;
        stats.totalCoreStaked = new BigInt(0);
        stats.totalEarned = ZERO_BI;
        stats.listOrder = []
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

export function resetValidator(validatorAddress: Bytes): Validator {
    let validator = Validator.load(validatorAddress);
    if (validator === null) {
        validator = new Validator(validatorAddress);
    }
    validator.income = ZERO_BI;
    validator.increasingCount = 0;
    validator.save()
    return validator;
}

export function createListValidator(): ListValidator {
    let listValidator = ListValidator.load(B14G_ID)
    if (!listValidator) {
        listValidator = new ListValidator(B14G_ID)
        listValidator.validators = []
        listValidator.blockPerValidatorInRound = 0;
        listValidator.round = ZERO_BI;
        listValidator.save()
    }
    return listValidator
}
