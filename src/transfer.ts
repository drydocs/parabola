import type {
  TransferParams,
  TransferResult,
  TransferMode,
  ArcSigner,
  StellarSigner,
  ChainId,
  Signer,
  CompleteMintParams,
  CompleteMintResult,
} from "./types.js";
import {
  ARC_DOMAIN,
  STELLAR_DOMAIN,
  STELLAR_TESTNET,
  FINALITY_THRESHOLD_STANDARD,
  FINALITY_THRESHOLD_FAST,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_POLL_TIMEOUT_MS,
} from "./constants.js";
import { fetchFastTransferFeeBps, pollForAttestation } from "./iris/poll.js";
import { toRawAmount, fromRawAmount, decimalsForChain } from "./utils/amount.js";
import { parseUsdcAmount, stellarAddressToBytes32, evmAddressToBytes32, encodeStellarForwardHook } from "./utils/encoding.js";
import { burnUsdcOnArc, burnUsdcOnArcWithStellarForward, receiveMessageOnArc } from "./chains/arc.js";
import { burnUsdcOnStellar, mintAndForwardOnStellar } from "./chains/stellar.js";

const FAST_ESTIMATED_DURATION_SECONDS = 15;

function domainFor(chain: "arc" | "stellar"): number {
  return chain === "arc" ? ARC_DOMAIN : STELLAR_DOMAIN;
}

export async function transfer(params: TransferParams): Promise<TransferResult> {
  const start = Date.now();
  const options = params.options ?? {};
  const useSandbox = options.useSandbox ?? true;
  const pollInterval = options.pollInterval ?? DEFAULT_POLL_INTERVAL_MS;
  const pollTimeout = options.pollTimeout ?? DEFAULT_POLL_TIMEOUT_MS;

  let transferMode: TransferMode = params.speed;
  let feeRaw = 0n;

  if (transferMode === "fast") {
    if (options.maxWait !== undefined && FAST_ESTIMATED_DURATION_SECONDS > options.maxWait) {
      transferMode = "standard";
    } else {
      const feeBps = await fetchFastTransferFeeBps(domainFor(params.from), domainFor(params.to), useSandbox);
      const amountRawSource = toRawAmount(params.amount, params.from);
      feeRaw = (amountRawSource * BigInt(feeBps)) / 10_000n;
      if (options.maxFee !== undefined) {
        const maxFeeRaw = parseUsdcAmount(options.maxFee, decimalsForChain(params.from));
        if (feeRaw > maxFeeRaw) {
          transferMode = "standard";
          feeRaw = 0n;
        }
      }
    }
  }

  const minFinalityThreshold =
    transferMode === "fast" ? FINALITY_THRESHOLD_FAST : FINALITY_THRESHOLD_STANDARD;
  const amountRaw = toRawAmount(params.amount, params.from);
  const maxFeeRaw =
    transferMode === "fast" && options.maxFee !== undefined
      ? parseUsdcAmount(options.maxFee, decimalsForChain(params.from))
      : feeRaw;

  const burnTxHash = await burn({
    params,
    amountRaw,
    maxFeeRaw,
    minFinalityThreshold,
  });

  const attestation = await pollForAttestation({
    sourceDomain: domainFor(params.from),
    transactionHash: burnTxHash,
    useSandbox,
    pollInterval,
    pollTimeout,
  });

  let mintTxHash = "";
  let status: TransferResult["status"] = "pending";

  if (options.destinationSigner && attestation.message && attestation.attestation) {
    mintTxHash = await mint({
      to: params.to,
      message: attestation.message as `0x${string}`,
      attestation: attestation.attestation as `0x${string}`,
      signer: options.destinationSigner,
    });
    status = "success";
  }

  return {
    status,
    transferMode,
    burnTxHash,
    attestationHash: attestation.attestation ?? "",
    mintTxHash,
    fee: transferMode === "fast" ? fromRawAmount(feeRaw, params.from) : "0",
    durationMs: Date.now() - start,
  };
}

async function burn(args: {
  params: TransferParams;
  amountRaw: bigint;
  maxFeeRaw: bigint;
  minFinalityThreshold: number;
}): Promise<string> {
  const { params, amountRaw, maxFeeRaw, minFinalityThreshold } = args;

  if (params.from === "arc") {
    const signer = params.signer as ArcSigner;
    if (params.to === "stellar") {
      const hookData = encodeStellarForwardHook(params.recipient);
      const mintRecipientBytes32 = stellarAddressToBytes32(STELLAR_TESTNET.cctpForwarder);
      return burnUsdcOnArcWithStellarForward({
        amountRaw,
        destinationDomain: STELLAR_DOMAIN,
        mintRecipientBytes32,
        maxFeeRaw,
        minFinalityThreshold,
        hookData,
        signer,
      });
    }
    const mintRecipientBytes32 = evmAddressToBytes32(params.recipient as `0x${string}`);
    return burnUsdcOnArc({
      amountRaw,
      destinationDomain: domainFor(params.to),
      mintRecipientBytes32,
      maxFeeRaw,
      minFinalityThreshold,
      signer,
    });
  }

  const signer = params.signer as StellarSigner;
  const mintRecipientBytes32 = evmAddressToBytes32(params.recipient as `0x${string}`);
  return burnUsdcOnStellar({
    amountRaw,
    destinationDomain: ARC_DOMAIN,
    mintRecipientBytes32,
    maxFeeRaw,
    minFinalityThreshold,
    signer,
  });
}

async function mint(args: {
  to: ChainId;
  message: `0x${string}`;
  attestation: `0x${string}`;
  signer: Signer;
}): Promise<string> {
  const { to, message, attestation, signer } = args;

  if (to === "arc") {
    return receiveMessageOnArc({ message, attestation, signer: signer as ArcSigner });
  }
  return mintAndForwardOnStellar({ message, attestation, signer: signer as StellarSigner });
}

/**
 * Completes a transfer that was left "pending" because transfer() was called
 * without options.destinationSigner. Re-polls Iris for the burn's attestation
 * (in case it wasn't available yet) and submits the destination-chain mint:
 * receiveMessage on Arc, or mint_and_forward on Stellar's CctpForwarder.
 */
export async function completeMint(params: CompleteMintParams): Promise<CompleteMintResult> {
  const useSandbox = params.useSandbox ?? true;
  const pollInterval = params.pollInterval ?? DEFAULT_POLL_INTERVAL_MS;
  const pollTimeout = params.pollTimeout ?? DEFAULT_POLL_TIMEOUT_MS;

  const attestation = await pollForAttestation({
    sourceDomain: domainFor(params.from),
    transactionHash: params.burnTxHash,
    useSandbox,
    pollInterval,
    pollTimeout,
  });

  if (!attestation.message || !attestation.attestation) {
    throw new Error(`Iris returned no attestation for burn ${params.burnTxHash}`);
  }

  const mintTxHash = await mint({
    to: params.to,
    message: attestation.message as `0x${string}`,
    attestation: attestation.attestation as `0x${string}`,
    signer: params.signer,
  });

  return { mintTxHash, attestationHash: attestation.attestation };
}
