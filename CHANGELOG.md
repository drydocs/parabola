# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial `transfer()` and `estimateFee()` exports for moving USDC between Arc testnet and Stellar testnet via CCTP V2.
- `completeMint()` for finishing a transfer left `"pending"` when no `destinationSigner` was provided.
- Stellar address encoding, `CctpForwarder` routing, and 6/7-decimal precision conversion utilities.
