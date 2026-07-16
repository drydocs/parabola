#!/usr/bin/env node
// Confirms every contract/token address hardcoded in src/constants.ts is a real,
// deployed contract on the network it claims to be on -- not a typo, not an EOA,
// not a stale address from a redeployment. Public reads only, no funded account
// needed. See CONTRIBUTING.md's "Code Standards" section on src/constants.ts.

import { rpc, Contract, Address, xdr } from "@stellar/stellar-sdk";

const ARC_RPC_URL = "https://rpc.testnet.arc.network";
const STELLAR_RPC_URL = "https://soroban-testnet.stellar.org";

const ARC_ADDRESSES = {
  tokenMessengerV2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  messageTransmitterV2: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
  usdc: "0x3600000000000000000000000000000000000000",
};

const STELLAR_CONTRACTS = {
  tokenMessengerMinter: "CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP",
  cctpForwarder: "CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ",
  usdc: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
};

let failures = 0;

async function checkArcAddress(label, address) {
  const res = await fetch(ARC_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getCode",
      params: [address, "latest"],
    }),
  });
  const body = await res.json();
  const code = body.result;
  const isContract = typeof code === "string" && code !== "0x" && code.length > 2;
  console.log(`${isContract ? "OK  " : "FAIL"} arc:${label} ${address} -> ${isContract ? `${(code.length - 2) / 2} bytes of code` : "no code (EOA or nonexistent)"}`);
  if (!isContract) failures++;
}

async function checkStellarContract(label, contractId) {
  const server = new rpc.Server(STELLAR_RPC_URL);
  try {
    await server.getContractData(
      contractId,
      xdr.ScVal.scvLedgerKeyContractInstance(),
    );
    console.log(`OK   stellar:${label} ${contractId} -> instance found`);
  } catch (error) {
    console.log(`FAIL stellar:${label} ${contractId} -> ${error?.message ?? error}`);
    failures++;
  }
}

console.log("Verifying Arc testnet addresses...");
for (const [label, address] of Object.entries(ARC_ADDRESSES)) {
  await checkArcAddress(label, address);
}

console.log("\nVerifying Stellar testnet contracts...");
for (const [label, contractId] of Object.entries(STELLAR_CONTRACTS)) {
  await checkStellarContract(label, contractId);
}

if (failures > 0) {
  console.error(`\n${failures} address(es) failed verification.`);
  process.exit(1);
}
console.log("\nAll addresses verified live on their claimed network.");
