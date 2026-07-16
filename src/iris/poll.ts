import { IRIS_MAINNET_BASE_URL, IRIS_SANDBOX_BASE_URL, DEFAULT_POLL_INTERVAL_MS, DEFAULT_POLL_TIMEOUT_MS } from "../constants.js";
import type { IrisMessage, IrisMessagesResponse, IrisFeesResponse } from "./types.js";

export function irisBaseUrl(useSandbox: boolean): string {
  return useSandbox ? IRIS_SANDBOX_BASE_URL : IRIS_MAINNET_BASE_URL;
}

/** Fetches the current Fast Transfer fee (in basis points) for a source/destination domain pair. */
export async function fetchFastTransferFeeBps(
  sourceDomain: number,
  destDomain: number,
  useSandbox: boolean,
): Promise<number> {
  const url = `${irisBaseUrl(useSandbox)}burn/USDC/fees/${sourceDomain}/${destDomain}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Iris fees request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as IrisFeesResponse;
  const fastEntry = body.data.find((entry) => entry.finalityThreshold <= 1000);
  return fastEntry?.minimumFee ?? 0;
}

/**
 * Polls Iris for the attestation of a burn transaction until it is complete or
 * pollTimeout elapses. Resolves with the completed IrisMessage.
 */
export async function pollForAttestation(params: {
  sourceDomain: number;
  transactionHash: string;
  useSandbox: boolean;
  pollInterval?: number;
  pollTimeout?: number;
}): Promise<IrisMessage> {
  const pollInterval = params.pollInterval ?? DEFAULT_POLL_INTERVAL_MS;
  const pollTimeout = params.pollTimeout ?? DEFAULT_POLL_TIMEOUT_MS;
  const url = `${irisBaseUrl(params.useSandbox)}messages/${params.sourceDomain}?transactionHash=${params.transactionHash}`;

  const deadline = Date.now() + pollTimeout;

  while (Date.now() < deadline) {
    const res = await fetch(url);
    if (res.ok) {
      const body = (await res.json()) as IrisMessagesResponse;
      const message = body.messages[0];
      if (message && message.status === "complete" && message.attestation) {
        return message;
      }
    }
    await sleep(Math.min(pollInterval, Math.max(0, deadline - Date.now())));
  }

  throw new Error(
    `Timed out after ${pollTimeout}ms waiting for Iris attestation of ${params.transactionHash}`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
