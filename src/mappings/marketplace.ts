import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  ClaimProxy,
  CreateRewardReceiver,
  StakeCoreProxy,
  Marketplace,
} from "../types/Marketplace/Marketplace";
import {
  Order,
  OrderAction,
  OrderActionCount,
  StakedInOrder,
  Stats,
  User,
} from "../types/schema";
import {
  createUser,
  getId,
  ZERO_BI,
  B14G_ID,
  MARKETPLACE,
  ORDER_ACTION,
  handleOrderAction,
  ADDRESS_ZERO,
} from "./helpers";

let marketplace = Marketplace.bind(Address.fromString(MARKETPLACE));

export function handleNewOrder(event: CreateRewardReceiver): void {
  let orderAction = new OrderAction(getId(event));
  orderAction.blockNumber = event.block.number;
  orderAction.timestamp = event.block.timestamp;
  orderAction.txHash = event.transaction.hash;
  orderAction.type = "CreateOrder";
  orderAction.from = event.params.from;
  orderAction.order = event.params.rewardReceiver;

  let stats = Stats.load(B14G_ID);
  if (!stats) {
    stats = new Stats(B14G_ID);
    stats.totalStaker = 0;
    stats.totalCoreStaked = ZERO_BI;
    stats.totalDualCore = ZERO_BI;
    stats.totalEarned = ZERO_BI;
    stats.save();
    //   stats.totalEarned = ZERO_BI
    //   stats.listOrder = []
  }
  orderAction.totalCoreStaked = stats.totalCoreStaked;
  orderAction.save();

  let user = User.load(event.params.from);
  if (user === null) {
    user = createUser(event.params.from);
  }

  let order = new Order(event.params.rewardReceiver) as Order;
  order.owner = event.params.from;
  order.createdAtTimestamp = event.block.timestamp;
  order.createdAtBlockNumber = event.block.number;
  order.coreEarned = ZERO_BI;
  order.btcEarned = ZERO_BI;
  order.fee = marketplace.fee();
  order.rewardSharingPortion = event.params.portion;
  order.realtimeStakeAmount = ZERO_BI;
  order.realtimeTier = ZERO_BI;
  order.bitcoinLockTx = Bytes.fromHexString(ADDRESS_ZERO);

  order.totalStakeActions = 0;
  order.totalWithdrawActions = 0;
  order.totalClaimCoreActions = 0;
  order.totalClaimBtcActions = 0;
  // order.stakedAmount = new BigInt(0)
  order.totalActions = 1;
  order.save();
  // stats.listOrder = stats.listOrder.concat([order.id])
}

export function handleUserStake(event: StakeCoreProxy): void {
  let orderAction = new OrderAction(getId(event));
  orderAction.blockNumber = event.block.number;
  orderAction.timestamp = event.block.timestamp;
  orderAction.txHash = event.transaction.hash;
  orderAction.type = "StakeCoreToOrder";
  orderAction.from = event.params.from;
  orderAction.order = event.params.receiver;
  orderAction.amount = event.params.value;

  orderAction.totalCoreStaked = handleOrderAction(
    event.params.value,
    event.params.receiver,
    event.params.from,
    ORDER_ACTION.STAKE
  );
  orderAction.save();

  let user = User.load(event.params.from);
  if (user === null) {
    user = createUser(event.params.from);
  }
  let orderActionCount = OrderActionCount.load(
    event.params.receiver.concat(user.id)
  );
  if (!orderActionCount) {
                           orderActionCount = new OrderActionCount(
                             event.params.receiver.concat(user.id)
                           );
                           orderActionCount.total = 0;
                           orderActionCount.stake = 0;
                           orderActionCount.withdraw = 0;
                           orderActionCount.claimBtc = 0;
                           orderActionCount.claimCore = 0;

                           orderActionCount.user = user.id;
                           orderActionCount.order = event.params.receiver;
                         }
  user.coreStakedInOrder = user.coreStakedInOrder.plus(event.params.value);
  orderActionCount.stake += 1;
  orderActionCount.total += 1;
  orderActionCount.save();
  let stakedInOrder = StakedInOrder.load(event.params.receiver.concat(user.id));
  if (stakedInOrder === null) {
    stakedInOrder = new StakedInOrder(event.params.receiver.concat(user.id));
    stakedInOrder.amount = event.params.value;
    stakedInOrder.user = event.params.from;
    stakedInOrder.order = event.params.receiver;
  } else {
    stakedInOrder.amount = stakedInOrder.amount.plus(event.params.value);
  }
  stakedInOrder.save();
  user.save();
}

export function handleUserWithdraw(event: StakeCoreProxy): void {
  let orderAction = new OrderAction(getId(event));
  orderAction.blockNumber = event.block.number;
  orderAction.timestamp = event.block.timestamp;
  orderAction.txHash = event.transaction.hash;
  orderAction.type = "WithdrawCoreFromOrder";
  orderAction.from = event.params.from;
  orderAction.order = event.params.receiver;
  orderAction.amount = event.params.value;

  orderAction.totalCoreStaked = handleOrderAction(
    event.params.value,
    event.params.receiver,
    event.params.from,
    ORDER_ACTION.WITHDRAW
  );
  orderAction.save();

  let user = User.load(event.params.from);
  if (user === null) {
    return;
  }
  let orderActionCount = OrderActionCount.load(
    event.params.receiver.concat(user.id)
  );
  if (!orderActionCount) {
    return;
  }
  user.coreStakedInOrder = user.coreStakedInOrder.minus(event.params.value);
  orderActionCount.withdraw += 1;
  orderActionCount.total += 1;
  orderActionCount.save();
  let stakedInOrder = StakedInOrder.load(event.params.receiver.concat(user.id));
  if (stakedInOrder === null) {
    return;
  }
  stakedInOrder.amount = stakedInOrder.amount.minus(event.params.value);
  stakedInOrder.save();
  user.save();
}

export function handleClaimProxy(event: ClaimProxy): void {
  if (event.params.amount == ZERO_BI) {
    return;
  }
  let orderAction = new OrderAction(getId(event));
  orderAction.blockNumber = event.block.number;
  orderAction.timestamp = event.block.timestamp;
  orderAction.txHash = event.transaction.hash;
  orderAction.type = event.params.isBtcClaim
    ? "ClaimCoreForBTCHolder"
    : "ClaimCoreForCoreHolder";

  orderAction.from = event.params.from;
  orderAction.order = event.params.receiver;
  orderAction.amount = event.params.amount;

  let stats = Stats.load("b14g");
  if (!stats) {
    stats = new Stats("b14g");
    stats.totalStaker = 0;
    stats.totalCoreStaked = new BigInt(0);
    stats.totalEarned = ZERO_BI;
    // stats.listOrder = []
  }
  stats.totalEarned = stats.totalEarned.plus(event.params.amount);
  stats.save();
  orderAction.totalCoreStaked = handleOrderAction(
    ZERO_BI,
    event.params.receiver,
    event.params.from,
    event.params.isBtcClaim ? ORDER_ACTION.CLAIM_BTC : ORDER_ACTION.CLAIM_CORE
  );
  orderAction.save();

  let order = Order.load(event.params.receiver);
  if (order === null) {
    return;
  }

  let orderActionCount = OrderActionCount.load(
    event.params.receiver.concat(event.params.from)
  );
  if (!orderActionCount) {
    return;
  }

  if (event.params.isBtcClaim) {
    order.btcEarned = order.btcEarned.plus(event.params.amount);
    orderActionCount.claimBtc += 1;
    orderActionCount.total += 1;
  } else {
    order.coreEarned = order.coreEarned.plus(event.params.amount);
    orderActionCount.claimCore += 1;
    orderActionCount.total += 1;
  }
  orderActionCount.save();
  order.save();
}
