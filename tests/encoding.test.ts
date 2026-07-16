import { describe, it, expect } from "vitest";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import {
  stellarAddressToBytes32,
  bytes32ToStellarAddress,
  encodeStellarForwardHook,
  parseUsdcAmount,
  formatUsdcAmount,
  convertPrecision,
} from "../src/utils/encoding.js";

describe("stellarAddressToBytes32 / bytes32ToStellarAddress", () => {
  it("round-trips a Stellar ed25519 public key through bytes32", () => {
    const keypair = Keypair.random();
    const address = keypair.publicKey();

    const bytes32 = stellarAddressToBytes32(address);
    expect(bytes32).toMatch(/^0x[0-9a-f]{64}$/);

    const roundTripped = bytes32ToStellarAddress(bytes32);
    expect(roundTripped).toBe(address);
  });

  it("encodes a Stellar contract (CctpForwarder) strkey without throwing", () => {
    const raw = Buffer.alloc(32, 7);
    const contractAddress = StrKey.encodeContract(raw);

    const bytes32 = stellarAddressToBytes32(contractAddress);
    expect(bytes32).toBe(`0x${raw.toString("hex")}`);
  });

  it("throws on an invalid Stellar address", () => {
    expect(() => stellarAddressToBytes32("not-a-stellar-address")).toThrow(
      /Invalid Stellar address/,
    );
  });
});

describe("encodeStellarForwardHook", () => {
  it("encodes a G... recipient into the CctpForwarder hook payload format", () => {
    const keypair = Keypair.random();
    const recipient = keypair.publicKey();

    const hook = encodeStellarForwardHook(recipient);
    const bytes = Buffer.from(hook.slice(2), "hex");

    // 32-byte header + 4-byte length prefix + strkey utf8 bytes
    expect(bytes.length).toBe(32 + 4 + recipient.length);
    expect(bytes.readUInt32BE(28)).toBe(1); // version
    expect(bytes.readUInt32BE(32)).toBe(recipient.length);
    expect(bytes.subarray(36).toString("utf8")).toBe(recipient);
  });
});

describe("parseUsdcAmount / formatUsdcAmount", () => {
  it("parses whole amounts", () => {
    expect(parseUsdcAmount("10", 6)).toBe(10_000_000n);
  });

  it("parses fractional amounts at Arc's 6 decimals", () => {
    expect(parseUsdcAmount("10.50", 6)).toBe(10_500_000n);
  });

  it("parses fractional amounts at Stellar's 7 decimals", () => {
    expect(parseUsdcAmount("10.5000001", 7)).toBe(105_000_001n);
  });

  it("rejects excess precision", () => {
    expect(() => parseUsdcAmount("10.1234567", 6)).toThrow(/more precision/);
  });

  it("rejects malformed amounts", () => {
    expect(() => parseUsdcAmount("abc", 6)).toThrow(/Invalid USDC amount/);
    expect(() => parseUsdcAmount("-1", 6)).toThrow(/Invalid USDC amount/);
  });

  it("formats raw subunits back into human-readable amounts", () => {
    expect(formatUsdcAmount(10_500_000n, 6)).toBe("10.5");
    expect(formatUsdcAmount(10_000_000n, 6)).toBe("10");
    expect(formatUsdcAmount(105_000_001n, 7)).toBe("10.5000001");
  });

  it("round-trips parse -> format", () => {
    const amounts = ["0.000001", "1234.56", "1", "999999.999999"];
    for (const amount of amounts) {
      expect(formatUsdcAmount(parseUsdcAmount(amount, 6), 6)).toBe(amount);
    }
  });
});

describe("convertPrecision", () => {
  it("converts Stellar's 7-decimal USDC down to Arc's 6-decimal USDC, truncating excess precision", () => {
    // 10.5000001 on Stellar (7 decimals) -> 10.500000 on Arc (6 decimals), truncated
    expect(convertPrecision(105_000_001n, 7, 6)).toBe(10_500_000n);
  });

  it("converts Arc's 6-decimal USDC up to Stellar's 7-decimal USDC", () => {
    expect(convertPrecision(10_500_000n, 6, 7)).toBe(105_000_000n);
  });

  it("is a no-op when decimals match", () => {
    expect(convertPrecision(123n, 6, 6)).toBe(123n);
  });
});
