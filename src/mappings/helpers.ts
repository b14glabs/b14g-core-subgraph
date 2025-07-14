/* eslint-disable prefer-const */
import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  Lottery,
  LotteryRound,
  Order,
  Stats,
  User,
  UserActionCount,
  Vault,
  Transaction,
} from "../types/schema";

export enum ORDER_ACTION {
  STAKE,
  WITHDRAW,
  CLAIM_BTC,
  CLAIM_CORE,
}

export enum LENDING_VAULT_ACTION {
  STAKE,
  REDEEM,
  WITHDRAW,
  INVEST,
}

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";
export let ZERO_BI = BigInt.fromI32(0);
export const B14G_ID = "b14g";

export const DUAL_CORE_VAULT = "0xee21ab613d30330823D35Cf91A84cE964808B83F";
export const MARKETPLACE_STRATEGY_ADDRESS =
  "0xcd6D74b6852FbeEb1187ec0E231aB91E700eC3BA";

export const MARKETPLACE = "0x04EA61C431F7934d51fEd2aCb2c5F942213f8967";
export const FAIR_SHARE_ORDER = "0x13E3eC65EFeB0A4583c852F4FaF6b2Fb31Ff04b1";

export const LOTTERY = "0x606499355875Aafe39cF0910962f2BE4b16D5566";
export const YIELD_BTC = "0xaC12840F51495F119290646824E503292607f679";

export const LENDING_VAULT = "0xa3CD4D4A568b76CFF01048E134096D2Ba0171C27";
export const LENDING_VAULT_MKP_STRATEGY =
  "0x3D096431C05F33B829D01d769f60847c603970d8";
export const COLEND_POOL = "0x0CEa9F0F49F30d376390e480ba32f903B43B19C5";
export const CORE_DEBT_TOKEN = "0xAc98BB397b8ba98FffDd0124Cdc50fA08d7C7a00";
export const WBTC = "0x5832f53d147b3d6cd4578b9cbd62425c7ea9d0bd";
export const WCORE = "0x40375c92d9faf44d2f9db9bd9ba41a3317a2404f";
export const PYTH = "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729";

export function createUser(id: Bytes, timestamp: BigInt): User {
  let user = new User(id);
  user.dualCoreBalance = ZERO_BI;
  user.coreStakedInOrder = ZERO_BI;
  user.totalValidOrder = 0;
  user.totalYeildDeposited = ZERO_BI;
  user.createdAt = timestamp;

  user.save();

  let stats = Stats.load(B14G_ID);
  if (!stats) {
    stats = new Stats(B14G_ID);
    stats.totalStaker = 0;
    stats.totalCoreStaked = ZERO_BI;
    stats.totalDualCore = ZERO_BI;
    stats.totalEarned = ZERO_BI;
    stats.vaultMaxCap = ZERO_BI;
    //   stats.listOrder = []
  }
  stats.totalStaker += 1;
  stats.save();
  return user;
}

export function createVault(id: string): Vault {
  let vault = new Vault(Bytes.fromHexString(id));
  vault.totalStaked = ZERO_BI;
  vault.total = 0;
  vault.stake = 0;
  vault.redeemInstantly = 0;
  vault.unbond = 0;
  vault.withdraw = 0;
  vault.reInvest = 0;
  vault.claim = 0;
  vault.claim = 0;
  vault.borrowCore = 0;
  vault.repayCore = 0;

  vault.save();
  return vault;
}

export function createTransaction(
  id: Bytes,
  blockNumber: BigInt,
  timestamp: BigInt,
  from: Bytes,
  to: Bytes,
  toType: string,
  type: string,
  amount: BigInt,
  txHash: Bytes
): Transaction {
  let transaction = new Transaction(id);
  transaction.blockNumber = blockNumber;
  transaction.timestamp = timestamp;
  transaction.from = from;
  transaction.to = to;
  transaction.toType = toType;
  transaction.type = type;
  transaction.amount = amount;
  transaction.txHash = txHash;
  transaction.save();
  return transaction;
}

export function createUserActionCount(id: Bytes, to: Bytes): UserActionCount {
  let userActionCount = new UserActionCount(id.concat(to));
  userActionCount.user = id;
  userActionCount.to = to;
  userActionCount.total = 0;
  userActionCount.stake = 0;
  userActionCount.withdraw = 0;
  userActionCount.claim = 0;
  userActionCount.unbond = 0;
  userActionCount.withdrawDirect = 0;
  userActionCount.save();
  return userActionCount;
}

export function createLottery(): Lottery {
  let lottery = new Lottery(Bytes.fromHexString(LOTTERY.toLowerCase()));
  lottery.currentRound = ZERO_BI;
  lottery.total = 0;
  lottery.stake = 0;
  lottery.withdraw = 0;
  lottery.claim = 0;
  lottery.totalParticipants = ZERO_BI;
  lottery.totalYields = ZERO_BI;
  lottery.totalReward = ZERO_BI;
  lottery.totalFee = ZERO_BI;
  lottery.requestRandomness = 0;
  lottery.fullfillRandomness = 0;
  lottery.endRound = 0;
  lottery.startRound = 0;
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
  lotteryRound.timestamp = ZERO_BI;
  lotteryRound.endRoundTx = Bytes.fromHexString(ADDRESS_ZERO);
  lotteryRound.randomnessId = Bytes.fromHexString(ADDRESS_ZERO);
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

    vault.stake += 1;
  } else {
    stats.totalCoreStaked = stats.totalCoreStaked.minus(coreAmount);
    stats.totalDualCore = stats.totalDualCore.minus(dualCoreAmount);

    if (isNormalRedeem) {
      vault.unbond += 1;
    } else {
      vault.redeemInstantly += 1;
    }
  }
  vault.total += 1;

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
    order.total += 1;
    if (type == ORDER_ACTION.CLAIM_BTC) {
      order.claimBtc += 1;
    } else {
      order.claimCore += 1;
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
      order.stake += 1;
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
      order.withdraw += 1;
      order.realtimeStakeAmount = order.realtimeStakeAmount.minus(coreAmount);
      order.realtimeTier = order.realtimeStakeAmount.div(
        order.btcAmount as BigInt
      );
    }

    order.total += 1;
    order.save();
    stats.save();

    return stats.totalCoreStaked;
  }
}
