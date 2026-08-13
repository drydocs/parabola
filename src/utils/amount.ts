import type { ChainId } from "../types.js";
import { ARC_TESTNET, STELLAR_TESTNET } from "../constants.js";
import { parseUsdcAmount, formatUsdcAmount } from "./encoding.js";

export function decimalsForChain(chain: ChainId): number {
  return chain === "arc" ? ARC_TESTNET.usdcDecimals : STELLAR_TESTNET.usdcDecimals;
}

/** Parses a human-readable USDC amount into raw subunits native to the given chain. */
export function toRawAmount(amount: string, chain: ChainId): bigint {
  return parseUsdcAmount(amount, decimalsForChain(chain));
}

/** Formats raw subunits native to the given chain back into a human-readable USDC amount. */
export function fromRawAmount(raw: bigint, chain: ChainId): string {
  return formatUsdcAmount(raw, decimalsForChain(chain));
}
