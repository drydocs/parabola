import { describe, it, expect, vi, afterEach } from "vitest";
import { Account, Contract, Keypair, StrKey, rpc } from "@stellar/stellar-sdk";
import { burnUsdcOnStellar, mintAndForwardOnStellar } from "../src/chains/stellar.js";
import { STELLAR_TESTNET } from "../src/constants.js";
import { stellarAddressToBytes32 } from "../src/utils/encoding.js";

function contractIdOf(contract: Contract): string {
  return StrKey.encodeContract((contract as unknown as { _id: Buffer })._id);
}

const FAKE_HASH = "a".repeat(64);

function mockHappyPathRpc() {
  const signerKeypair = Keypair.random();

  vi.spyOn(rpc.Server.prototype, "getAccount").mockResolvedValue(
    new Account(signerKeypair.publicKey(), "1"),
  );
  vi.spyOn(rpc.Server.prototype, "prepareTransaction").mockImplementation(
    async (tx) => tx as any,
  );
  vi.spyOn(rpc.Server.prototype, "sendTransaction").mockResolvedValue({
    status: "PENDING",
    hash: FAKE_HASH,
  } as any);
  vi.spyOn(rpc.Server.prototype, "getTransaction").mockResolvedValue({
    status: "SUCCESS",
  } as any);

  return signerKeypair;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("burnUsdcOnStellar (TokenMessengerMinter.deposit_for_burn)", () => {
  it("invokes TokenMessengerMinter with deposit_for_burn and returns the tx hash", async () => {
    const signerKeypair = mockHappyPathRpc();
    const callSpy = vi.spyOn(Contract.prototype, "call");

    const recipient = Keypair.random().publicKey();
    const hash = await burnUsdcOnStellar({
      amountRaw: 10_000_000n,
      destinationDomain: 26,
      mintRecipientBytes32: stellarAddressToBytes32(recipient),
      maxFeeRaw: 1000n,
      minFinalityThreshold: 2000,
      signer: { publicKey: signerKeypair.publicKey(), keypair: signerKeypair },
    });

    expect(hash).toBe(FAKE_HASH);
    expect(callSpy).toHaveBeenCalledTimes(1);
    expect(contractIdOf(callSpy.mock.instances[0] as unknown as Contract)).toBe(STELLAR_TESTNET.tokenMessengerMinter);
    expect(callSpy.mock.calls[0]?.[0]).toBe("deposit_for_burn");
  });
});

describe("mintAndForwardOnStellar (CctpForwarder.mint_and_forward)", () => {
  it("routes inbound transfers through the CctpForwarder contract, not a direct mint", async () => {
    const signerKeypair = mockHappyPathRpc();
    const callSpy = vi.spyOn(Contract.prototype, "call");

    const hash = await mintAndForwardOnStellar({
      message: `0x${"11".repeat(32)}`,
      attestation: `0x${"22".repeat(65)}`,
      signer: { publicKey: signerKeypair.publicKey(), keypair: signerKeypair },
    });

    expect(hash).toBe(FAKE_HASH);
    expect(callSpy).toHaveBeenCalledTimes(1);
    expect(contractIdOf(callSpy.mock.instances[0] as unknown as Contract)).toBe(STELLAR_TESTNET.cctpForwarder);
    expect(callSpy.mock.calls[0]?.[0]).toBe("mint_and_forward");
  });
});
