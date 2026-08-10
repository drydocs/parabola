import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import type { ArcSigner } from "@drydocs/parabola";
import { connectArcWallet } from "../lib/arcWallet.js";

export type WalletStatus = "idle" | "connecting" | "connected" | "error";

export function useArcWallet() {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [signer, setSigner] = useState<ArcSigner | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const result = await connectArcWallet();
      setSigner(result.signer);
      setAddress(result.address);
      setStatus("connected");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const disconnect = useCallback(() => {
    setSigner(null);
    setAddress(null);
    setStatus("idle");
    setError(null);
  }, []);

  // MetaMask (and other EIP-1193 wallets) disconnecting or switching accounts from
  // within the wallet's own UI doesn't call anything in this app -- without this
  // listener the app keeps showing "connected" to a wallet that no longer agrees.
  // accountsChanged fires with an empty array on disconnect, or a new account on switch;
  // either way the viem WalletClient built in connectArcWallet() is bound to the old
  // account, so the only correct response is to drop it and require reconnecting.
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum?.on) return;

    function handleAccountsChanged(...args: unknown[]): void {
      const accounts = args[0] as string[];
      if (accounts.length === 0 || accounts[0]?.toLowerCase() !== address?.toLowerCase()) {
        disconnect();
      }
    }

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("disconnect", disconnect);

    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("disconnect", disconnect);
    };
  }, [address, disconnect]);

  return { status, signer, address, error, connect, disconnect };
}
