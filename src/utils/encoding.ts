import { StrKey } from "@stellar/stellar-sdk";
import { toHex, pad } from "viem";

/**
 * Translates a Stellar address (G... account or C... contract strkey) into the
 * bytes32 hex format CCTP expects as a mint recipient / hook payload field.
 *
 * Circle's CCTP V2 message format encodes non-EVM recipients as 32-byte values.
 * For Stellar this is the raw ed25519 public key (G...) or contract id (C...)
 * left-padded to 32 bytes, matching StrKey.decodeContract / decodeEd25519PublicKey.
 */
export function stellarAddressToBytes32(address: string): `0x${string}` {
  let raw: Buffer;
  if (StrKey.isValidEd25519PublicKey(address)) {
    raw = StrKey.decodeEd25519PublicKey(address);
  } else if (StrKey.isValidContract(address)) {
    raw = StrKey.decodeContract(address);
  } else {
    throw new Error(`Invalid Stellar address: ${address}`);
  }
  if (raw.length !== 32) {
    throw new Error(`Expected 32-byte Stellar key, got ${raw.length} bytes`);
  }
  return pad(toHex(raw), { size: 32 });
}

/** Inverse of stellarAddressToBytes32 for ed25519 public keys (G... accounts). */
export function bytes32ToStellarAddress(bytes32: `0x${string}`): string {
  const hex = bytes32.startsWith("0x") ? bytes32.slice(2) : bytes32;
  const raw = Buffer.from(hex, "hex");
  return StrKey.encodeEd25519PublicKey(raw);
}

/**
 * Encodes a Stellar strkey recipient into the CCTP depositForBurnWithHook payload format
 * used to route inbound Stellar transfers through CctpForwarder: a 32-byte header of
 * (28 bytes zero padding + uint32 version) followed by the uint32 length-prefixed UTF-8 strkey.
 */
export function encodeStellarForwardHook(recipientStrkey: string): `0x${string}` {
  const version = 1;
  const strkeyBytes = Buffer.from(recipientStrkey, "utf8");

  const header = Buffer.alloc(32);
  header.writeUInt32BE(version, 28);

  const lengthPrefix = Buffer.alloc(4);
  lengthPrefix.writeUInt32BE(strkeyBytes.length, 0);

  return toHex(Buffer.concat([header, lengthPrefix, strkeyBytes]));
}

/**
 * Converts a human-readable USDC amount string (e.g. "10.50") into raw subunits
 * for the given number of decimals, as a bigint. Avoids floating point error by
 * operating on the string directly.
 */
export function parseUsdcAmount(amount: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error(`Invalid USDC amount: ${amount}`);
  }
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) {
    throw new Error(
      `Amount ${amount} has more precision than ${decimals} decimals supports`,
    );
  }
  const paddedFraction = fraction.padEnd(decimals, "0");
  return BigInt(whole + paddedFraction);
}

/** Converts raw USDC subunits back into a human-readable decimal string. */
export function formatUsdcAmount(raw: bigint, decimals: number): string {
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const str = abs.toString().padStart(decimals + 1, "0");
  const whole = str.slice(0, str.length - decimals);
  const fraction = str.slice(str.length - decimals).replace(/0+$/, "");
  const formatted = fraction.length > 0 ? `${whole}.${fraction}` : whole;
  return negative ? `-${formatted}` : formatted;
}

/** Pads a 20-byte EVM address (Arc) out to the 32-byte recipient format CCTP messages use. */
export function evmAddressToBytes32(address: `0x${string}`): `0x${string}` {
  return pad(address, { size: 32 });
}

/**
 * Converts a raw amount from one decimal precision to another, e.g. Stellar's
 * 7-decimal USDC to Arc's 6-decimal USDC. Truncates any excess precision.
 */
export function convertPrecision(
  raw: bigint,
  fromDecimals: number,
  toDecimals: number,
): bigint {
  if (fromDecimals === toDecimals) return raw;
  if (toDecimals > fromDecimals) {
    return raw * 10n ** BigInt(toDecimals - fromDecimals);
  }
  return raw / 10n ** BigInt(fromDecimals - toDecimals);
}
