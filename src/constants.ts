// Values sourced from Circle CCTP docs (developers.circle.com/cctp) and Arc docs (docs.arc.io) as of 2026-07.
// Testnet only: Arc mainnet CCTP addresses are not yet published.

export const ARC_DOMAIN = 26;
export const STELLAR_DOMAIN = 27;

export const ARC_TESTNET = {
  chainId: 5042002,
  rpcUrl: "https://rpc.testnet.arc.network",
  wsUrl: "wss://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  messageTransmitterV2: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  usdc: "0x3600000000000000000000000000000000000000",
  usdcDecimals: 6,
} as const;

export const STELLAR_TESTNET = {
  sorobanRpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  tokenMessengerMinter: "CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP",
  cctpForwarder: "CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ",
  usdc: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  usdcDecimals: 7,
} as const;

export const STELLAR_MAINNET_CONTRACTS = {
  tokenMessengerMinter: "CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL",
  cctpForwarder: "CBZL2IH7F6BIDAA3WBNXYKIXSATJGMSW7K5P5MJ6STX5RXN47TZJDF5T",
} as const;

export const IRIS_MAINNET_BASE_URL = "https://iris-api.circle.com/v2/";
export const IRIS_SANDBOX_BASE_URL = "https://iris-api-sandbox.circle.com/v2/";

// Per Circle's CCTP V2 technical guide: values are normalized, below 1000 -> Fast (1000), above -> Standard (2000).
export const FINALITY_THRESHOLD_STANDARD = 2000;
export const FINALITY_THRESHOLD_FAST = 1000;

export const DEFAULT_POLL_INTERVAL_MS = 3000;
export const DEFAULT_POLL_TIMEOUT_MS = 300_000;
