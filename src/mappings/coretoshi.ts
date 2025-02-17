import {Transfer as TransferEvent} from '../types/Coretoshi/Coretoshi'
import {log, BigInt} from '@graphprotocol/graph-ts'
import {CoretoshiTransfer, Transaction, User, Vault} from '../types/schema'
import {ADDRESS_ZERO, createTransaction, createUser, DUAL_CORE_VAULT} from "./helpers";


export function handleCoretoshiTransfer(event: TransferEvent): void {
    let transfer = new CoretoshiTransfer(event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString()));
    transfer.transaction = event.transaction.hash.toHexString();
    transfer.timestamp = event.block.timestamp
    transfer.tokenId = event.params.tokenId;
    transfer.from = event.params.from;
    transfer.to = event.params.to;
    transfer.save()

    let transaction = Transaction.load(event.transaction.hash.toHexString())
    if (transaction === null) {
        transaction = createTransaction(event.transaction.hash.toHexString(), event)
    }
    let vault = Vault.load(DUAL_CORE_VAULT)
    if (vault === null) return;
    transaction.coretoshiTransfer = transaction.coretoshiTransfer.concat([transfer.id]);
    transaction.save()

    if (event.params.from.toHexString() != ADDRESS_ZERO) {
        let user = User.load(event.params.from.toHexString());
        if (user === null) {
            user = createUser(event.params.from.toHexString());
        }
        user.coretoshiBalance -= 1
        user.save()
        if (user.coretoshiBalance == 0) {
            vault.coretoshiTotalStake = vault.coretoshiTotalStake.minus(user.dualCoreBalance);
            vault.normalTotalStake = vault.normalTotalStake.plus(user.dualCoreBalance);
        }
    }
    if (event.params.to.toHexString() != ADDRESS_ZERO) {
        let user = User.load(event.params.to.toHexString());

        if (user === null) {
            user = createUser(event.params.to.toHexString());
        }
        if (user.coretoshiBalance == 0) {
            vault.coretoshiTotalStake = vault.coretoshiTotalStake.plus(user.dualCoreBalance);
            vault.normalTotalStake = vault.normalTotalStake.minus(user.dualCoreBalance);
        }

        user.coretoshiBalance = user.coretoshiBalance + 1
        user.save()
    }
    vault.save()
}
