import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  ClaimReward,
  ClaimRewards,
  Deposit,
  EndRound,
  Start,
  Withdraw,
} from "../types/Lottery/Lottery";
import {
  Lottery,
  LotteryAction,
  LotteryActionCount,
  LotteryRound,
  Order,
  User,
  YieldBTC,
} from "../types/schema";
import {
  LOTTERY,
  ZERO_BI,
  createLottery,
  createLotteryActionCount,
  createLotteryRound,
  createUser,
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
  lottery.totalBtcStaked = lottery.totalBtcStaked.plus(order.btcAmount);

  user.totalYeildDeposited = user.totalYeildDeposited.plus(BigInt.fromI32(1));

  let lotteryActionCount = LotteryActionCount.load(event.params.user);
  if (!lotteryActionCount) {
    lotteryActionCount = createLotteryActionCount(event.params.user);
  }

  let lotteryAction = LotteryAction.load(event.transaction.hash);
  if (!lotteryAction) {
    lotteryAction = new LotteryAction(event.transaction.hash);
    lotteryAction.txHash = event.transaction.hash;
    lotteryAction.from = event.params.user;
    lotteryAction.type = "DepositNFTToLottery";
    lotteryAction.timestamp = event.block.timestamp;
    lotteryAction.coreAmount = ZERO_BI;
    lotteryAction.btcAmount = ZERO_BI;
    lotteryAction.receiverAmount = 0;
    lotteryAction.round = lottery.currentRound;
    lotteryAction.to = lottery.id;
    lottery.totalActions += 1;
    lottery.totalDeposit += 1;

    lotteryActionCount.total += 1;
    lotteryActionCount.stake += 1;
    lotteryActionCount.save();
  }
  lotteryAction.btcAmount = lotteryAction.btcAmount.plus(order.btcAmount);
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
  lottery.totalBtcStaked = lottery.totalBtcStaked.minus(order.btcAmount);
  lottery.totalYields = lottery.totalYields.minus(BigInt.fromI32(1));

  let lotteryActionCount = LotteryActionCount.load(event.params.user);
  if (!lotteryActionCount) {
    return;
  }

  let lotteryAction = LotteryAction.load(event.transaction.hash);
  if (!lotteryAction) {
    lotteryAction = new LotteryAction(event.transaction.hash);
    lotteryAction.txHash = event.transaction.hash;
    lotteryAction.from = event.params.user;
    lotteryAction.type = "WithdrawNFTFromLottery";
    lotteryAction.timestamp = event.block.timestamp;
    lotteryAction.coreAmount = ZERO_BI;
    lotteryAction.btcAmount = ZERO_BI;
    lotteryAction.receiverAmount = 0;
    lotteryAction.round = lottery.currentRound;
    lotteryAction.to = lottery.id;

    lottery.totalActions += 1;
    lottery.totalWithdraw += 1;

    lotteryActionCount.total += 1;
    lotteryActionCount.withdraw += 1;
    lotteryActionCount.save();
  }
  lotteryAction.receiverAmount += 1;
  lotteryAction.btcAmount = lotteryAction.btcAmount.plus(order.btcAmount);
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

  let lotteryActionCount = LotteryActionCount.load(event.params.user);
  if (!lotteryActionCount) {
    return;
  }

  const lotteryAction = new LotteryAction(event.transaction.hash);
  lotteryAction.txHash = event.transaction.hash;
  lotteryAction.from = event.params.user;
  lotteryAction.type = "WinnerClaimReward";
  lotteryAction.timestamp = event.block.timestamp;
  lotteryAction.coreAmount = event.params.amount;
  lotteryAction.round = lottery.currentRound;
  lotteryAction.to = lottery.id;
  lotteryAction.btcAmount = ZERO_BI;
  lotteryAction.receiverAmount = 0;
  lotteryAction.save();

  lottery.totalActions += 1;
  lottery.totalWinnerClaim += 1;
  lottery.save();

  lotteryActionCount.total += 1;
  lotteryActionCount.claim += 1;
  lotteryActionCount.save();
}

export function handleStartRound(event: Start): void {
  let lottery = Lottery.load(Bytes.fromHexString(LOTTERY.toLowerCase()));
  if (!lottery) {
    return;
  }
  const lotteryRound = createLotteryRound(
    event.params.startTimestamp,
    event.params.round
  );
  lotteryRound.timestamp = event.block.timestamp;
  lotteryRound.save();
  if (lottery.currentRound < event.params.round) {
    lottery.currentRound = lottery.currentRound.plus(BigInt.fromI32(1));
    lottery.save();
  }
}

export function handleEndRound(event: EndRound): void {
  let lottery = Lottery.load(Bytes.fromHexString(LOTTERY.toLowerCase()));
  if (!lottery) {
    return;
  }
  const round = lottery.currentRound;
  const lotteryRound = LotteryRound.load(round.toString());
  if (!lotteryRound) {
    return;
  }
  lotteryRound.endTime = event.block.timestamp;
  for (let index = 0; index < event.params.winners.length; index++) {
    lotteryRound.winners = lotteryRound.winners.concat([
      event.params.winners[index],
    ]);
  }

  lotteryRound.totalBtcStaked = lottery.totalBtcStaked;
  lotteryRound.totalParticipants = lottery.totalParticipants;
  lotteryRound.totalYields = lottery.totalYields;
  lotteryRound.rewardAmount = event.params.reward;
  lotteryRound.feeAmount = event.params.feeAmount;
  lotteryRound.endRoundTx = event.transaction.hash;

  lottery.totalReward = lottery.totalReward.plus(event.params.reward);
  lottery.totalFee = lottery.totalFee.plus(event.params.feeAmount);
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
