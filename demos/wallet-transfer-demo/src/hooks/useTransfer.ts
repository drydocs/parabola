import { useCallback, useState } from "react";
import {
  transfer,
  estimateFee,
  completeMint,
  TransferError,
  type TransferParams,
  type TransferResult,
  type EstimateFeeParams,
  type FeeEstimate,
  type CompleteMintParams,
} from "@drydocs/parabola";

export type TransferUiStatus = "idle" | "submitting" | "success" | "pending" | "error";

export function useTransfer() {
  const [status, setStatus] = useState<TransferUiStatus>("idle");
  const [result, setResult] = useState<TransferResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [burnMayHaveSucceeded, setBurnMayHaveSucceeded] = useState(false);
  // Set whenever transfer() throws a TransferError -- burnTxHash is still recoverable via
  // completeMint() even though the promise rejected, so the UI can offer that instead of
  // just telling the user to go find the hash themselves on an explorer.
  const [recoverableBurnTxHash, setRecoverableBurnTxHash] = useState<string | null>(null);

  const [feeEstimate, setFeeEstimate] = useState<FeeEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);

  const submit = useCallback(async (params: TransferParams) => {
    setStatus("submitting");
    setError(null);
    setBurnMayHaveSucceeded(false);
    setRecoverableBurnTxHash(null);
    try {
      const transferResult = await transfer(params);
      setResult(transferResult);
      setStatus(transferResult.status === "success" ? "success" : "pending");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      if (err instanceof TransferError) {
        setBurnMayHaveSucceeded(true);
        setRecoverableBurnTxHash(err.burnTxHash);
      }
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
          : { status: "success", transferMode: "standard", burnTxHash: params.burnTxHash, mintTxHash: completeResult.mintTxHash, attestationHash: completeResult.attestationHash, fee: "0", durationMs: 0 },
      );
      setRecoverableBurnTxHash(null);
      setStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      if (err instanceof TransferError) {
        setBurnMayHaveSucceeded(true);
        setRecoverableBurnTxHash(err.burnTxHash);
      }
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
    setRecoverableBurnTxHash(null);
  }, []);

  return {
    status,
    result,
    error,
    burnMayHaveSucceeded,
    recoverableBurnTxHash,
    submit,
    finishPending,
    feeEstimate,
    estimating,
    estimate,
    reset,
  };
}
