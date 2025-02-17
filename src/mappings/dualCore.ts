import {Transfer as TransferEvent} from '../types/DualCoreToken/ERC20'
import {DualCoreTransfer, Vault, User} from '../types/schema'
import {ADDRESS_ZERO, createUser, createVault, DUAL_CORE_VAULT} from "./helpers";


export function handleTransfer(event: TransferEvent): void {
    let transfer = new DualCoreTransfer(event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString()));
    transfer.transaction = event.transaction.hash;
    transfer.timestamp = event.block.timestamp
    transfer.amount = event.params.value;
    transfer.from = event.params.from;
    transfer.to = event.params.to;
    transfer.save()

    let vault = Vault.load(DUAL_CORE_VAULT)
    if (vault === null) {
        vault = createVault(DUAL_CORE_VAULT);
    }

    if (event.params.from.toHexString() != ADDRESS_ZERO) {
        let user = User.load(event.params.from.toHexString());
        if (user === null) {
            user = createUser(event.params.from.toHexString());
        }
        user.dualCoreBalance = user.dualCoreBalance.minus(event.params.value)
        user.save()
        vault.totalStaked = vault.totalStaked.minus(event.params.value)

    }
    if (event.params.to.toHexString() != ADDRESS_ZERO) {
        let user = User.load(event.params.to.toHexString());

        if (user === null) {
            user = createUser(event.params.to.toHexString());
        }
        user.dualCoreBalance = user.dualCoreBalance.plus(event.params.value)
        user.save()
        vault.totalStaked = vault.totalStaked.plus(event.params.value)
    }
    vault.save()
}
