import { TurnRoundCapture } from "../types/schema";
import { ERC20 } from "../types/CandidateHub/ERC20";
import { LENDING_VAULT } from "./helpers";
import { turnedRound } from "../types/CandidateHub/CandidateHub";
import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts";

let debtCoreContract = ERC20.bind(
  Address.fromString("0x0000000000000000000000000000000000001005")
);

export function handleCapture(event: turnedRound): void {
  const date = event.block.timestamp.div(BigInt.fromI32(86400));
  const turnRoundCapture = new TurnRoundCapture(event.params.round.toString());
  turnRoundCapture.coreDebt = debtCoreContract.balanceOf(
    Address.fromString(LENDING_VAULT)
  );
  turnRoundCapture.date = date;

  turnRoundCapture.save();
}
