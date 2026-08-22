import * as StellarSdk from "@stellar/stellar-sdk";
import freighterApi from "@stellar/freighter-api";
import { WalletType, signTransactionWithWallet } from "./wallets";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
const FRIENDBOT_URL = "https://friendbot.stellar.org";

export const server = new StellarSdk.rpc.Server(RPC_URL);

// Fallback dummy account for simulating read-only calls
const DUMMY_PUBLIC_KEY = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYORTMB35THQI2TTOHS";

/* ────────── Wallet & Friendbot Helpers ────────── */

export async function isFreighterConnected(): Promise<boolean> {
  try {
    const { isConnected } = await freighterApi.isConnected();
    return !!isConnected;
  } catch {
    return false;
  }
}

export async function connectFreighter(): Promise<string> {
  try {
    const { isAllowed } = await freighterApi.isAllowed();
    if (!isAllowed) {
      await freighterApi.requestAccess();
    }
    const { address } = await freighterApi.getAddress();
    if (!address) {
      throw new Error("No address returned from Freighter");
    }
    return address;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("reject") || err.message.includes("denied")) {
        throw new Error("User rejected the connection request");
      }
    }
    throw new Error("Wallet not found. Please install Freighter or try another wallet provider.");
  }
}

export async function signTransactionWithFreighter(
  xdr: string,
): Promise<string> {
  try {
    const result = await freighterApi.signTransaction(xdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    return result.signedTxXdr;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("reject") || err.message.includes("denied")) {
        throw new Error("User rejected the transaction");
      }
    }
    throw new Error("Failed to sign transaction with Freighter");
  }
}

export async function fundTestnetAccount(publicKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
    return response.ok;
  } catch (err) {
    console.error("Friendbot funding error:", err);
    return false;
  }
}

/* ────────── Demo / Dev Account Mode ────────── */

const DEMO_SECRET_STORAGE_KEY = "soroban_demo_account_secret";

export function getOrCreateDemoAccount(): { publicKey: string; secretKey: string } {
  if (typeof window === "undefined") {
    const kp = StellarSdk.Keypair.random();
    return { publicKey: kp.publicKey(), secretKey: kp.secret() };
  }
  let secret = localStorage.getItem(DEMO_SECRET_STORAGE_KEY);
  if (!secret) {
    const kp = StellarSdk.Keypair.random();
    secret = kp.secret();
    localStorage.setItem(DEMO_SECRET_STORAGE_KEY, secret);
  }
  const kp = StellarSdk.Keypair.fromSecret(secret);
  return { publicKey: kp.publicKey(), secretKey: kp.secret() };
}

/* ────────── Transaction Builder ────────── */

export async function buildAndSendTx(
  contractAddress: string,
  method: string,
  params: StellarSdk.xdr.ScVal[],
  sourceAddress: string,
  customSigner?: (txXdr: string) => Promise<string>,
): Promise<{ hash: string; success: boolean }> {
  try {
    let sourceAccount: StellarSdk.Account;
    try {
      sourceAccount = await server.getAccount(sourceAddress);
    } catch {
      // Account may not exist yet on ledger, fallback to sequence 0
      sourceAccount = new StellarSdk.Account(sourceAddress, "0");
    }

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: "100000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        new StellarSdk.Contract(contractAddress).call(method, ...params),
      )
      .setTimeout(StellarSdk.TimeoutInfinite)
      .build();

    const simulated = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${JSON.stringify(simulated.error)}`);
    }

    const assembled = StellarSdk.rpc.assembleTransaction(tx, simulated).build();
    let signedXdr: string;

    if (customSigner) {
      signedXdr = await customSigner(assembled.toXDR());
    } else {
      signedXdr = await signTransactionWithFreighter(assembled.toXDR());
    }

    const signedTx = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK_PASSPHRASE,
    );
    const sendResult = await server.sendTransaction(signedTx);
    return { hash: sendResult.hash, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("insufficient")) {
      throw new Error("Insufficient balance in account");
    }
    throw err;
  }
}

/* ────────── ScVal Encoders ────────── */

export function toScValString(v: string): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(v, { type: "string" });
}

export function toScValU32(v: number): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(v, { type: "u32" });
}

export function toScValI128(v: bigint | number | string): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(v.toString(), { type: "i128" });
}

export function toScValAddress(v: string): StellarSdk.xdr.ScVal {
  return new StellarSdk.Address(v).toScVal();
}

export function toScValBool(v: boolean): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(v);
}

export function toScValSymbol(v: string): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(v, { type: "symbol" });
}

export function toScValU64(v: bigint | number | string): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(v.toString(), { type: "u64" });
}

export function toScValVecAddresses(addrs: string[]): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(addrs.map((a) => new StellarSdk.Address(a)));
}

/* ────────── Read / Simulation Helpers ────────── */

export async function readContract(
  contractAddress: string,
  method: string,
  params: StellarSdk.xdr.ScVal[] = [],
  source?: string,
): Promise<StellarSdk.xdr.ScVal> {
  const callerAddress = source || DUMMY_PUBLIC_KEY;
  let account: StellarSdk.Account;
  try {
    account = await server.getAccount(callerAddress);
  } catch {
    account = new StellarSdk.Account(callerAddress, "0");
  }

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      new StellarSdk.Contract(contractAddress).call(method, ...params),
    )
    .setTimeout(StellarSdk.TimeoutInfinite)
    .build();

  const result = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(result)) {
    throw new Error(`Read failed: ${JSON.stringify(result.error)}`);
  }
  const retval = result.result?.retval;
  if (!retval) throw new Error("No return value from simulation");
  return retval;
}

export { StellarSdk, RPC_URL, NETWORK_PASSPHRASE };
