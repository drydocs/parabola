import { useEffect } from "react";
import type { ChainId, TransferSpeed } from "@drydocs/parabola";
import type { useArcWallet } from "../hooks/useArcWallet.js";
import type { useStellarWallet } from "../hooks/useStellarWallet.js";

export interface TransferFormState {
  from: ChainId;
  to: ChainId;
  amount: string;
  recipient: string;
  speed: TransferSpeed;
  /** Whether to attach options.destinationSigner (single-call path) or leave the transfer
   *  "pending" and complete it separately (two-step path); both are real Parabola patterns. */
  useDestinationSigner: boolean;
}

const ARC_RECIPIENT_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const STELLAR_RECIPIENT_PATTERN = /^[GC][A-Z2-7]{55}$/;

export function recipientError(to: ChainId, recipient: string): string | null {
  if (!recipient) return null;
  const pattern = to === "arc" ? ARC_RECIPIENT_PATTERN : STELLAR_RECIPIENT_PATTERN;
  if (pattern.test(recipient)) return null;
  return to === "arc" ? "Expected a 0x-prefixed EVM address" : "Expected a Stellar G... or C... address";
}

interface Props {
  value: TransferFormState;
  onChange: (next: TransferFormState) => void;
  arcWallet: ReturnType<typeof useArcWallet>;
  stellarWallet: ReturnType<typeof useStellarWallet>;
  onSubmit: () => void;
  submitting: boolean;
}

export function TransferForm({ value, onChange, arcWallet, stellarWallet, onSubmit, submitting }: Props) {
  const sourceWallet = value.from === "arc" ? arcWallet : stellarWallet;
  const destinationWallet = value.to === "arc" ? arcWallet : stellarWallet;

  const sourceReady = sourceWallet.status === "connected";
  const destinationReady = !value.useDestinationSigner || destinationWallet.status === "connected";
  const recipientErr = recipientError(value.to, value.recipient);
  const canSubmit = sourceReady && destinationReady && !recipientErr && Number(value.amount) > 0 && !submitting;

  // Most demo transfers are to yourself, across your own two wallets -- default the
  // recipient to the destination wallet's own address as soon as it connects, rather
  // than making the user retype an address the app already has. Only fills an empty
  // field, so it never clobbers a recipient someone typed in to pay out to a third party.
  useEffect(() => {
    if (destinationWallet.status === "connected" && destinationWallet.address && !value.recipient) {
      onChange({ ...value, recipient: destinationWallet.address });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationWallet.status, destinationWallet.address, value.to]);

  function flipDirection() {
    onChange({ ...value, from: value.to, to: value.from, recipient: "" });
  }

  function useConnectedAddress() {
    if (destinationWallet.address) {
      onChange({ ...value, recipient: destinationWallet.address });
    }
  }

  return (
    <form
      className="transfer-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="direction-row">
        <span className="direction-chain">{value.from === "arc" ? "Arc" : "Stellar"}</span>
        <button type="button" className="link-button" onClick={flipDirection} aria-label="Flip direction">
          &rarr;
        </button>
        <span className="direction-chain">{value.to === "arc" ? "Arc" : "Stellar"}</span>
      </div>

      <label>
        Amount (USDC)
        <input
          type="text"
          inputMode="decimal"
          placeholder="10.00"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
        />
      </label>

      <label>
        <span className="label-row">
          Recipient ({value.to === "arc" ? "Arc address" : "Stellar address"})
          {destinationWallet.address && destinationWallet.address !== value.recipient && (
            <button type="button" className="link-button" onClick={useConnectedAddress}>
              Use connected address
            </button>
          )}
        </span>
        <input
          type="text"
          placeholder={value.to === "arc" ? "0x..." : "G..."}
          value={value.recipient}
          onChange={(e) => onChange({ ...value, recipient: e.target.value })}
        />
        {recipientErr && <span className="field-error">{recipientErr}</span>}
      </label>

      <label>
        Speed
        <select
          value={value.speed}
          onChange={(e) => onChange({ ...value, speed: e.target.value as TransferSpeed })}
        >
          <option value="standard">Standard (no fee)</option>
          <option value="fast">Fast (small fee)</option>
        </select>
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={value.useDestinationSigner}
          onChange={(e) => onChange({ ...value, useDestinationSigner: e.target.checked })}
        />
        Complete the mint automatically (requires both wallets connected)
      </label>

      {!value.useDestinationSigner && (
        <p className="hint">
          Leaving this unchecked demonstrates the two-step pattern: the transfer will return{" "}
          <code>status: "pending"</code>, and you finish it later with a "Complete mint" button
          once the destination wallet is connected.
        </p>
      )}

      <button type="submit" disabled={!canSubmit}>
        {submitting ? "Submitting..." : "Transfer"}
      </button>
    </form>
  );
}
