import {Address} from '@graphprotocol/graph-ts'
import {ClaimProxy, CreateRewardReceiver, StakeCoreProxy} from '../types/Marketplace/Marketplace'
import {Order, OrderAction, StakedInOrder, User} from '../types/schema'
import {createTransaction, createUser, getId} from "./helpers";


export function handleNewOrder(event: CreateRewardReceiver): void {

    let orderAction = new OrderAction(getId(event))
    orderAction.blockNumber = event.block.number;
    orderAction.timestamp = event.block.timestamp;
    orderAction.txHash = event.transaction.hash;
    orderAction.type = "CreateOrder"
    orderAction.from = event.params.from;
    orderAction.order = event.params.rewardReceiver;
    orderAction.save()

    let user = User.load(event.params.from.toHexString());
    if (user === null) {
        user = createUser(event.params.from.toHexString());
    }
    user.orderActionActivities = user.orderActionActivities.concat([orderAction.id])
    user.save()

    let order = new Order(event.params.rewardReceiver.toHexString()) as Order
    order.owner = event.params.from;
    order.createdAtTimestamp = event.block.timestamp;
    order.createdAtBlockNumber = event.block.number;
    order.activities = [orderAction.id]
    order.save()

}

export function handleUserStake(event: StakeCoreProxy): void {

    let orderAction = new OrderAction(getId(event))
    orderAction.blockNumber = event.block.number;
    orderAction.timestamp = event.block.timestamp;
    orderAction.txHash = event.transaction.hash;
    orderAction.type = "StakeCoreToOrder"
    orderAction.from = event.params.from;
    orderAction.order = event.params.receiver;
    orderAction.amount = event.params.value;
    orderAction.save()

    let order = Order.load(event.params.receiver.toHexString())
    if (order === null) {
        return;
    }
    order.activities = order.activities.concat([orderAction.id])
    order.save()

    let user = User.load(event.params.from.toHexString());
    if (user === null) {
        user = createUser(event.params.from.toHexString());
    }
    user.orderActionActivities = user.orderActionActivities.concat([orderAction.id])
    user.coreStakedInOrder = user.coreStakedInOrder.plus(event.params.value)
    let stakedInOrder = StakedInOrder.load(order.id + '-' + user.id)
    if (stakedInOrder === null) {
        stakedInOrder = new StakedInOrder(order.id + '-' + user.id)
        stakedInOrder.amount = event.params.value;
        user.stakedOrder = user.stakedOrder.concat([stakedInOrder.id])
    } else {
        stakedInOrder.amount = stakedInOrder.amount.plus(event.params.value)
    }
    stakedInOrder.save()
    user.save()

}

export function handleUserWithdraw(event: StakeCoreProxy): void {
    let orderAction = new OrderAction(getId(event))
    orderAction.blockNumber = event.block.number;
    orderAction.timestamp = event.block.timestamp;
    orderAction.txHash = event.transaction.hash;
    orderAction.type = "WithdrawCoreFromOrder"
    orderAction.from = event.params.from;
    orderAction.order = event.params.receiver;
    orderAction.amount = event.params.value;
    orderAction.save()

    let order = Order.load(event.params.receiver.toHexString())
    if (order === null) {
        return;
    }
    order.activities = order.activities.concat([orderAction.id])
    order.save()

    let user = User.load(event.params.from.toHexString());
    if (user === null) {
        return;
    }
    user.orderActionActivities = user.orderActionActivities.concat([orderAction.id])
    user.coreStakedInOrder = user.coreStakedInOrder.minus(event.params.value)
    let stakedInOrder = StakedInOrder.load(order.id + '-' + user.id)
    if (stakedInOrder === null) {
        return;
    }
    if (stakedInOrder.amount == event.params.value) {
        let newStakedOrder:string[] = []
        for (let i = 0; i < user.stakedOrder.length; i++) {
            if (user.stakedOrder[i] != (stakedInOrder as StakedInOrder).id) {
                newStakedOrder.push(user.stakedOrder[i]);
            }
        }
        user.stakedOrder = newStakedOrder
    }
    stakedInOrder.amount = stakedInOrder.amount.minus(event.params.value)
    stakedInOrder.save()
    user.save()
}

export function handleClaimProxy(event: ClaimProxy): void {
    let orderAction = new OrderAction(getId(event))
    orderAction.blockNumber = event.block.number;
    orderAction.timestamp = event.block.timestamp;
    orderAction.txHash = event.transaction.hash;
    orderAction.type = event.params.isBtcClaim ? "ClaimCoreForBTCHolder" : "ClaimCoreForCoreHolder"
    orderAction.from = event.params.from;
    orderAction.order = event.params.receiver;
    orderAction.amount = event.params.amount;
    orderAction.save()

    let order = Order.load(event.params.receiver.toHexString())
    if (order === null) {
        return;
    }
    order.activities = order.activities.concat([orderAction.id])
    order.save()

    let user = User.load(event.params.from.toHexString());
    if (user === null) {
        return;
    }
    user.orderActionActivities = user.orderActionActivities.concat([orderAction.id])
    user.save()
}
