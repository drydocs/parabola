interface Props {
  message: string;
  burnMayHaveSucceeded: boolean;
  onDismiss: () => void;
}

/**
 * transfer() throwing does not mean nothing happened: the source-chain burn step can
 * succeed and then a later step (attestation polling, the mint call) can still fail or
 * time out. This banner never claims "nothing happened"; it always tells the user to check
 * the source chain, and says so more specifically when we can confirm why (attestation
 * timeout; see useTransfer.ts's ATTESTATION_TIMEOUT_MARKER check).
 */
export function ErrorBanner({ message, burnMayHaveSucceeded, onDismiss }: Props) {
  return (
    <div className="error-banner" role="alert">
      <p>{message}</p>
      <p>
        {burnMayHaveSucceeded
          ? "The source-chain burn very likely already succeeded before this timed out, and the funds have left the source chain. This demo has no way to recover the burn transaction hash once transfer() has thrown, so check your address on the source-chain explorer to find it, then call completeMint() yourself with that hash rather than retrying the transfer from scratch."
          : "Your transfer may have already succeeded on the source chain even though this failed. Check the source-chain explorer for your address before retrying."}
      </p>
      <button className="link-button" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
