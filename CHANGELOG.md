# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial `transfer()` and `estimateFee()` exports for moving USDC between Arc testnet and Stellar testnet via CCTP V2.
- `completeMint()` for finishing a transfer left `"pending"` when no `destinationSigner` was provided.
- Stellar address encoding, `CctpForwarder` routing, and 6/7-decimal precision conversion utilities.
- `TransferError`, carrying `burnTxHash` (and `attestationHash` when available), for any failure that happens after the source-chain burn has already succeeded.
- `SubmissionTimeoutError`, carrying a transaction hash, for a broadcast transaction whose confirmation timed out before its outcome was known. Both are exported from the package root.
- `tests/amount.test.ts`, covering the Arc/Stellar decimal-precision wiring in `src/utils/amount.ts` directly; previously only the lower-level parsing primitives it wraps were tested.

### Fixed

Found by running the wallet-connected demo app against live testnet in both directions, repeatedly, across many real transfers; none of these were catchable by mocked unit tests either:

- `transfer()` only ever returned `burnTxHash` on success. Any failure after the burn (an attestation-polling timeout, a mint-step error, a burn confirmation that timed out without a definite outcome) threw a bare `Error` and the hash was gone for good, with no way to recover via `completeMint()`. Now rethrown as `TransferError`/`SubmissionTimeoutError` carrying the hash.
- Iris's fees endpoint (`burn/USDC/fees/{source}/{destination}`) returns a bare array, not `{ data: [...] }` as the code assumed. Every fast-transfer fee lookup threw `TypeError: can't access property 'find', body.data is undefined`.
- `approveUsdcOnStellar` confirming (`SUCCESS` status) didn't guarantee a subsequent `deposit_for_burn` call would see that approval: an RPC read-after-write race between the two calls could produce a stale allowance read (`not enough allowance to spend`) or a stale account sequence number (`txBadSeq`), even though the approval had genuinely landed. `approveUsdcOnStellar` now actively polls the real on-chain allowance before returning, and `burnUsdcOnStellar` retries once more on either of those two specific transient errors.
- Stellar's transaction validity window (`.setTimeout(60)`) and confirmation-wait timeout were both tuned for machine-speed signing. Once a human is in the loop approving a wallet popup (Freighter), 60 seconds was routinely too short, failing with `txTooLate` or a confirmation timeout on transactions that had nothing wrong with them. Bumped to 180s and 120s respectively.

### Changed

- **Breaking:** minimum supported Node.js bumped `>=18` -> `>=20`. The `@stellar/stellar-sdk@16.2.0` upgrade pulled in a `@noble/ed25519` version that requires `globalThis.crypto`, which Node 18 doesn't expose by default (this surfaced as CI failures on the Node 18 matrix job, not a theoretical concern). Node 18 has also been EOL since April 2025.
- Removed `convertAmountBetweenChains`, a thin wrapper around already-exported functions that had no callers anywhere in the SDK, the demo app, or the tests.
