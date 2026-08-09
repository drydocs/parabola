import { useCallback, useState } from "react";
import type { StellarSigner } from "@drydocs/parabola";
import { connectStellarWallet } from "../lib/stellarWallet.js";
import type { WalletStatus } from "./useArcWallet.js";

export function useStellarWallet() {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [signer, setSigner] = useState<StellarSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);
    try {
      const result = await connectStellarWallet();
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

  return { status, signer, address, error, connect, disconnect };
}
