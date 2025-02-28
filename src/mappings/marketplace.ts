
import {ClaimProxy, CreateRewardReceiver, StakeCoreProxy} from '../types/Marketplace/Marketplace'
import {Order, OrderAction, StakedInOrder, Stats, User} from '../types/schema'
import {ORDER_ACTION, ZERO_BI, createUser, getId, handleOrderAction} from "./helpers";
import { B14G_ID, } from './helpers';


export function handleNewOrder(event: CreateRewardReceiver): void {

    let orderAction = new OrderAction(getId(event))
    orderAction.blockNumber = event.block.number;
    orderAction.timestamp = event.block.timestamp;
    orderAction.txHash = event.transaction.hash;
    orderAction.type = "CreateOrder"
    orderAction.from = event.params.from;
    orderAction.order = event.params.rewardReceiver;

    let stats = Stats.load(B14G_ID);
    if (!stats) {
      stats = new Stats(B14G_ID);
      stats.totalStaker = 0;
      stats.totalCoreStaked = ZERO_BI;
      stats.totalDualCore = ZERO_BI
      stats.save()
    //   stats.totalEarned = ZERO_BI
    //   stats.listOrder = []
    }
    orderAction.totalCoreStaked = stats.totalCoreStaked
    orderAction.save()

    let user = User.load(event.params.from);
    if (user === null) {
        user = createUser(event.params.from);
    }
    user.save()

    let order = new Order(event.params.rewardReceiver) as Order
    order.owner = event.params.from;
    order.createdAtTimestamp = event.block.timestamp;
    order.createdAtBlockNumber = event.block.number;
    order.totalActions = 1
    // order.stakedAmount = ZERO_BI
    order.save()
    // stats.listOrder = stats.listOrder.concat([order.id])

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

    orderAction.totalCoreStaked = handleOrderAction(event.params.value, event.params.receiver, event.params.from, ORDER_ACTION.STAKE)
    orderAction.save()

    let order = Order.load(event.params.receiver)
    if (order === null) {
        return;
    }
    // order.stakedAmount = order.stakedAmount.plus(event.params.value)
    order.save()

    let user = User.load(event.params.from);
    if (user === null) {
        user = createUser(event.params.from);
    }
    user.coreStakedInOrder = user.coreStakedInOrder.plus(event.params.value)
    let stakedInOrder = StakedInOrder.load(order.id.concat(user.id))
    if (stakedInOrder === null) {
        stakedInOrder = new StakedInOrder(order.id.concat(user.id))
        stakedInOrder.amount = event.params.value;
        stakedInOrder.user = event.params.from
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

    orderAction.totalCoreStaked = handleOrderAction(event.params.value, event.params.receiver, event.params.from, ORDER_ACTION.WITHDRAW)
    orderAction.save()

    let order = Order.load(event.params.receiver)
    if (order === null) {
        return;
    }
    // order.stakedAmount = order.stakedAmount.minus(event.params.value)
    order.save()

    let user = User.load(event.params.from);
    if (user === null) {
        return;
    }
    user.coreStakedInOrder = user.coreStakedInOrder.minus(event.params.value)
    let stakedInOrder = StakedInOrder.load(order.id.concat(user.id))
    if (stakedInOrder === null) {
        return;
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

    orderAction.totalCoreStaked = handleOrderAction(ZERO_BI, event.params.receiver, event.params.from, ORDER_ACTION.CLAIM)
    orderAction.save()

    let order = Order.load(event.params.receiver)
    if (order === null) {
        return;
    }
    order.save()
}
