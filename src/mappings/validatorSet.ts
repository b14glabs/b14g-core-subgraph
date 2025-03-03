import {validatorDeposit} from "../types/ValidatorSet/ValidatorSet";
import {Order, Stats, Validator} from "../types/schema";
import {B14G_ID, ZERO_BI} from "./helpers";
import {BigInt} from '@graphprotocol/graph-ts'

export function handleValidatorDeposit(event: validatorDeposit): void {
    let validator = Validator.load(event.params.validator);
    if (validator === null) return;
    validator.income = validator.income.plus(event.params.amount);
    validator.increasingCount += 1;
    validator.save()
}
