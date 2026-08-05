# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial `transfer()` and `estimateFee()` exports for moving USDC between Arc testnet and Stellar testnet via CCTP V2.
- `completeMint()` for finishing a transfer left `"pending"` when no `destinationSigner` was provided.
- Stellar address encoding, `CctpForwarder` routing, and 6/7-decimal precision conversion utilities.

### Fixed

Found by running `scripts/testnet-smoke.mjs` against live testnet for the first time -- none of these were catchable by mocked unit tests:

- Arc burns never approved `TokenMessengerV2` to spend USDC first; every burn reverted with `ERC20: transfer amount exceeds allowance`.
- Stellar burns never approved `TokenMessengerMinter` to spend USDC first (SEP-41 tokens use the same approve/transfer_from pattern as ERC20); every burn reverted with "not enough allowance to spend".
- `deposit_for_burn`'s Stellar argument order was wrong -- `caller` must be the first argument, not the last. Confirmed against the deployed contract's real interface via `stellar contract info interface`, not docs.
- `encodeStellarForwardHook`'s byte layout was wrong -- the hook version and strkey length both live inside the same 32-byte header (offsets 24-27 and 28-31), with the strkey starting immediately at offset 32. The previous implementation added a spurious extra 4-byte length field, misaligning everything after it.
- `@stellar/stellar-sdk` bumped `^13.0.0` -> `^16.2.0`: the pinned version couldn't decode a transaction-result XDR variant the live testnet RPC returns (`Bad union switch: 4`), meaning `completeMint`/`transfer` could burn funds on the source chain and then fail to even report the outcome.
