import { useCallback, useState } from "react";
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

  return { status, signer, address, error, connect, disconnect };
}
