import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchFastTransferFeeBps } from "../src/iris/poll.js";

describe("fetchFastTransferFeeBps", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("parses Iris's real response shape: a bare array, not { data: [...] }", async () => {
    // Verified directly against https://iris-api-sandbox.circle.com/v2/burn/USDC/fees/26/27,
    // which returns [{"finalityThreshold":1000,"minimumFee":0},...] with no wrapper object.
    // The code used to assume `{ data: [...] }` and threw "body.data is undefined" on every
    // real fast-transfer fee lookup; this guards against that shape assumption regressing.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { finalityThreshold: 2000, minimumFee: 5 },
        { finalityThreshold: 1000, minimumFee: 2 },
      ],
    }) as unknown as typeof fetch;

    const feeBps = await fetchFastTransferFeeBps(26, 27, true);

    expect(feeBps).toBe(2);
  });

  it("returns 0 when no entry at or under the fast finality threshold exists", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ finalityThreshold: 2000, minimumFee: 5 }],
    }) as unknown as typeof fetch;

    const feeBps = await fetchFastTransferFeeBps(26, 27, true);

    expect(feeBps).toBe(0);
  });

  it("throws when the request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    }) as unknown as typeof fetch;

    await expect(fetchFastTransferFeeBps(26, 27, true)).rejects.toThrow("Iris fees request failed");
  });
});
