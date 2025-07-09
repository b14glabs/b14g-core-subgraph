import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  ClaimReward,
  ClaimRewards,
  Deposit,
  EndRound,
  FullfillRandomness,
  RequestRandomness,
  Start,
  Withdraw,
} from "../types/Lottery/Lottery";
import {
  Lottery,
  LotteryRound,
  Order,
  User,
  YieldBTC,
  UserActionCount,
  VaultAction,
} from "../types/schema";
import {
  LOTTERY,
  ZERO_BI,
  createLottery,
  createUserActionCount,
  createLotteryRound,
  createUser,
  createTransaction,
  getId,
} from "./helpers";

export function handleDeposit(event: Deposit): void {
  let lottery = Lottery.load(Bytes.fromHexString(LOTTERY.toLowerCase()));
  if (!lottery) {
    lottery = createLottery();
  }
  let user = User.load(event.params.user);
  if (!user) {
    return;
  }
  const yieldBtc = YieldBTC.load(event.params.rewardReceiver);
  if (!yieldBtc) {
    return;
  }
  const order = Order.load(event.params.rewardReceiver);
  if (!order) {
    return;
  }

  if (user.totalYeildDeposited == ZERO_BI) {
    lottery.totalParticipants = lottery.totalParticipants.plus(
      BigInt.fromI32(1)
    );
  }

  lottery.totalYields = lottery.totalYields.plus(BigInt.fromI32(1));

  user.totalYeildDeposited = user.totalYeildDeposited.plus(BigInt.fromI32(1));

  let userActionCount = UserActionCount.load(event.params.user);
  if (!userActionCount) {
    userActionCount = createUserActionCount(event.params.user);
  }

  let lotteryAction = VaultAction.load(event.transaction.hash);
  if (!lotteryAction) {
    lotteryAction = new VaultAction(event.transaction.hash);
    createTransaction(
      getId(event),
      event.block.number,
      event.block.timestamp,
      event.params.user
    );
    lotteryAction.transaction = getId(event);
    lotteryAction.txHash = event.transaction.hash;
    lotteryAction.from = event.params.user;
    lotteryAction.type = "Stake";
    lotteryAction.timestamp = event.block.timestamp;
    lotteryAction.amount = ZERO_BI;
    lotteryAction.btcAmount = ZERO_BI;
    lotteryAction.receiverAmount = 0;
    lotteryAction.round = lottery.currentRound;
    lotteryAction.toLottery = lottery.id;
    lottery.total += 1;
    lottery.stake += 1;

    userActionCount.stake += 1;
    userActionCount.total += 1;
    userActionCount.save();
  }
  lotteryAction.btcAmount = lotteryAction.btcAmount!.plus(order.btcAmount);
  lotteryAction.receiverAmount += 1;
  lotteryAction.save();

  yieldBtc.isDeposited = true;
  yieldBtc.save();
  user.save();
  lottery.save();
}

export function handleWithdraw(event: Withdraw): void {
  let lottery = Lottery.load(Bytes.fromHexString(LOTTERY.toLowerCase()));
  if (!lottery) {
    return;
  }
  let user = User.load(event.params.user);
  if (!user) {
    return;
  }
  const order = Order.load(event.params.rewardReceiver);
  if (!order) {
    return;
  }
  const yieldBtc = YieldBTC.load(event.params.rewardReceiver);
  if (!yieldBtc) {
    return;
  }

  user.totalYeildDeposited = user.totalYeildDeposited.minus(BigInt.fromI32(1));
  if (user.totalYeildDeposited == ZERO_BI) {
                                             lottery.totalParticipants = lottery.totalParticipants.minus(
                                               BigInt.fromI32(1)
                                             );
                                           }
  lottery.totalYields = lottery.totalYields.minus(BigInt.fromI32(1));

  let userActionCount = UserActionCount.load(event.params.user);
  if (!userActionCount) {
    return;
  }

  let lotteryAction = VaultAction.load(event.transaction.hash);
  if (!lotteryAction) {
    lotteryAction = new VaultAction(event.transaction.hash);
    createTransaction(
      getId(event),
      event.block.number,
      event.block.timestamp,
      event.params.user
    );
    lotteryAction.transaction = getId(event);
    lotteryAction.txHash = event.transaction.hash;
    lotteryAction.from = event.params.user;
    lotteryAction.type = "Withdraw";
    lotteryAction.timestamp = event.block.timestamp;
    lotteryAction.amount = ZERO_BI;
    lotteryAction.btcAmount = ZERO_BI;
    lotteryAction.receiverAmount = 0;
    lotteryAction.round = lottery.currentRound;
    lotteryAction.toLottery = lottery.id;

    lottery.total += 1;
    lottery.withdraw += 1;

    userActionCount.withdraw += 1;
    userActionCount.total += 1;
    userActionCount.save();
  }
  lotteryAction.receiverAmount += 1;
  lotteryAction.btcAmount = lotteryAction.btcAmount!.plus(order.btcAmount);
  lotteryAction.save();

  yieldBtc.isDeposited = false;
  yieldBtc.save();
  user.save();
  lottery.save();
}

export function handleWinnerClaim(event: ClaimReward): void {
  let lottery = Lottery.load(Bytes.fromHexString(LOTTERY.toLowerCase()));
  if (!lottery) {
    return;
  }

  let userActionCount = UserActionCount.load(event.params.user);
  if (!userActionCount) {
    return;
  }

  let lotteryAction = new VaultAction(event.transaction.hash);
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.params.user
  );
  lotteryAction.transaction = getId(event);
  lotteryAction.txHash = event.transaction.hash;
  lotteryAction.from = event.params.user;
  lotteryAction.type = "ClaimReward";
  lotteryAction.timestamp = event.block.timestamp;
  lotteryAction.amount = event.params.amount;
  lotteryAction.round = lottery.currentRound;
  lotteryAction.toLottery = lottery.id;
  lotteryAction.btcAmount = ZERO_BI;
  lotteryAction.receiverAmount = 0;
  lotteryAction.save();

  lottery.total += 1;
  lottery.claim += 1;
  lottery.save();

  userActionCount.claim += 1;
  userActionCount.total += 1;
  userActionCount.save();
}

export function handleStartRound(event: Start): void {
  let lottery = Lottery.load(Bytes.fromHexString(LOTTERY.toLowerCase()));
  if (!lottery) {
    return;
  }

  let user = User.load(event.transaction.from);
  if (!user) {
    user = createUser(event.transaction.from, event.block.timestamp);
  }

  const lotteryAction = new VaultAction(event.transaction.hash);
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.transaction.from
  );
  lotteryAction.transaction = getId(event);
  lotteryAction.txHash = event.transaction.hash;
  lotteryAction.from = event.transaction.from;
  lotteryAction.type = "StartRound";
  lotteryAction.timestamp = event.block.timestamp;
  lotteryAction.amount = ZERO_BI;
  lotteryAction.round = lottery.currentRound;
  lotteryAction.toLottery = lottery.id;
  lotteryAction.btcAmount = ZERO_BI;
  lotteryAction.receiverAmount = 0;
  lotteryAction.save();

  const lotteryRound = createLotteryRound(
    event.params.startTimestamp,
    event.params.round
  );
  lotteryRound.timestamp = event.block.timestamp;
  lotteryRound.save();
  if (lottery.currentRound < event.params.round) {
    lottery.currentRound = lottery.currentRound.plus(BigInt.fromI32(1));
  }
  lottery.startRound += 1;
  lottery.save();
}

export function handleEndRound(event: EndRound): void {
                                                        let lottery = Lottery.load(
                                                          Bytes.fromHexString(
                                                            LOTTERY.toLowerCase()
                                                          )
                                                        );
                                                        if (!lottery) {
                                                          return;
                                                        }

                                                        let user = User.load(
                                                          event.transaction.from
                                                        );
                                                        if (!user) {
                                                          user = createUser(
                                                            event.transaction
                                                              .from,
                                                            event.block
                                                              .timestamp
                                                          );
                                                        }

                                                        const lotteryAction = new VaultAction(
                                                          event.transaction.hash
                                                        );
                                                        createTransaction(
                                                          getId(event),
                                                          event.block.number,
                                                          event.block.timestamp,
                                                          event.transaction.from
                                                        );
                                                        lotteryAction.transaction = getId(
                                                          event
                                                        );
                                                        lotteryAction.txHash =
                                                          event.transaction.hash;
                                                        lotteryAction.from =
                                                          event.transaction.from;
                                                        lotteryAction.type =
                                                          "EndRound";
                                                        lotteryAction.timestamp =
                                                          event.block.timestamp;
                                                        lotteryAction.amount = ZERO_BI;
                                                        lotteryAction.round =
                                                          lottery.currentRound;
                                                        lotteryAction.toLottery =
                                                          lottery.id;
                                                        lotteryAction.btcAmount = ZERO_BI;
                                                        lotteryAction.receiverAmount = 0;
                                                        lotteryAction.save();

                                                        lottery.total += 1;
                                                        lottery.endRound += 1;
                                                        lottery.save();

                                                        const round =
                                                          lottery.currentRound;
                                                        const lotteryRound = LotteryRound.load(
                                                          round.toString()
                                                        );
                                                        if (!lotteryRound) {
                                                          return;
                                                        }
                                                        lotteryRound.endTime =
                                                          event.block.timestamp;
                                                        for (
                                                          let index = 0;
                                                          index <
                                                          event.params.winners
                                                            .length;
                                                          index++
                                                        ) {
                                                          lotteryRound.winners = lotteryRound.winners.concat(
                                                            [
                                                              event.params
                                                                .winners[index],
                                                            ]
                                                          );
                                                        }

                                                        lotteryRound.totalParticipants =
                                                          lottery.totalParticipants;
                                                        lotteryRound.totalYields =
                                                          lottery.totalYields;
                                                        lotteryRound.rewardAmount =
                                                          event.params.reward;
                                                        lotteryRound.feeAmount =
                                                          event.params.feeAmount;
                                                        lotteryRound.endRoundTx =
                                                          event.transaction.hash;

                                                        lottery.totalReward = lottery.totalReward.plus(
                                                          event.params.reward
                                                        );
                                                        lottery.totalFee = lottery.totalFee.plus(
                                                          event.params.feeAmount
                                                        );
                                                        lottery.save();
                                                        lotteryRound.save();
                                                      }

export function handleClaimRewards(event: ClaimRewards): void {
  let lottery = Lottery.load(Bytes.fromHexString(LOTTERY.toLowerCase()));
  if (!lottery) {
    return;
  }
  const lotteryRound = LotteryRound.load(lottery.currentRound.toString());
  if (!lotteryRound) {
    return;
  }
  for (let index = 0; index < event.params.amounts.length; index++) {
    lotteryRound.rewardAmount = lotteryRound.rewardAmount.plus(
      event.params.amounts[index]
    );
  }
  lotteryRound.save();
}

export function handleRequestRandomness(event: RequestRandomness): void {
  let lottery = Lottery.load(Bytes.fromHexString(LOTTERY.toLowerCase()));
  if (!lottery) {
    return;
  }

  let user = User.load(event.transaction.from);
  if (!user) {
    user = createUser(event.transaction.from, event.block.timestamp);
  }

  const round = lottery.currentRound;
  const lotteryRound = LotteryRound.load(round.toString());
  if (!lotteryRound) {
    return;
  }
  lotteryRound.randomnessId = event.params.randomnessId;
  lotteryRound.save();

  const lotteryAction = new VaultAction(event.transaction.hash);
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.transaction.from
  );
  lotteryAction.transaction = getId(event);
  lotteryAction.txHash = event.transaction.hash;
  lotteryAction.from = event.transaction.from;
  lotteryAction.type = "RequestRandomness";
  lotteryAction.timestamp = event.block.timestamp;
  lotteryAction.amount = ZERO_BI;
  lotteryAction.round = lottery.currentRound;
  lotteryAction.toLottery = lottery.id;
  lotteryAction.btcAmount = ZERO_BI;
  lotteryAction.receiverAmount = 0;
  lotteryAction.save();

  lottery.total += 1;
  lottery.requestRandomness += 1;
  lottery.save();
}

export function handleFullFillRandomness(event: FullfillRandomness): void {
  let lottery = Lottery.load(Bytes.fromHexString(LOTTERY.toLowerCase()));
  if (!lottery) {
    return;
  }

  let user = User.load(event.transaction.from);
  if (!user) {
    user = createUser(event.transaction.from, event.block.timestamp);
  }

  const lotteryAction = new VaultAction(event.transaction.hash);
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.transaction.from
  );
  lotteryAction.transaction = getId(event);
  lotteryAction.txHash = event.transaction.hash;
  lotteryAction.from = event.transaction.from;
  lotteryAction.type = "FullfillRandomness";
  lotteryAction.timestamp = event.block.timestamp;
  lotteryAction.amount = ZERO_BI;
  lotteryAction.round = lottery.currentRound;
  lotteryAction.toLottery = lottery.id;
  lotteryAction.btcAmount = ZERO_BI;
  lotteryAction.receiverAmount = 0;
  lotteryAction.save();

  lottery.total += 1;
  lottery.fullfillRandomness += 1;
  lottery.save();
}
