import { Address, Bytes } from "@graphprotocol/graph-ts";
import { Transfer, Yield } from "../types/Yield/Yield";
import { ADDRESS_ZERO, LOTTERY, YIELD_BTC, createLottery } from "./helpers";
import { Lottery, YieldBTC } from "../types/schema";

const yieldContract = Yield.bind(Address.fromString(YIELD_BTC));

export function handleTransferToken(event: Transfer): void {
  let lottery = Lottery.load(Bytes.fromHexString(LOTTERY.toLowerCase()));
  if (!lottery) {
    lottery = createLottery();
  }
  const from = event.params.from;
  if (from.toHexString() == ADDRESS_ZERO) {
    const receiver = yieldContract.tokenIdToRewardReceiver(
      event.params.tokenId
    );
    const yieldBtc = new YieldBTC(receiver);
    yieldBtc.isDeposited = false;
    yieldBtc.user = event.params.to;
    yieldBtc.order = receiver;
    yieldBtc.tokenId = event.params.tokenId;
    yieldBtc.save();
  }
}
