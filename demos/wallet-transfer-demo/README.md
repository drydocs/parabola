# wallet-transfer-demo

A minimal browser app demonstrating Parabola's non-custodial integration pattern: a visitor
connects their own MetaMask (Arc) and Freighter (Stellar) wallets and triggers a real transfer.
Nothing here holds a private key; every signature happens in the wallet extension.

This is also meant to be copied. `src/lib/` and `src/hooks/` are written to be liftable into
your own app with minimal changes. See [`../../INTEGRATION.md`](../../INTEGRATION.md) for the
two integration patterns this app illustrates (this one, plus the backend-held-key alternative).

## Prerequisites

- [MetaMask](https://metamask.io) (or another injected EVM wallet) browser extension
- [Freighter](https://freighter.app) browser extension
- Funded Arc testnet and Stellar testnet accounts, get both via [faucet.circle.com](https://faucet.circle.com)

## Running it

This app depends on `@drydocs/parabola` via a pnpm workspace link (the package isn't published
yet), which means the SDK must be built once before the demo can resolve real types/JS:

```bash
# from the repo root
pnpm install
pnpm build       # builds @drydocs/parabola's dist/, required before the demo will run
pnpm dev:wallet-transfer-demo     # starts this app
```

Then open the printed local URL, connect both wallets, and try a transfer. Use small amounts:
this runs against live testnet, not a simulator.

## What it demonstrates

- Building an `ArcSigner` from an injected EVM wallet (`src/lib/arcWallet.ts`): just a viem
  `WalletClient`, nothing Parabola-specific.
- Building a `StellarSigner` from Freighter (`src/lib/stellarWallet.ts`) via the
  `signTransaction` callback, rather than a raw `Keypair`.
- The single-call path: both wallets connected, `options.destinationSigner` attached, one
  `transfer()` call goes all the way to `status: "success"`.
- The two-step path (uncheck "Complete the mint automatically"): `transfer()` returns
  `status: "pending"`, and a "Complete mint" button calls `completeMint()` separately once the
  destination wallet is connected.
- Honest error handling: if a transfer throws, the banner never claims nothing happened, since
  Parabola's `transfer()` can lose the burn transaction hash if attestation polling times out
  after the burn already succeeded on-chain. See `src/hooks/useTransfer.ts` and
  `INTEGRATION.md`'s "Known rough edge" section.

## What's not verified here

Nobody has driven this app through a real wallet-approval flow in an automated way. That needs
a real browser with both extensions installed and unlocked, and funded testnet accounts. Typecheck
and build are verified; an actual end-to-end transfer through this UI is not, the same honest
limitation `../../scripts/testnet-smoke.mjs` documents for itself.
