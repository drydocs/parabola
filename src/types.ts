import type { WalletClient } from "viem";
import type { Keypair } from "@stellar/stellar-sdk";

export type ChainId = "arc" | "stellar";
export type TransferSpeed = "standard" | "fast";
export type TransferMode = "standard" | "fast";
export type TransferStatus = "success" | "pending" | "failed";

/** Signs Arc (EVM) transactions. Wraps a viem WalletClient with an account attached. */
export interface ArcSigner {
  walletClient: WalletClient;
}

/** Signs Stellar transactions, either via a Keypair or a custom sign function (hardware wallets). */
export interface StellarSigner {
  publicKey: string;
  keypair?: Keypair;
  signTransaction?: (xdr: string, networkPassphrase: string) => Promise<string>;
}

export type Signer = ArcSigner | StellarSigner;

export interface TransferOptions {
  /** Max USDC fee tolerated for a fast transfer. Falls back to standard if the quoted fee exceeds this. */
  maxFee?: string;
  /** Max seconds to wait before falling back to standard transfer. */
  maxWait?: number;
  /** Milliseconds between Iris attestation polls. Default 3000. */
  pollInterval?: number;
  /** Milliseconds before polling gives up. Default 300000. */
  pollTimeout?: number;
  /** Use Circle's sandbox Iris API. Default true (testnet only SDK). */
  useSandbox?: boolean;
  /**
   * Signer for the destination-chain completion call (receiveMessage on Arc,
   * mint_and_forward on Stellar). This is a separate signature from `signer`
   * because completing a CCTP transfer requires paying gas natively on the
   * destination chain, which the source-chain signer cannot do. Omit this to
   * perform only the burn and attestation steps: the result comes back with
   * status "pending" and an empty mintTxHash, and the developer completes the
   * mint later (e.g. from a backend process holding the destination key).
   */
  destinationSigner?: Signer;
}

export interface TransferParams {
  from: ChainId;
  to: ChainId;
  amount: string;
  recipient: string;
  speed: TransferSpeed;
  signer: Signer;
  options?: TransferOptions;
}

export interface TransferResult {
  status: TransferStatus;
  transferMode: TransferMode;
  burnTxHash: string;
  attestationHash: string;
  mintTxHash: string;
  fee: string;
  durationMs: number;
}

export interface EstimateFeeParams {
  from: ChainId;
  to: ChainId;
  amount: string;
  speed: TransferSpeed;
}

export interface FeeEstimate {
  protocolFee: string;
  estimatedDurationSeconds: number;
  transferMode: TransferMode;
}
