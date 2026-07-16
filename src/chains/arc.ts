import { createPublicClient, http, defineChain, type Hex } from "viem";
import { ARC_TESTNET } from "../constants.js";
import type { ArcSigner } from "../types.js";

export const arcTestnetChain = defineChain({
  id: ARC_TESTNET.chainId,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: [ARC_TESTNET.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: ARC_TESTNET.explorerUrl },
  },
  testnet: true,
});

const tokenMessengerV2Abi = [
  {
    type: "function",
    name: "depositForBurn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "depositForBurnWithHook",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
      { name: "hookData", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const messageTransmitterV2Abi = [
  {
    type: "function",
    name: "receiveMessage",
    stateMutability: "nonpayable",
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
] as const;

const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

function publicClient() {
  return createPublicClient({ chain: arcTestnetChain, transport: http(ARC_TESTNET.rpcUrl) });
}

type WriteContractRequest = Omit<
  Parameters<ArcSigner["walletClient"]["writeContract"]>[0],
  "chain" | "account"
>;

async function writeAndWait(signer: ArcSigner, request: WriteContractRequest) {
  const account = signer.walletClient.account;
  if (!account) {
    throw new Error("ArcSigner's walletClient must have an account attached");
  }
  const hash = await signer.walletClient.writeContract({
    ...request,
    account,
    chain: arcTestnetChain,
  } as Parameters<ArcSigner["walletClient"]["writeContract"]>[0]);
  await publicClient().waitForTransactionReceipt({ hash });
  return hash;
}

/** Approves the TokenMessengerV2 contract to spend USDC on the signer's behalf. */
export async function approveUsdcOnArc(signer: ArcSigner, amountRaw: bigint): Promise<Hex> {
  return writeAndWait(signer, {
    address: ARC_TESTNET.usdc as Hex,
    abi: erc20Abi,
    functionName: "approve",
    args: [ARC_TESTNET.tokenMessengerV2 as Hex, amountRaw],
  });
}

/** Burns USDC on Arc via TokenMessengerV2.depositForBurn for a plain (non-Stellar) destination. */
export async function burnUsdcOnArc(params: {
  amountRaw: bigint;
  destinationDomain: number;
  mintRecipientBytes32: Hex;
  maxFeeRaw: bigint;
  minFinalityThreshold: number;
  signer: ArcSigner;
}): Promise<Hex> {
  return writeAndWait(params.signer, {
    address: ARC_TESTNET.tokenMessengerV2 as Hex,
    abi: tokenMessengerV2Abi,
    functionName: "depositForBurn",
    args: [
      params.amountRaw,
      params.destinationDomain,
      params.mintRecipientBytes32,
      ARC_TESTNET.usdc as Hex,
      `0x${"0".repeat(64)}` as Hex,
      params.maxFeeRaw,
      params.minFinalityThreshold,
    ],
  });
}

/**
 * Burns USDC on Arc via TokenMessengerV2.depositForBurnWithHook, encoding the
 * Stellar recipient's strkey into the hook payload so CctpForwarder on Stellar
 * knows where to forward the minted USDC.
 */
export async function burnUsdcOnArcWithStellarForward(params: {
  amountRaw: bigint;
  destinationDomain: number;
  mintRecipientBytes32: Hex;
  maxFeeRaw: bigint;
  minFinalityThreshold: number;
  hookData: Hex;
  signer: ArcSigner;
}): Promise<Hex> {
  return writeAndWait(params.signer, {
    address: ARC_TESTNET.tokenMessengerV2 as Hex,
    abi: tokenMessengerV2Abi,
    functionName: "depositForBurnWithHook",
    args: [
      params.amountRaw,
      params.destinationDomain,
      params.mintRecipientBytes32,
      ARC_TESTNET.usdc as Hex,
      `0x${"0".repeat(64)}` as Hex,
      params.maxFeeRaw,
      params.minFinalityThreshold,
      params.hookData,
    ],
  });
}

/** Submits an attested CCTP message on Arc via MessageTransmitterV2.receiveMessage. */
export async function receiveMessageOnArc(params: {
  message: Hex;
  attestation: Hex;
  signer: ArcSigner;
}): Promise<Hex> {
  return writeAndWait(params.signer, {
    address: ARC_TESTNET.messageTransmitterV2 as Hex,
    abi: messageTransmitterV2Abi,
    functionName: "receiveMessage",
    args: [params.message, params.attestation],
  });
}
