"use client";

import { useCallback, useState, useEffect } from "react";
import { useWalletStore, useTxStore } from "@/lib/store";
import {
  buildAndSendTx,
  toScValAddress,
  toScValU32,
  toScValI128,
  toScValU64,
  toScValVecAddresses,
  readContract,
  StellarSdk,
  NETWORK_PASSPHRASE,
} from "@/lib/stellar";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "CBKMFIRGM6VRW2ZMJCBIGFT7CNFUQJ5GFO7GUY2ML6RQKVZ3VD3HXAJP";

/* ────────── Types ────────── */

export interface SubscriptionTier {
  id: number;
  price: bigint;
  interval: bigint;
}

export interface Subscriber {
  tier_id: number;
  last_payment: bigint;
  active: boolean;
  paused: boolean;
}

export const DEFAULT_TIERS: SubscriptionTier[] = [
  { id: 1, price: 10_000_000n, interval: 2_592_000n },   // 10 XLM / 30 days (Basic)
  { id: 2, price: 25_000_000n, interval: 2_592_000n },   // 25 XLM / 30 days (Pro)
  { id: 3, price: 50_000_000n, interval: 2_592_000n },   // 50 XLM / 30 days (Enterprise)
];

/* ────────── Parse Helpers ────────── */

function parseTier(retval: StellarSdk.xdr.ScVal): SubscriptionTier {
  const raw = StellarSdk.scValToNative(retval) as any;
  if (raw && typeof raw === "object") {
    if ("id" in raw && "price" in raw && "interval" in raw) {
      return {
        id: Number(raw.id),
        price: BigInt(raw.price.toString()),
        interval: BigInt(raw.interval.toString()),
      };
    }
    if (Array.isArray(raw)) {
      return {
        id: Number(raw[0]),
        price: BigInt(raw[1].toString()),
        interval: BigInt(raw[2].toString()),
      };
    }
  }
  throw new Error("Unable to parse tier");
}

function parseSubscriber(retval: StellarSdk.xdr.ScVal): Subscriber {
  const raw = StellarSdk.scValToNative(retval) as any;
  if (raw && typeof raw === "object") {
    if ("tier_id" in raw) {
      return {
        tier_id: Number(raw.tier_id),
        last_payment: BigInt(raw.last_payment.toString()),
        active: Boolean(raw.active),
        paused: Boolean(raw.paused ?? false),
      };
    }
    if (Array.isArray(raw)) {
      return {
        tier_id: Number(raw[0]),
        last_payment: BigInt(raw[1].toString()),
        active: Boolean(raw[2]),
        paused: Boolean(raw[3] ?? false),
      };
    }
  }
  throw new Error("Unable to parse subscriber");
}

/* ────────── Read Hooks ────────── */

export function useTier(tierId: number | null) {
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (tierId === null || !CONTRACT_ADDRESS) return;
    setLoading(true);
    setError(null);
    try {
      const retval = await readContract(CONTRACT_ADDRESS, "get_tier", [toScValU32(tierId)]);
      setTier(parseTier(retval));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tier");
    } finally {
      setLoading(false);
    }
  }, [tierId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tier, loading, error, refetch: fetch };
}

export function useAllTiers() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>(DEFAULT_TIERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!CONTRACT_ADDRESS) {
      setTiers(DEFAULT_TIERS);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results: SubscriptionTier[] = [];
      for (let i = 1; i <= 6; i++) {
        try {
          const retval = await readContract(CONTRACT_ADDRESS, "get_tier", [toScValU32(i)]);
          results.push(parseTier(retval));
        } catch {
          break;
        }
      }
      setTiers(results.length > 0 ? results : DEFAULT_TIERS);
    } catch {
      setTiers(DEFAULT_TIERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tiers, loading, error, refetch: fetch };
}

export function useSubscriber(userAddress: string | null) {
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userAddress || !CONTRACT_ADDRESS) {
      setSubscriber(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const retval = await readContract(CONTRACT_ADDRESS, "get_subscriber", [
        toScValAddress(userAddress),
      ]);
      setSubscriber(parseSubscriber(retval));
    } catch {
      setSubscriber(null);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { subscriber, loading, error, refetch: fetch };
}

export function useBalance(userAddress: string | null) {
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!userAddress || !CONTRACT_ADDRESS) {
      setBalance(0n);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const retval = await readContract(CONTRACT_ADDRESS, "get_balance", [
        toScValAddress(userAddress),
      ]);
      const raw = StellarSdk.scValToNative(retval);
      setBalance(BigInt(raw?.toString() ?? "0"));
    } catch {
      setBalance(0n);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { balance, loading, error, refetch: fetch };
}

export function useMerchantEarnings() {
  const [earnings, setEarnings] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;
    setLoading(true);
    setError(null);
    try {
      const retval = await readContract(CONTRACT_ADDRESS, "get_merchant_earnings", []);
      const raw = StellarSdk.scValToNative(retval);
      setEarnings(BigInt(raw?.toString() ?? "0"));
    } catch {
      setEarnings(0n);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { earnings, loading, error, refetch: fetch };
}

/* ────────── Transaction Execution Helper ────────── */

function useExecuteMutation() {
  const address = useWalletStore((s) => s.address);
  const isDemoMode = useWalletStore((s) => s.isDemoMode);
  const demoSecret = useWalletStore((s) => s.demoSecret);
  const addTx = useTxStore((s) => s.addTransaction);
  const updateTx = useTxStore((s) => s.updateTransaction);

  const execute = useCallback(
    async (method: string, params: StellarSdk.xdr.ScVal[]) => {
      if (!address) throw new Error("Wallet not connected");

      const tempHash = `pending-${Date.now()}`;
      addTx({
        hash: tempHash,
        method,
        status: "pending",
        timestamp: Date.now(),
      });

      try {
        let customSigner: ((txXdr: string) => Promise<string>) | undefined;
        if (isDemoMode && demoSecret) {
          customSigner = async (txXdr: string) => {
            const kp = StellarSdk.Keypair.fromSecret(demoSecret);
            const tx = StellarSdk.TransactionBuilder.fromXDR(txXdr, NETWORK_PASSPHRASE);
            tx.sign(kp);
            return tx.toXDR();
          };
        }

        const tx = await buildAndSendTx(
          CONTRACT_ADDRESS,
          method,
          params,
          address,
          customSigner,
        );
        updateTx(tempHash, { hash: tx.hash, status: "success" });
        return tx;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Transaction failed";
        updateTx(tempHash, {
          status: "failed",
          error: msg,
        });
        throw err;
      }
    },
    [address, isDemoMode, demoSecret, addTx, updateTx]
  );

  return { execute };
}

/* ────────── Mutation Hooks ────────── */

export function useSubscribe() {
  const { execute } = useExecuteMutation();
  const address = useWalletStore((s) => s.address);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (tierId: number, initialDeposit: bigint) => {
      if (!address) throw new Error("Wallet not connected");
      setLoading(true);
      try {
        return await execute("subscribe", [
          toScValAddress(address),
          toScValU32(tierId),
          toScValI128(initialDeposit),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [address, execute]
  );

  return { mutate, loading };
}

export function useDepositFunds() {
  const { execute } = useExecuteMutation();
  const address = useWalletStore((s) => s.address);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (amount: bigint) => {
      if (!address) throw new Error("Wallet not connected");
      setLoading(true);
      try {
        return await execute("deposit_funds", [
          toScValAddress(address),
          toScValI128(amount),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [address, execute]
  );

  return { mutate, loading };
}

export function useWithdrawFunds() {
  const { execute } = useExecuteMutation();
  const address = useWalletStore((s) => s.address);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (amount: bigint) => {
      if (!address) throw new Error("Wallet not connected");
      setLoading(true);
      try {
        return await execute("withdraw_funds", [
          toScValAddress(address),
          toScValI128(amount),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [address, execute]
  );

  return { mutate, loading };
}

export function usePauseSubscription() {
  const { execute } = useExecuteMutation();
  const address = useWalletStore((s) => s.address);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      return await execute("pause_subscription", [toScValAddress(address)]);
    } finally {
      setLoading(false);
    }
  }, [address, execute]);

  return { mutate, loading };
}

export function useResumeSubscription() {
  const { execute } = useExecuteMutation();
  const address = useWalletStore((s) => s.address);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      return await execute("resume_subscription", [toScValAddress(address)]);
    } finally {
      setLoading(false);
    }
  }, [address, execute]);

  return { mutate, loading };
}

export function useCancelSubscription() {
  const { execute } = useExecuteMutation();
  const address = useWalletStore((s) => s.address);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      return await execute("cancel_subscription", [toScValAddress(address)]);
    } finally {
      setLoading(false);
    }
  }, [address, execute]);

  return { mutate, loading };
}

/* ────────── Merchant Hooks ────────── */

export function useChargeBilling() {
  const { execute } = useExecuteMutation();
  const address = useWalletStore((s) => s.address);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (userAddress: string) => {
      if (!address) throw new Error("Merchant wallet not connected");
      setLoading(true);
      try {
        return await execute("charge_billing", [
          toScValAddress(address),
          toScValAddress(userAddress),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [address, execute]
  );

  return { mutate, loading };
}

export function useBatchBilling() {
  const { execute } = useExecuteMutation();
  const address = useWalletStore((s) => s.address);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (userAddresses: string[]) => {
      if (!address) throw new Error("Merchant wallet not connected");
      setLoading(true);
      try {
        return await execute("charge_billing_batch", [
          toScValAddress(address),
          toScValVecAddresses(userAddresses),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [address, execute]
  );

  return { mutate, loading };
}

export function useWithdrawMerchantEarnings() {
  const { execute } = useExecuteMutation();
  const address = useWalletStore((s) => s.address);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (amount: bigint) => {
      if (!address) throw new Error("Merchant wallet not connected");
      setLoading(true);
      try {
        return await execute("withdraw_merchant_earnings", [
          toScValAddress(address),
          toScValI128(amount),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [address, execute]
  );

  return { mutate, loading };
}

export function useCreateTier() {
  const { execute } = useExecuteMutation();
  const address = useWalletStore((s) => s.address);
  const [loading, setLoading] = useState(false);

  const mutate = useCallback(
    async (tierId: number, price: bigint, interval: bigint) => {
      if (!address) throw new Error("Merchant wallet not connected");
      setLoading(true);
      try {
        return await execute("create_tier", [
          toScValAddress(address),
          toScValU32(tierId),
          toScValI128(price),
          toScValU64(interval),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [address, execute]
  );

  return { mutate, loading };
}
