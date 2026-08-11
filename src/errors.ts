/**
 * Thrown by transfer() for any failure that happens after the source-chain burn has
 * already succeeded: attestation polling (timeout or otherwise), or the destination-chain
 * mint call. Carries burnTxHash so the caller can recover with completeMint() instead of
 * losing track of funds that already left the source chain.
 */
export class TransferError extends Error {
  readonly burnTxHash: string;
  readonly attestationHash?: string;

  constructor(message: string, burnTxHash: string, attestationHash?: string) {
    super(message);
    this.name = "TransferError";
    this.burnTxHash = burnTxHash;
    this.attestationHash = attestationHash;
  }
}

/**
 * Thrown when a transaction was broadcast (a hash exists) but the SDK gave up waiting
 * for on-chain confirmation before it could tell whether it landed. This is genuine
 * uncertainty, not "nothing happened": the transaction may still succeed or fail on
 * its own. Chain-specific submit helpers (writeAndWait on Arc, pollTransactionStatus on
 * Stellar) throw this instead of a bare Error so callers with a hash can act on it,
 * rather than the hash being silently discarded along with the thrown error.
 */
export class SubmissionTimeoutError extends Error {
  readonly hash: string;

  constructor(message: string, hash: string) {
    super(message);
    this.name = "SubmissionTimeoutError";
    this.hash = hash;
  }
}
