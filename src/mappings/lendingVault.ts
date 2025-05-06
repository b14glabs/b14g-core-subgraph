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
  VaultAction,
  VaultActionCount,
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
  const aTokenContract = ERC20.bind(lendingVaultContract.aStakeToken());
  const totalWbtc = aTokenContract.balanceOf(Address.fromString(LENDING_VAULT));
  const debt = debtToken.balanceOf(Address.fromString(LENDING_VAULT));

  const wbtcApr = colendPoolContract
    .getReserveData(Address.fromString(WBTC))
    .currentLiquidityRate.div(BigInt.fromString("1000000000"));
  const borrowCoreApr = colendPoolContract
    .getReserveData(Address.fromString(WCORE))
    .currentVariableBorrowRate.div(BigInt.fromString("1000000000"));

  // Calculate APY
  const wbtcApy = calculateApy(wbtcApr);
  const borrowApy = calculateApy(borrowCoreApr);
  const wbtcEarningUsd = wbtcApy.times(btcPrice).times(totalWbtc);
  const borrowUsd = borrowApy
    .times(corePrice)
    .times(debt)
    .div(BigInt.fromString("10000000000"));
  const colendApy = wbtcEarningUsd
    .minus(borrowUsd)
    .times(BigInt.fromString("10000").minus(vaultFee))
    .div(BigInt.fromString("10000"))
    .div(totalWbtc.times(btcPrice));
  const apy = b14gApy.plus(colendApy);
  const data = new LendingVaultApy(getId(event));
  data.apy = apy;
  data.blockNumber = event.block.number;
  data.timestamp = event.block.timestamp;
  data.boostApy = apy.minus(wbtcApy)
  data.colendApy = wbtcApy;
  data.save();
}

export function handleStake(event: Stake): void {
  const reverseData = colendPoolContract.getReserveData(Address.fromString(LENDING_VAULT))
  let vaultAsUser = User.load(Bytes.fromHexString(LENDING_VAULT));
  if (!vaultAsUser) {
    createUser(Bytes.fromHexString(LENDING_VAULT.toLowerCase()));
  }
  let user = User.load(event.params.user);
  if (!user) {
    user = createUser(event.params.user);
  }
  const actionCount = VaultActionCount.load(user.id);
  if (!actionCount) {
    return;
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
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "StakeWbtc";
  action.from = event.params.user;
  action.amount = event.params.amount;
  action.to = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  lendingVault.totalDepositActions += 1;
  lendingVault.totalActions += 1;

  actionCount.wbtc += 1;
  actionCount.wbtcStake += 1;

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
  const actionCount = VaultActionCount.load(event.params.user);
  if (!actionCount) {
    return;
  }

  const action = new VaultAction(getId(event));
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "RedeemWbtc";
  action.from = event.params.user;
  action.amount = event.params.stakedAmount;
  action.rewardAmount = event.params.rewardAmount;
  action.to = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  lendingVault.totalUnbondActions += 1;
  lendingVault.totalActions += 1;
  actionCount.wbtc += 1;
  actionCount.wbtcRedeem += 1;

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
  const actionCount = VaultActionCount.load(event.params.user);
  if (!actionCount) {
    return;
  }

  const action = new VaultAction(getId(event));
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "WithdrawWbtc";
  action.from = event.params.user;
  action.amount = event.params.amount;
  action.to = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  lendingVault.totalWithdrawActions += 1;
  lendingVault.totalActions += 1;
  actionCount.wbtc += 1;
  actionCount.wbtcWithdraw += 1;

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
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = event.params.isLend ? "BorrowCore" : "RepayCore";
  action.from = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.amount = event.params.lendAmount;
  action.to = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  if (event.params.isLend) {
    if (!lendingVault.totalBorrowCoreActions) {
      lendingVault.totalBorrowCoreActions = 1;
    } else {
      lendingVault.totalBorrowCoreActions += 1;
    }
  } else {
    if (!lendingVault.totalRepayCoreActions) {
      lendingVault.totalRepayCoreActions = 1;
    } else {
      lendingVault.totalRepayCoreActions += 1;
    }
  }

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

  const action = new VaultAction(getId(event));
  action.blockNumber = event.block.number;
  action.timestamp = event.block.timestamp;
  action.txHash = event.transaction.hash;
  action.type = "CoreInvest";
  action.from = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.amount = lendingMkpStrategyContract.totalStaked();
  action.to = Bytes.fromHexString(LENDING_VAULT.toLowerCase());
  action.totalCoreStaked = stats.totalCoreStaked;

  lendingVault.totalActions += 1;
  lendingVault.totalReInvestActions += 1;
  lendingVault.save();
  action.save();
}
