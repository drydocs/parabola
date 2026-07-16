import { describe, it, expect, vi, beforeEach } from "vitest";

const burnUsdcOnArc = vi.fn();
const burnUsdcOnArcWithStellarForward = vi.fn();
const receiveMessageOnArc = vi.fn();
const burnUsdcOnStellar = vi.fn();
const mintAndForwardOnStellar = vi.fn();
const fetchFastTransferFeeBps = vi.fn();
const pollForAttestation = vi.fn();

vi.mock("../src/chains/arc.js", () => ({
  burnUsdcOnArc: (...args: unknown[]) => burnUsdcOnArc(...args),
  burnUsdcOnArcWithStellarForward: (...args: unknown[]) => burnUsdcOnArcWithStellarForward(...args),
  receiveMessageOnArc: (...args: unknown[]) => receiveMessageOnArc(...args),
}));

vi.mock("../src/chains/stellar.js", () => ({
  burnUsdcOnStellar: (...args: unknown[]) => burnUsdcOnStellar(...args),
  mintAndForwardOnStellar: (...args: unknown[]) => mintAndForwardOnStellar(...args),
}));

vi.mock("../src/iris/poll.js", () => ({
  fetchFastTransferFeeBps: (...args: unknown[]) => fetchFastTransferFeeBps(...args),
  pollForAttestation: (...args: unknown[]) => pollForAttestation(...args),
}));

const { transfer, completeMint } = await import("../src/transfer.js");

const arcSigner = { walletClient: {} } as any;
const stellarSigner = { publicKey: "GABCD" } as any;

beforeEach(() => {
  vi.clearAllMocks();
  burnUsdcOnArc.mockResolvedValue("0xburnhash");
  burnUsdcOnArcWithStellarForward.mockResolvedValue("0xburnhookhash");
  burnUsdcOnStellar.mockResolvedValue("stellarburnhash");
  pollForAttestation.mockResolvedValue({
    message: "0xmessage",
    attestation: "0xattestation",
  });
  receiveMessageOnArc.mockResolvedValue("0xminthash");
  mintAndForwardOnStellar.mockResolvedValue("stellarminthash");
});

describe("transfer (Arc -> Stellar)", () => {
  it("routes the burn through depositForBurnWithHook and mints via CctpForwarder", async () => {
    const result = await transfer({
      from: "arc",
      to: "stellar",
      amount: "10",
      recipient: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
      speed: "standard",
      signer: arcSigner,
      options: { destinationSigner: stellarSigner },
    });

    expect(burnUsdcOnArcWithStellarForward).toHaveBeenCalledTimes(1);
    expect(burnUsdcOnArc).not.toHaveBeenCalled();
    expect(mintAndForwardOnStellar).toHaveBeenCalledTimes(1);
    expect(receiveMessageOnArc).not.toHaveBeenCalled();

    expect(result.status).toBe("success");
    expect(result.burnTxHash).toBe("0xburnhookhash");
    expect(result.mintTxHash).toBe("stellarminthash");
    expect(result.attestationHash).toBe("0xattestation");
  });

  it("returns pending status with no mint tx hash when no destinationSigner is given", async () => {
    const result = await transfer({
      from: "arc",
      to: "stellar",
      amount: "10",
      recipient: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
      speed: "standard",
      signer: arcSigner,
    });

    expect(result.status).toBe("pending");
    expect(result.mintTxHash).toBe("");
    expect(mintAndForwardOnStellar).not.toHaveBeenCalled();
  });

  it("can be finished later via completeMint using the returned burnTxHash", async () => {
    const pending = await transfer({
      from: "arc",
      to: "stellar",
      amount: "10",
      recipient: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
      speed: "standard",
      signer: arcSigner,
    });

    const completed = await completeMint({
      from: "arc",
      to: "stellar",
      burnTxHash: pending.burnTxHash,
      signer: stellarSigner,
    });

    expect(mintAndForwardOnStellar).toHaveBeenCalledTimes(1);
    expect(completed.mintTxHash).toBe("stellarminthash");
    expect(completed.attestationHash).toBe("0xattestation");
  });
});

describe("transfer (Stellar -> Arc)", () => {
  it("burns via TokenMessengerMinter and mints via receiveMessage", async () => {
    const result = await transfer({
      from: "stellar",
      to: "arc",
      amount: "25",
      recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      speed: "standard",
      signer: stellarSigner,
      options: { destinationSigner: arcSigner },
    });

    expect(burnUsdcOnStellar).toHaveBeenCalledTimes(1);
    expect(receiveMessageOnArc).toHaveBeenCalledTimes(1);
    expect(result.burnTxHash).toBe("stellarburnhash");
    expect(result.mintTxHash).toBe("0xminthash");
  });
});

describe("transfer fast/standard fee handling", () => {
  it("falls back to standard when the quoted fast fee exceeds maxFee", async () => {
    fetchFastTransferFeeBps.mockResolvedValue(100); // 1% - exceeds maxFee below

    const result = await transfer({
      from: "arc",
      to: "stellar",
      amount: "10",
      recipient: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
      speed: "fast",
      signer: arcSigner,
      options: { maxFee: "0.01", destinationSigner: stellarSigner },
    });

    expect(result.transferMode).toBe("standard");
    expect(result.fee).toBe("0");
  });

  it("uses fast mode and reports the quoted fee when within maxFee", async () => {
    fetchFastTransferFeeBps.mockResolvedValue(1); // 0.01%

    const result = await transfer({
      from: "arc",
      to: "stellar",
      amount: "1000",
      recipient: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
      speed: "fast",
      signer: arcSigner,
      options: { maxFee: "1", destinationSigner: stellarSigner },
    });

    expect(result.transferMode).toBe("fast");
    expect(result.fee).toBe("0.1");
  });
});
