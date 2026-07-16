import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchFastTransferFeeBps = vi.fn();

vi.mock("../src/iris/poll.js", () => ({
  fetchFastTransferFeeBps: (...args: unknown[]) => fetchFastTransferFeeBps(...args),
}));

const { estimateFee } = await import("../src/estimate.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("estimateFee", () => {
  it("returns a zero protocol fee for standard transfers without calling Iris", async () => {
    const estimate = await estimateFee({
      from: "arc",
      to: "stellar",
      amount: "100",
      speed: "standard",
    });

    expect(estimate).toMatchObject({ protocolFee: "0", transferMode: "standard" });
    expect(fetchFastTransferFeeBps).not.toHaveBeenCalled();
  });

  it("computes the protocol fee for fast transfers from the quoted basis points", async () => {
    fetchFastTransferFeeBps.mockResolvedValue(10); // 0.1%

    const estimate = await estimateFee({
      from: "arc",
      to: "stellar",
      amount: "100",
      speed: "fast",
    });

    expect(estimate.transferMode).toBe("fast");
    expect(estimate.protocolFee).toBe("0.1");
  });
});
