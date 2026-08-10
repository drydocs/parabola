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
