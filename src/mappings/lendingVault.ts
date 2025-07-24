import {
  Address,
  BigDecimal,
  bigInt,
  BigInt,
  Bytes,
  log,
} from "@graphprotocol/graph-ts";
import {
  ClaimRewardFromStrategy,
  CoreInvest,
  LendingInvest,
  LendingVault,
  Redeem,
  Stake,
  Withdraw,
} from "../types/LendingVault/LendingVault";
import { ERC20 } from "../types/LendingVault/ERC20";
import { Pyth } from "../types/LendingVault/Pyth";

import {
  LendingVaultApy,
  Stats,
  User,
  Vault,
  UserActionCount,
  VaultAction,
} from "../types/schema";
import {
  B14G_ID,
  COLEND_POOL,
  CORE_DEBT_TOKEN,
  LENDING_VAULT,
  LENDING_VAULT_MKP_STRATEGY,
  PYTH,
  WBTC,
  WCORE,
  createUser,
  createVault,
  getId,
  createTransaction,
  ZERO_BI,
  DUAL_CORE_VAULT,
  createUserActionCount,
} from "./helpers";
import { MarketplaceStrategy } from "../types/LendingVault/MarketplaceStrategy";
import { ColendPool } from "../types/LendingVault/ColendPool";

const lendingMkpStrategyContract = MarketplaceStrategy.bind(
  Address.fromString(LENDING_VAULT_MKP_STRATEGY)
);

const colendPoolContract = ColendPool.bind(Address.fromString(COLEND_POOL));
const lendingVaultContract = LendingVault.bind(
  Address.fromString(LENDING_VAULT)
);
const debtToken = ERC20.bind(Address.fromString(CORE_DEBT_TOKEN));
const pyth = Pyth.bind(Address.fromString(PYTH));

function aprToApy(apr: BigDecimal): BigDecimal {
  // Formula: APY = e^APR - 1
  // We'll use the first few terms of the Taylor series for e^x since there's no direct exp function
  // e^x ≈ 1 + x + x²/2! + x³/3! + x⁴/4! + ...

  let ONE = BigDecimal.fromString("1");
  let TWO = BigDecimal.fromString("2");
  let SIX = BigDecimal.fromString("6");
  let TWENTY_FOUR = BigDecimal.fromString("24");
  let result = ONE; // Start with 1

  // Add x
  result = result.plus(apr);

  // Add x²/2
  let termTwo = apr.times(apr).div(TWO);
  result = result.plus(termTwo);

  // Add x³/6
  let termThree = apr
    .times(apr)
    .times(apr)
    .div(SIX);
  result = result.plus(termThree);

  // Add x⁴/24
  let termFour = apr
    .times(apr)
    .times(apr)
    .times(apr)
    .div(TWENTY_FOUR);
  result = result.plus(termFour);

  // Subtract 1 to get the final APY
  return result.minus(ONE);
}

function calculateApy(apr: BigInt): BigInt {
  // Convert APR from its raw format (already divided by 10^9) to a decimal in range [0,1]
  let aprDecimal = apr
    .toBigDecimal()
    .div(BigDecimal.fromString("1000000000000000000"));

  let wbtcApy = aprToApy(aprDecimal).times(
    BigDecimal.fromString("1000000000000000000")
  );
  return BigInt.fromString(wbtcApy.toString().split(".")[0]);
}

export function handleClaimRewardFromStrategy(
  event: ClaimRewardFromStrategy
): void {
  const vaultFee = lendingVaultContract.fee();
  const corePrice = pyth
    .getEmaPriceUnsafe(
      Bytes.fromHexString(
        "0x9b4503710cc8c53f75c30e6e4fda1a7064680ef2e0ee97acd2e3a7c37b3c830c"
      )
    )
    .price.times(BigInt.fromString("10000000000")); // 1e10
  const btcPrice = pyth
    .getEmaPriceUnsafe(
      Bytes.fromHexString(
        "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
      )
    )
    .price.times(BigInt.fromString("10000000000")); // 1e10
  // b14g apy
  const lastRoundClaim = lendingVaultContract.lastRoundClaim();
  const previousRoundClaim = lastRoundClaim.minus(BigInt.fromI32(1));
  const rewardData1 = lendingVaultContract.rewardDataLog(lastRoundClaim);
  const rewardData2 = lendingVaultContract.rewardDataLog(previousRoundClaim);

  const daysInYear = BigInt.fromI32(365);

  const increasedPerShare = rewardData1.value0.minus(rewardData2.value0);
  const b14gApy = increasedPerShare
    .times(corePrice)
    .times(daysInYear)
    .div(btcPrice.times(BigInt.fromString("10000000000")));

  // colend apy

  const wbtcApr = colendPoolContract
    .getReserveData(Address.fromString(WBTC))
    .currentLiquidityRate.div(BigInt.fromString("1000000000"));
  // Calculate APY
  const wbtcApy = calculateApy(wbtcApr);
  const apy = b14gApy
    .plus(wbtcApy)
    .times(BigInt.fromString("10000").minus(vaultFee))
    .div(BigInt.fromString("10000"));
  const data = new LendingVaultApy(getId(event));
  data.vault = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  data.apy = apy;
  data.blockNumber = event.block.number;
  data.timestamp = event.block.timestamp;
  data.boostApy = b14gApy;
  data.colendApy = wbtcApy;
  data.save();
}

export function handleStake(event: Stake): void {
  let vaultAsUser = User.load(Bytes.fromHexString(LENDING_VAULT));
  if (!vaultAsUser) {
    createUser(
      Bytes.fromHexString(LENDING_VAULT.toLowerCase()),
      event.block.timestamp
    );
  }
  let user = User.load(event.params.user);
  if (!user) {
    user = createUser(event.params.user, event.block.timestamp);
  }
  let actionCount = UserActionCount.load(
    user.id.concat(Bytes.fromHexString(LENDING_VAULT.toLowerCase()))
  );
  if (!actionCount) {
    actionCount = createUserActionCount(
      event.params.user,
      Bytes.fromHexString(LENDING_VAULT.toLowerCase())
    );
  }

  let lendingVault = Vault.load(Bytes.fromHexString(LENDING_VAULT));
  if (!lendingVault) {
    lendingVault = createVault(LENDING_VAULT);
  }
  const stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }

  const action = new VaultAction(getId(event));
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.params.user,
    Bytes.fromHexString(LENDING_VAULT.toLowerCase()),
    "WbtcVault",
    "Stake",
    event.params.amount,
    event.transaction.hash
  );
  action.transaction = getId(event);
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "Stake";
  action.from = event.params.user;
  action.amount = event.params.amount;
  action.toVault = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  lendingVault.stake += 1;
  lendingVault.total += 1;

  actionCount.stake += 1;
  actionCount.total += 1;

  actionCount.save();
  lendingVault.save();
  action.save();
}

export function handleRedeem(event: Redeem): void {
  const lendingVault = Vault.load(Bytes.fromHexString(LENDING_VAULT));
  if (!lendingVault) {
    return;
  }
  const stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }
  const actionCount = UserActionCount.load(
    event.params.user.concat(Bytes.fromHexString(LENDING_VAULT.toLowerCase()))
  );
  if (!actionCount) {
    return;
  }

  const action = new VaultAction(getId(event));
  const transaction = createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.params.user,
    Bytes.fromHexString(LENDING_VAULT.toLowerCase()),
    "WbtcVault",
    "ClaimReward",
    event.params.stakedAmount,
    event.transaction.hash
  );
  transaction.rewardAmount = event.params.rewardAmount;

  action.transaction = getId(event);
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.from = event.params.user;
  action.amount = event.params.stakedAmount;
  action.rewardAmount = event.params.rewardAmount;
  action.toVault = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;
  if (event.params.stakedAmount == ZERO_BI) {
    action.type = "ClaimReward";
    actionCount.claim += 1;

    lendingVault.claim += 1;
  } else {
    transaction.type = "Redeem";
    action.type = "Redeem";
    actionCount.unbond += 1;

    lendingVault.unbond += 1;
  }

  lendingVault.total += 1;
  actionCount.total += 1;

  transaction.save();
  actionCount.save();
  lendingVault.save();
  action.save();
}

export function handleWithdraw(event: Withdraw): void {
  const lendingVault = Vault.load(Bytes.fromHexString(LENDING_VAULT));
  if (!lendingVault) {
    return;
  }
  const stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }
  const actionCount = UserActionCount.load(
    event.params.user.concat(Bytes.fromHexString(LENDING_VAULT.toLowerCase()))
  );
  if (!actionCount) {
    return;
  }

  const action = new VaultAction(getId(event));
  const transaction = createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    event.params.user,
    Bytes.fromHexString(LENDING_VAULT.toLowerCase()),
    "WbtcVault",
    "Withdraw",
    event.params.amount,
    event.transaction.hash
  );
  transaction.rewardAmount = event.params.coreReward;
  transaction.save();
  action.transaction = getId(event);
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "Withdraw";
  action.from = event.params.user;
  action.amount = event.params.amount;
  action.rewardAmount = event.params.coreReward;
  action.toVault = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  lendingVault.withdraw += 1;
  lendingVault.total += 1;
  actionCount.withdraw += 1;
  actionCount.total += 1;

  actionCount.save();
  lendingVault.save();
  action.save();
}

export function handleLending(event: LendingInvest): void {
  const lendingVault = Vault.load(Bytes.fromHexString(LENDING_VAULT));
  if (!lendingVault) {
    return;
  }
  const stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }

  const action = new VaultAction(getId(event));
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    Bytes.fromHexString(LENDING_VAULT.toLowerCase()),
    Bytes.fromHexString(LENDING_VAULT.toLowerCase()),
    "WbtcVault",
    event.params.isLend ? "BorrowCore" : "RepayCore",
    event.params.lendAmount,
    event.transaction.hash
  );
  action.transaction = getId(event);
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = event.params.isLend ? "BorrowCore" : "RepayCore";
  action.from = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.amount = event.params.lendAmount;
  action.toVault = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  if (event.params.isLend) {
    if (!lendingVault.borrowCore) {
      lendingVault.borrowCore = 1;
    } else {
      lendingVault.borrowCore += 1;
    }
  } else {
    if (!lendingVault.repayCore) {
      lendingVault.repayCore = 1;
    } else {
      lendingVault.repayCore += 1;
    }
  }

  lendingVault.total += 1;

  lendingVault.save();
  action.save();
}

export function handleCoreInvest(event: CoreInvest): void {
  const lendingVault = Vault.load(Bytes.fromHexString(LENDING_VAULT));
  if (!lendingVault) {
    return;
  }
  const stats = Stats.load(B14G_ID);
  if (!stats) {
    return;
  }

  const amount = lendingMkpStrategyContract.totalStaked();
  const action = new VaultAction(getId(event));
  createTransaction(
    getId(event),
    event.block.number,
    event.block.timestamp,
    Bytes.fromHexString(LENDING_VAULT.toLowerCase()),
    Bytes.fromHexString(LENDING_VAULT.toLowerCase()),
    "WbtcVault",
    "CoreInvest",
    amount,
    event.transaction.hash
  );
  action.transaction = getId(event);
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "CoreInvest";
  action.from = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.amount = amount;
  action.toVault = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  lendingVault.total += 1;
  lendingVault.reInvest += 1;
  lendingVault.save();
  action.save();
}
