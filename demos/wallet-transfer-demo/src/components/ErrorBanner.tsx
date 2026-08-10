interface Props {
  message: string;
  burnMayHaveSucceeded: boolean;
  recoverableBurnTxHash: string | null;
  destinationWalletConnected: boolean;
  onRecover: () => void;
  recovering: boolean;
  onDismiss: () => void;
}

/**
 * transfer() throwing does not mean nothing happened: the source-chain burn step can
 * succeed and then a later step (attestation polling, the mint call) can still fail).
 * transfer() rethrows those as a TransferError carrying burnTxHash (see src/errors.ts),
 * so this banner can offer to finish the mint directly instead of just pointing at an
 * explorer and asking the user to call completeMint() themselves.
 */
export function ErrorBanner({
  message,
  burnMayHaveSucceeded,
  recoverableBurnTxHash,
  destinationWalletConnected,
  onRecover,
  recovering,
  onDismiss,
}: Props) {
  return (
    <div className="error-banner" role="alert">
      <p>{message}</p>
      {recoverableBurnTxHash ? (
        <p>
          The source-chain burn already succeeded (tx <code>{recoverableBurnTxHash}</code>);
          the funds haven't minted on the destination chain yet.{" "}
          {destinationWalletConnected
            ? "Finish it below rather than retrying the transfer from scratch."
            : "Connect the destination wallet, then finish it below rather than retrying the transfer from scratch."}
        </p>
      ) : (
        <p>
          {burnMayHaveSucceeded
            ? "The source-chain burn very likely already succeeded before this failed, and the funds have left the source chain. Check your address on the source-chain explorer to find the burn transaction, then call completeMint() with that hash rather than retrying the transfer from scratch."
            : "Your transfer may have already succeeded on the source chain even though this failed. Check the source-chain explorer for your address before retrying."}
        </p>
      )}
      <div className="error-banner-actions">
        {recoverableBurnTxHash && (
          <button onClick={onRecover} disabled={!destinationWalletConnected || recovering}>
            {recovering ? "Completing mint..." : "Complete mint"}
          </button>
        )}
        <button className="link-button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
