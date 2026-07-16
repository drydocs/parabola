import {
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Address,
  nativeToScVal,
  rpc,
} from "@stellar/stellar-sdk";
import { STELLAR_TESTNET } from "../constants.js";
import type { StellarSigner } from "../types.js";

function getServer(): rpc.Server {
  return new rpc.Server(STELLAR_TESTNET.sorobanRpcUrl);
}

async function signTransaction(
  xdr: string,
  signer: StellarSigner,
): Promise<string> {
  if (signer.signTransaction) {
    return signer.signTransaction(xdr, STELLAR_TESTNET.networkPassphrase);
  }
  if (signer.keypair) {
    const tx = TransactionBuilder.fromXDR(xdr, STELLAR_TESTNET.networkPassphrase);
    tx.sign(signer.keypair);
    return tx.toXDR();
  }
  throw new Error("StellarSigner must provide either a keypair or a signTransaction function");
}

/**
 * Simulates, prepares, signs, and submits a Soroban contract invocation, then
 * polls the RPC server until the transaction is confirmed. Returns the tx hash.
 */
async function invokeContract(
  contractId: string,
  method: string,
  args: ReturnType<typeof nativeToScVal>[],
  signer: StellarSigner,
): Promise<string> {
  const server = getServer();
  const account = await server.getAccount(signer.publicKey);
  const contract = new Contract(contractId);

  const builtTx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_TESTNET.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(builtTx);
  const signedXdr = await signTransaction(prepared.toXDR(), signer);
  const signedTx = TransactionBuilder.fromXDR(signedXdr, STELLAR_TESTNET.networkPassphrase);

  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === "ERROR") {
    throw new Error(`Stellar transaction submission failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  return pollTransactionStatus(server, sendResult.hash);
}

async function pollTransactionStatus(server: rpc.Server, hash: string): Promise<string> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const result = await server.getTransaction(hash);
    if (result.status === "SUCCESS") return hash;
    if (result.status === "FAILED") {
      throw new Error(`Stellar transaction ${hash} failed`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Timed out waiting for Stellar transaction ${hash} to confirm`);
}

/**
 * Calls deposit_for_burn on Stellar's TokenMessengerMinter, burning USDC to be
 * minted on the destination CCTP domain.
 */
export async function burnUsdcOnStellar(params: {
  amountRaw: bigint;
  destinationDomain: number;
  mintRecipientBytes32: `0x${string}`;
  maxFeeRaw: bigint;
  minFinalityThreshold: number;
  signer: StellarSigner;
}): Promise<string> {
  const recipientBytes = Buffer.from(params.mintRecipientBytes32.slice(2), "hex");

  const args = [
    nativeToScVal(params.amountRaw, { type: "i128" }),
    nativeToScVal(params.destinationDomain, { type: "u32" }),
    nativeToScVal(recipientBytes, { type: "bytes" }),
    Address.fromString(STELLAR_TESTNET.usdc).toScVal(),
    nativeToScVal(Buffer.alloc(32), { type: "bytes" }), // destinationCaller: unrestricted
    nativeToScVal(params.maxFeeRaw, { type: "i128" }),
    nativeToScVal(params.minFinalityThreshold, { type: "u32" }),
    Address.fromString(params.signer.publicKey).toScVal(),
  ];

  return invokeContract(STELLAR_TESTNET.tokenMessengerMinter, "deposit_for_burn", args, params.signer);
}

/**
 * Calls mint_and_forward on Stellar's CctpForwarder contract. This is the only
 * supported way to land an inbound CCTP transfer on Stellar: it verifies the
 * message and attestation, mints USDC to the forwarder, then forwards it to
 * the recipient strkey encoded in the burn message's hook data.
 */
export async function mintAndForwardOnStellar(params: {
  message: `0x${string}`;
  attestation: `0x${string}`;
  signer: StellarSigner;
}): Promise<string> {
  const args = [
    nativeToScVal(Buffer.from(params.message.slice(2), "hex"), { type: "bytes" }),
    nativeToScVal(Buffer.from(params.attestation.slice(2), "hex"), { type: "bytes" }),
  ];

  return invokeContract(STELLAR_TESTNET.cctpForwarder, "mint_and_forward", args, params.signer);
}
