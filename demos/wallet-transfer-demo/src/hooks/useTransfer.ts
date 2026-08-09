import { useCallback, useState } from "react";
import {
  transfer,
  estimateFee,
  completeMint,
  type TransferParams,
  type TransferResult,
  type EstimateFeeParams,
  type FeeEstimate,
  type CompleteMintParams,
} from "@drydocs/parabola";

export type TransferUiStatus = "idle" | "submitting" | "success" | "pending" | "error";

/**
 * transfer() throws entirely if Iris attestation polling times out. burnTxHash is never
 * returned to the caller in that case, even though the source-chain burn already happened.
 * There is no way to recover it from the thrown error. See src/iris/poll.ts's timeout message
 * and INTEGRATION.md's "Known rough edge" section.
 */
const ATTESTATION_TIMEOUT_MARKER = "Timed out after";

export function useTransfer() {
  const [status, setStatus] = useState<TransferUiStatus>("idle");
  const [result, setResult] = useState<TransferResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [burnMayHaveSucceeded, setBurnMayHaveSucceeded] = useState(false);

  const [feeEstimate, setFeeEstimate] = useState<FeeEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);

  const submit = useCallback(async (params: TransferParams) => {
    setStatus("submitting");
    setError(null);
    setBurnMayHaveSucceeded(false);
    try {
      const transferResult = await transfer(params);
      setResult(transferResult);
      setStatus(transferResult.status === "success" ? "success" : "pending");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setBurnMayHaveSucceeded(message.includes(ATTESTATION_TIMEOUT_MARKER));
      setStatus("error");
    }
  }, []);

  const finishPending = useCallback(async (params: CompleteMintParams) => {
    setStatus("submitting");
    setError(null);
    try {
      const completeResult = await completeMint(params);
      setResult((previous) =>
        previous
          ? { ...previous, status: "success", mintTxHash: completeResult.mintTxHash, attestationHash: completeResult.attestationHash }
          : previous,
      );
      setStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setBurnMayHaveSucceeded(message.includes(ATTESTATION_TIMEOUT_MARKER));
      setStatus("error");
    }
  }, []);

  const estimate = useCallback(async (params: EstimateFeeParams) => {
    setEstimating(true);
    try {
      setFeeEstimate(await estimateFee(params));
    } catch {
      setFeeEstimate(null);
    } finally {
      setEstimating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
    setBurnMayHaveSucceeded(false);
  }, []);

  return { status, result, error, burnMayHaveSucceeded, submit, finishPending, feeEstimate, estimating, estimate, reset };
}
