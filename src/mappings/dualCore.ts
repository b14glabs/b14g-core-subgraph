import {Transfer as TransferEvent} from '../types/DualCoreToken/ERC20'
import {log, BigInt} from '@graphprotocol/graph-ts'
import {DualCoreTransfer, VaultStats, Transaction, User} from '../types/schema'
import {ADDRESS_ZERO, createTransaction, createUser, DUAL_CORE_VAULT, ZERO_BI} from "./helpers";


export function handleTransfer(event: TransferEvent): void {
    let transfer = new DualCoreTransfer(event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString()));
    transfer.transaction = event.transaction.hash.toHexString();
    transfer.timestamp = event.block.timestamp
    transfer.amount = event.params.value;
    transfer.from = event.params.from;
    transfer.to = event.params.to;
    transfer.save()

    let vaultStats = VaultStats.load(DUAL_CORE_VAULT)
    if (vaultStats === null) {
        vaultStats = new VaultStats(DUAL_CORE_VAULT);
        vaultStats.coretoshiTotalStake = ZERO_BI;
        vaultStats.normalTotalStake = ZERO_BI;
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
            vaultStats.normalTotalStake = vaultStats.normalTotalStake.minus(event.params.value);
        } else {
            vaultStats.coretoshiTotalStake = vaultStats.coretoshiTotalStake.minus(event.params.value);
        }

    }
    if (event.params.to.toHexString() != ADDRESS_ZERO) {
        let user = User.load(event.params.to.toHexString());

        if (user === null) {
            user = createUser(event.params.to.toHexString());
        }
        user.dualCoreBalance = user.dualCoreBalance.plus(event.params.value)
        user.save()
        if (user.coretoshiBalance == 0) {
            vaultStats.normalTotalStake = vaultStats.normalTotalStake.plus(event.params.value);
        } else {
            vaultStats.coretoshiTotalStake = vaultStats.coretoshiTotalStake.plus(event.params.value);
        }
    }
    vaultStats.save()
}
