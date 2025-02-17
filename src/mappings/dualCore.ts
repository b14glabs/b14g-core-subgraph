import {Transfer as TransferEvent} from '../types/DualCoreToken/ERC20'
import {log, BigInt} from '@graphprotocol/graph-ts'
import {DualCoreTransfer, Vault, Transaction, User} from '../types/schema'
import {ADDRESS_ZERO, createTransaction, createUser, createVault, DUAL_CORE_VAULT, ZERO_BI} from "./helpers";


export function handleTransfer(event: TransferEvent): void {
    let transfer = new DualCoreTransfer(event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString()));
    transfer.transaction = event.transaction.hash.toHexString();
    transfer.timestamp = event.block.timestamp
    transfer.amount = event.params.value;
    transfer.from = event.params.from;
    transfer.to = event.params.to;
    transfer.save()

    let vault = Vault.load(DUAL_CORE_VAULT)
    if (vault === null) {
        vault = createVault(DUAL_CORE_VAULT);
    }

    let transaction = Transaction.load(event.transaction.hash.toHexString())
    if (transaction === null) {
        transaction = createTransaction(event.transaction.hash.toHexString(), event)
    }

    transaction.dualCoreTransfer = transaction.dualCoreTransfer.concat([transfer.id]);
    transaction.save()

    if (event.params.from.toHexString() != ADDRESS_ZERO) {
        let user = User.load(event.params.from.toHexString());
        if (user === null) {
            user = createUser(event.params.from.toHexString());
        }
        user.dualCoreBalance = user.dualCoreBalance.minus(event.params.value)
        user.save()
        if (user.coretoshiBalance == 0) {
            vault.normalTotalStake = vault.normalTotalStake.minus(event.params.value);
        } else {
            vault.coretoshiTotalStake = vault.coretoshiTotalStake.minus(event.params.value);
        }
        vault.totalStaked = vault.totalStaked.minus(event.params.value)

    }
    if (event.params.to.toHexString() != ADDRESS_ZERO) {
        let user = User.load(event.params.to.toHexString());

        if (user === null) {
            user = createUser(event.params.to.toHexString());
        }
        user.dualCoreBalance = user.dualCoreBalance.plus(event.params.value)
        user.save()
        if (user.coretoshiBalance == 0) {
            vault.normalTotalStake = vault.normalTotalStake.plus(event.params.value);
        } else {
            vault.coretoshiTotalStake = vault.coretoshiTotalStake.plus(event.params.value);
        }
        vault.totalStaked = vault.totalStaked.plus(event.params.value)
    }
    vault.save()
}
