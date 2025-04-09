/* eslint-disable prefer-const */
import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  Lottery,
  LotteryActionCount,
  LotteryRound,
  Order,
  Stats,
  User,
  Vault,
  VaultActionCount,
} from "../types/schema";

export enum ORDER_ACTION {
  STAKE,
  WITHDRAW,
  CLAIM_BTC,
  CLAIM_CORE,
}

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
export let ZERO_BI = BigInt.fromI32(0);
export const DUAL_CORE_VAULT = "0xee21ab613d30330823D35Cf91A84cE964808B83F";
export const MARKETPLACE_STRATEGY_ADDRESS =
  "0xcd6D74b6852FbeEb1187ec0E231aB91E700eC3BA";
export const B14G_ID = "b14g";
export const MARKETPLACE = "0x04EA61C431F7934d51fEd2aCb2c5F942213f8967";
export const LOTTERY = "0x606499355875Aafe39cF0910962f2BE4b16D5566";
export const YIELD_BTC = "0xaC12840F51495F119290646824E503292607f679";

export function createUser(id: Bytes): User {
  let user = new User(id);
  user.dualCoreBalance = ZERO_BI;
  user.coreStakedInOrder = ZERO_BI;
  user.totalValidOrder = 0;
  user.totalYeildDeposited = ZERO_BI;

  user.save();

  let vaultActionCount = VaultActionCount.load(id);
  if (!vaultActionCount) {
    vaultActionCount = new VaultActionCount(user.id);
    vaultActionCount.user = user.id;

    vaultActionCount.total = 0;
    vaultActionCount.stake = 0;
    vaultActionCount.unbond = 0;
    vaultActionCount.withdrawdirect = 0;
    vaultActionCount.withdraw = 0;
    vaultActionCount.save();
  }

  let lotteryActionCount = LotteryActionCount.load(id);
  if (!lotteryActionCount) {
    lotteryActionCount = new LotteryActionCount(id);
    lotteryActionCount.user = user.id;
    lotteryActionCount.total = 0;
    lotteryActionCount.stake = 0;
    lotteryActionCount.withdraw = 0;
    lotteryActionCount.claim = 0;

    lotteryActionCount.save();
  }

  let stats = Stats.load(B14G_ID);
  if (!stats) {
    stats = new Stats(B14G_ID);
    stats.totalStaker = 0;
    stats.totalCoreStaked = ZERO_BI;
    stats.totalDualCore = ZERO_BI;
    stats.totalEarned = ZERO_BI;
    //   stats.listOrder = []
  }
  stats.totalStaker += 1;
  stats.save();
  return user;
}

export function createVault(id: string): Vault {
  let vault = new Vault(Bytes.fromHexString(id));
  vault.totalStaked = ZERO_BI;
  vault.totalActions = 0;
  vault.totalDepositActions = 0;
  vault.totalInstantRedeemActions = 0;
  vault.totalUnbondActions = 0;
  vault.totalWithdrawActions = 0;
  vault.totalReInvestActions = 0;
  vault.save();
  return vault;
}

export function createLotteryActionCount(id: Bytes): LotteryActionCount {
  let lotteryActionCount = new LotteryActionCount(id);
  lotteryActionCount.user = id;
  lotteryActionCount.total = 0;
  lotteryActionCount.stake = 0;
  lotteryActionCount.withdraw = 0;
  lotteryActionCount.claim = 0;
  lotteryActionCount.save();
  return lotteryActionCount;
}

export function createLottery(): Lottery {
  let lottery = new Lottery(Bytes.fromHexString(LOTTERY.toLowerCase()));
  lottery.currentRound = ZERO_BI;
  lottery.totalActions = 0;
  lottery.totalDeposit = 0;
  lottery.totalWithdraw = 0;
  lottery.totalWinnerClaim = 0;
  lottery.totalParticipants = ZERO_BI;
  lottery.totalBtcStaked = ZERO_BI;
  lottery.totalYields = ZERO_BI;
  lottery.totalReward = ZERO_BI;
  lottery.totalFee = ZERO_BI;
  lottery.save();
  return lottery;
}

export function createLotteryRound(
  startTime: BigInt,
  round: BigInt
): LotteryRound {
  let lotteryRound = new LotteryRound(round.toString());

  lotteryRound.lottery = Bytes.fromHexString(LOTTERY.toLowerCase());
  lotteryRound.startTime = startTime;
  lotteryRound.endTime = ZERO_BI;
  lotteryRound.round = round;
  lotteryRound.winners = [];
  lotteryRound.rewardAmount = ZERO_BI;
  lotteryRound.feeAmount = ZERO_BI;
  lotteryRound.totalParticipants = ZERO_BI;
  lotteryRound.totalYields = ZERO_BI;
  lotteryRound.totalBtcStaked = ZERO_BI;
  lotteryRound.timestamp = ZERO_BI;
  lotteryRound.endRoundTx = Bytes.fromHexString(ADDRESS_ZERO);
  lotteryRound.save();
  return lotteryRound;
}

export function getId(event: ethereum.Event): Bytes {
  return event.transaction.hash.concatI32(event.logIndex.toI32());
}

export function handleVaultAction(
  coreAmount: BigInt,
  dualCoreAmount: BigInt,
  isStake: boolean,
  isNormalRedeem: boolean
): BigInt {
  let stats = Stats.load(B14G_ID);
  let vault = Vault.load(Bytes.fromHexString(DUAL_CORE_VAULT.toLowerCase()));
  if (!stats) {
    return ZERO_BI;
  }
  if (!vault) {
    vault = createVault(DUAL_CORE_VAULT.toLowerCase());
  }
  if (isStake) {
    stats.totalCoreStaked = stats.totalCoreStaked.plus(coreAmount);
    stats.totalDualCore = stats.totalDualCore.plus(dualCoreAmount);

    vault.totalDepositActions += 1;
  } else {
    stats.totalCoreStaked = stats.totalCoreStaked.minus(coreAmount);
    stats.totalDualCore = stats.totalDualCore.minus(dualCoreAmount);

    if (isNormalRedeem) {
      vault.totalUnbondActions += 1;
    } else {
      vault.totalInstantRedeemActions += 1;
    }
  }
  vault.totalActions += 1;

  vault.save();
  stats.save();
  return stats.totalCoreStaked;
}

export function handleOrderAction(
  coreAmount: BigInt,
  orderId: Bytes,
  user: Bytes,
  type: ORDER_ACTION
): BigInt {
  let stats = Stats.load(B14G_ID);
  let order = Order.load(orderId);
  if (!stats || !order) {
    return ZERO_BI;
  }

  if (type == ORDER_ACTION.CLAIM_BTC || type == ORDER_ACTION.CLAIM_CORE) {
    order.totalActions += 1;
    if (type == ORDER_ACTION.CLAIM_BTC) {
      order.totalClaimBtcActions += 1;
    } else {
      order.totalClaimCoreActions += 1;
    }
    order.save();
    return stats.totalCoreStaked;
  } else {
    if (type == ORDER_ACTION.STAKE) {
      if (
        user.toHexString().toLowerCase() !=
        MARKETPLACE_STRATEGY_ADDRESS.toLowerCase()
      ) {
        stats.totalCoreStaked = stats.totalCoreStaked.plus(coreAmount);
      }
      order.totalStakeActions += 1;
      order.realtimeStakeAmount = order.realtimeStakeAmount.plus(coreAmount);
      order.realtimeTier = order.realtimeStakeAmount.div(
        order.btcAmount as BigInt
      );
    } else {
      if (
        user.toHexString().toLowerCase() !=
        MARKETPLACE_STRATEGY_ADDRESS.toLowerCase()
      ) {
        stats.totalCoreStaked = stats.totalCoreStaked.minus(coreAmount);
      }
      order.totalWithdrawActions += 1;
      order.realtimeStakeAmount = order.realtimeStakeAmount.minus(coreAmount);
      order.realtimeTier = order.realtimeStakeAmount.div(
        order.btcAmount as BigInt
      );
    }

    order.totalActions += 1;
    order.save();
    stats.save();

    return stats.totalCoreStaked;
  }
}
