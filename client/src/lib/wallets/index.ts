import freighterApi from "@stellar/freighter-api";
import albedo from "@albedo-link/intent";
import * as StellarSdk from "@stellar/stellar-sdk";
import { WalletType, WalletProviderInfo, WalletConnectionResult } from "./types";

export * from "./types";

export const WALLET_PROVIDERS: WalletProviderInfo[] = [
  {
    id: "freighter",
    name: "Freighter",
    shortDesc: "Official Stellar browser extension wallet",
    category: "extension",
    iconName: "freighter",
    badge: "Official",
    installUrl: "https://www.freighter.app/",
    isWebReady: false,
    recommended: true,
  },
  {
    id: "albedo",
    name: "Albedo",
    shortDesc: "Web & mobile authorization bridge (no extension needed)",
    category: "web",
    iconName: "albedo",
    badge: "Universal Web",
    installUrl: "https://albedo.link/",
    isWebReady: true,
    recommended: true,
  },
  {
    id: "xbull",
    name: "xBull Wallet",
    shortDesc: "Multi-platform Stellar & Soroban smart wallet",
    category: "extension",
    iconName: "xbull",
    badge: "Soroban Ready",
    installUrl: "https://xbull.app/",
    isWebReady: true,
  },
  {
    id: "rabet",
    name: "Rabet",
    shortDesc: "Fast & lightweight Stellar browser extension",
    category: "extension",
    iconName: "rabet",
    badge: "Extension",
    installUrl: "https://rabet.io/",
    isWebReady: false,
  },
  {
    id: "hana",
    name: "Hana Wallet",
    shortDesc: "Multi-chain wallet with full Stellar support",
    category: "extension",
    iconName: "hana",
    badge: "Multi-chain",
    installUrl: "https://hanawallet.io/",
    isWebReady: false,
  },
  {
    id: "secret_key",
    name: "Import Secret Key",
    shortDesc: "Import any Testnet secret key (S...) directly",
    category: "dev",
    iconName: "key",
    badge: "Developer",
    isWebReady: true,
  },
  {
    id: "demo",
    name: "Instant Demo Account",
    shortDesc: "Zero-setup local keypair with Friendbot faucet",
    category: "dev",
    iconName: "sparkles",
    badge: "Instant Test",
    isWebReady: true,
  },
];

interface CustomWindow extends Window {
  xBullSDK?: {
    getPublicKey?: () => Promise<string>;
    signXDR?: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string | { signedTxXdr?: string; xdr?: string }>;
  };
  xbull?: {
    getPublicKey?: () => Promise<string>;
    signXDR?: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string | { signedTxXdr?: string; xdr?: string }>;
  };
  rabet?: {
    connect?: () => Promise<{ publicKey?: string; address?: string } | string>;
    sign?: (xdr: string, network: string) => Promise<{ xdr?: string } | string>;
  };
  hanaWallet?: {
    stellar?: {
      getAccount?: () => Promise<{ address?: string } | string[] | string>;
      signTransaction?: (xdr: string) => Promise<string | { signedTxXdr?: string; xdr?: string }>;
    };
  };
  hana?: {
    stellar?: {
      getAccount?: () => Promise<{ address?: string } | string[] | string>;
      signTransaction?: (xdr: string) => Promise<string | { signedTxXdr?: string; xdr?: string }>;
    };
  };
}

/**
 * Checks if a specific wallet extension is available in the browser window
 */
export async function isWalletAvailable(type: WalletType): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const win = window as unknown as CustomWindow;

  switch (type) {
    case "freighter": {
      try {
        const res = await freighterApi.isConnected();
        return !!res?.isConnected;
      } catch {
        return false;
      }
    }
    case "albedo":
      return true; // Albedo is web-based, universally available

    case "xbull":
      return typeof win.xBullSDK !== "undefined" || typeof win.xbull !== "undefined" || true;

    case "rabet":
      return typeof win.rabet !== "undefined";

    case "hana":
      return typeof win.hanaWallet?.stellar !== "undefined" || typeof win.hana?.stellar !== "undefined";

    case "secret_key":
    case "demo":
      return true;

    default:
      return false;
  }
}

/**
 * Connects to a selected wallet provider and returns public key
 */
export async function connectWallet(
  type: WalletType,
  options?: { secretKey?: string; networkPassphrase?: string }
): Promise<WalletConnectionResult> {
  const win = typeof window !== "undefined" ? (window as unknown as CustomWindow) : ({} as CustomWindow);

  switch (type) {
    case "freighter": {
      try {
        const { isAllowed } = await freighterApi.isAllowed();
        if (!isAllowed) {
          await freighterApi.requestAccess();
        }
        const { address } = await freighterApi.getAddress();
        if (!address) {
          throw new Error("No address returned from Freighter");
        }
        return {
          address,
          walletType: "freighter",
          walletName: "Freighter",
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("reject") || message.includes("denied")) {
          throw new Error("Freighter connection request was rejected by user.");
        }
        throw new Error(
          "Freighter extension not detected. Please install Freighter from freighter.app or try Albedo / Demo Mode."
        );
      }
    }

    case "albedo": {
      try {
        const res = await albedo.publicKey({
          require_existing: false,
        });
        if (!res?.pubkey) {
          throw new Error("No public key returned from Albedo");
        }
        return {
          address: res.pubkey,
          walletType: "albedo",
          walletName: "Albedo",
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("reject") || message.includes("denied") || message.includes("canceled")) {
          throw new Error("Albedo authentication was cancelled by user.");
        }
        throw new Error(message || "Albedo connection failed.");
      }
    }

    case "xbull": {
      try {
        const xbullExt = win.xBullSDK || win.xbull;
        if (xbullExt && typeof xbullExt.getPublicKey === "function") {
          const pubkey = await xbullExt.getPublicKey();
          if (pubkey) {
            return {
              address: pubkey,
              walletType: "xbull",
              walletName: "xBull Wallet",
            };
          }
        }

        const { xBullWalletConnect } = await import("@creit.tech/xbull-wallet-connect");
        const bridge = new xBullWalletConnect();
        const address = await bridge.connect();
        try {
          bridge.closeConnections();
        } catch {}

        if (!address) {
          throw new Error("No address returned from xBull");
        }
        return {
          address,
          walletType: "xbull",
          walletName: "xBull Wallet",
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("reject") || message.includes("denied")) {
          throw new Error("xBull connection request was rejected.");
        }
        throw new Error("xBull Wallet connection failed or was cancelled.");
      }
    }

    case "rabet": {
      const rabet = win.rabet;
      if (!rabet || typeof rabet.connect !== "function") {
        throw new Error("Rabet extension not found. Please install Rabet from rabet.io");
      }
      try {
        const res = await rabet.connect();
        const pubkey = typeof res === "string" ? res : res?.publicKey || res?.address;
        if (typeof pubkey !== "string" || !pubkey.startsWith("G")) {
          throw new Error("Invalid response from Rabet");
        }
        return {
          address: pubkey,
          walletType: "rabet",
          walletName: "Rabet",
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(message || "Failed to connect to Rabet");
      }
    }

    case "hana": {
      const hana = win.hanaWallet?.stellar || win.hana?.stellar;
      if (!hana || typeof hana.getAccount !== "function") {
        throw new Error("Hana Wallet extension not found. Please install Hana Wallet.");
      }
      try {
        const account = await hana.getAccount();
        const address = Array.isArray(account)
          ? account[0]
          : typeof account === "string"
          ? account
          : account?.address;
        if (!address || typeof address !== "string") {
          throw new Error("Could not retrieve account from Hana Wallet");
        }
        return {
          address,
          walletType: "hana",
          walletName: "Hana Wallet",
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(message || "Failed to connect to Hana Wallet");
      }
    }

    case "secret_key": {
      const secret = options?.secretKey?.trim();
      if (!secret) {
        throw new Error("Please enter a valid Stellar secret key (starts with 'S').");
      }
      try {
        const kp = StellarSdk.Keypair.fromSecret(secret);
        return {
          address: kp.publicKey(),
          walletType: "secret_key",
          walletName: "Imported Secret Key",
          secretKey: secret,
        };
      } catch {
        throw new Error("Invalid Stellar secret key format. Must be 56 characters starting with 'S'.");
      }
    }

    case "demo": {
      const DEMO_SECRET_STORAGE_KEY = "soroban_demo_account_secret";
      let secret = typeof window !== "undefined" ? localStorage.getItem(DEMO_SECRET_STORAGE_KEY) : null;
      if (!secret) {
        const kp = StellarSdk.Keypair.random();
        secret = kp.secret();
        if (typeof window !== "undefined") {
          localStorage.setItem(DEMO_SECRET_STORAGE_KEY, secret);
        }
      }
      const kp = StellarSdk.Keypair.fromSecret(secret);
      return {
        address: kp.publicKey(),
        walletType: "demo",
        walletName: "Demo Account",
        secretKey: secret,
      };
    }

    default:
      throw new Error(`Unsupported wallet provider: ${type}`);
  }
}

/**
 * Signs a transaction XDR with the active wallet provider
 */
export async function signTransactionWithWallet(
  walletType: WalletType,
  txXdr: string,
  options?: {
    secretKey?: string;
    networkPassphrase?: string;
    publicKey?: string;
  }
): Promise<string> {
  const networkPassphrase =
    options?.networkPassphrase ??
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??
    "Test SDF Network ; September 2015";

  const win = typeof window !== "undefined" ? (window as unknown as CustomWindow) : ({} as CustomWindow);

  switch (walletType) {
    case "freighter": {
      try {
        const result = await freighterApi.signTransaction(txXdr, {
          networkPassphrase,
        });
        return result.signedTxXdr;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("reject") || message.includes("denied")) {
          throw new Error("Transaction signature rejected in Freighter");
        }
        throw new Error("Failed to sign transaction with Freighter");
      }
    }

    case "albedo": {
      try {
        const res = await albedo.tx({
          xdr: txXdr,
          network: networkPassphrase,
        });
        if (!res?.signed_envelope_xdr) {
          throw new Error("No signed transaction returned by Albedo");
        }
        return res.signed_envelope_xdr;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("reject") || message.includes("denied") || message.includes("canceled")) {
          throw new Error("Transaction signature was cancelled in Albedo");
        }
        throw new Error(message || "Failed to sign transaction with Albedo");
      }
    }

    case "xbull": {
      try {
        const xbullExt = win.xBullSDK || win.xbull;
        if (xbullExt && typeof xbullExt.signXDR === "function") {
          const signed = await xbullExt.signXDR(txXdr, { networkPassphrase });
          return typeof signed === "string" ? signed : signed?.signedTxXdr || signed?.xdr || "";
        }

        const { xBullWalletConnect } = await import("@creit.tech/xbull-wallet-connect");
        const bridge = new xBullWalletConnect();
        const signedXdr = await bridge.sign({
          xdr: txXdr,
          publicKey: options?.publicKey,
          network: networkPassphrase,
        });
        try {
          bridge.closeConnections();
        } catch {}
        return signedXdr;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(message || "Failed to sign transaction with xBull");
      }
    }

    case "rabet": {
      const rabet = win.rabet;
      if (!rabet || typeof rabet.sign !== "function") throw new Error("Rabet wallet is not available");
      try {
        const res = await rabet.sign(txXdr, networkPassphrase);
        return typeof res === "string" ? res : res?.xdr || "";
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(message || "Failed to sign transaction with Rabet");
      }
    }

    case "hana": {
      const hana = win.hanaWallet?.stellar || win.hana?.stellar;
      if (!hana || typeof hana.signTransaction !== "function") throw new Error("Hana wallet is not available");
      try {
        const signed = await hana.signTransaction(txXdr);
        return typeof signed === "string" ? signed : signed?.signedTxXdr || signed?.xdr || "";
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(message || "Failed to sign transaction with Hana");
      }
    }

    case "secret_key":
    case "demo": {
      const secret = options?.secretKey;
      if (!secret) {
        throw new Error("Private secret key missing for transaction signing");
      }
      const kp = StellarSdk.Keypair.fromSecret(secret);
      const tx = StellarSdk.TransactionBuilder.fromXDR(txXdr, networkPassphrase);
      tx.sign(kp);
      return tx.toXDR();
    }

    default:
      throw new Error(`Cannot sign transaction: unsupported wallet provider '${walletType}'`);
  }
}
