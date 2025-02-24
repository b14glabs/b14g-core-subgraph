import {Address} from '@graphprotocol/graph-ts'
import {Order} from '../types/schema'
import {BitcoinStake, delegated} from "../types/BitcoinStake/BitcoinStake";

let bitcoinStake = BitcoinStake.bind(Address.fromString("0x0000000000000000000000000000000000001014"))

export function handleBTCStaked(event: delegated): void {
    let order = Order.load(event.params.delegator.toHexString());
    if (order === null) return;
    order.btcAmount = event.params.amount;
    order.unlockTime = bitcoinStake.btcTxMap(event.params.txid).getLockTime().toU32()
    order.validator = event.params.candidate
    order.save()
}
