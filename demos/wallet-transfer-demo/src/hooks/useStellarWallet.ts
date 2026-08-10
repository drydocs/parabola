import { useCallback, useEffect, useState } from "react";
import type { StellarSigner } from "@drydocs/parabola";
import { connectStellarWallet, stellarWalletStillConnected } from "../lib/stellarWallet.js";
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

  useEffect(() => {
    if (status !== "connected" || !address) return;

    function recheck(): void {
      if (!address) return;
      void stellarWalletStillConnected(address).then((stillConnected) => {
        if (!stillConnected) disconnect();
      });
    }

    function handleVisibilityChange(): void {
      if (document.visibilityState === "visible") recheck();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", recheck);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", recheck);
    };
  }, [status, address, disconnect]);

  return { status, signer, address, error, connect, disconnect };
}
