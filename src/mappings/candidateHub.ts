import {turnedRound} from "../types/CandidateHub/CandidateHub";
import {ListValidator} from "../types/schema";
import {B14G_ID, createListValidator, resetValidator, ZERO_BI} from "./helpers";
import {Address, Bytes} from '@graphprotocol/graph-ts'

import {ValidatorSet} from "../types/ValidatorSet/ValidatorSet";

const validatorSet = ValidatorSet.bind(Address.fromString("0x0000000000000000000000000000000000001000"))

export function handleTurnedRound(event: turnedRound): void {
    let listValidator = createListValidator();
    const validators = validatorSet.getValidators()
    let listValidatorBytes = [] as Bytes[]
    for (let i = 0; i < validators.length; i++) {
        resetValidator(validators[i])
        listValidatorBytes.push(Bytes.fromHexString(validators[i].toHexString()))
    }
    for (let i = 0; i < listValidator.validators.length; i++) {
        resetValidator(listValidator.validators[i])
    }
    listValidator.round = event.params.round;
    listValidator.validators = listValidatorBytes;
    listValidator.blockPerValidatorInRound = 86400 / 3 / validators.length;
    listValidator.save();
}
