"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWalletStore, useToastStore } from "@/lib/store";
import {
  fetchAccountBalances,
  fundTestnetAccount,
  TokenBalance,
} from "@/lib/stellar";

export interface WalletBalanceState {
  xlmBalance: number;
  formattedXlm: string;
  rawXlm: string;
  balances: TokenBalance[];
  isFunded: boolean;
  loading: boolean;
  error: string | null;
  funding: boolean;
  refetch: () => Promise<void>;
  fundWithFriendbot: () => Promise<boolean>;
}

export function notifyBalanceChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("soroban:refresh-balance"));
  }
}

export function formatXlmDisplay(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.00 XLM";
  return `${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} XLM`;
}

export function useWalletBalance(targetAddress?: string | null): WalletBalanceState {
  const storeAddress = useWalletStore((s) => s.address);
  const isDemoMode = useWalletStore((s) => s.isDemoMode);
  const addToast = useToastStore((s) => s.addToast);

  const address = targetAddress !== undefined ? targetAddress : storeAddress;

  const [rawXlm, setRawXlm] = useState<string>("0.0000000");
  const [xlmBalance, setXlmBalance] = useState<number>(0);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isFunded, setIsFunded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [funding, setFunding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setRawXlm("0.0000000");
      setXlmBalance(0);
      setBalances([]);
      setIsFunded(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchAccountBalances(address);

      if (!mountedRef.current) return;

      const parsedXlm = parseFloat(data.xlm || "0");
      setRawXlm(data.xlm || "0.0000000");
      setXlmBalance(isNaN(parsedXlm) ? 0 : parsedXlm);
      setBalances(data.balances);
      setIsFunded(data.isFunded);
    } catch (err: any) {
      if (!mountedRef.current) return;
      console.warn("Wallet balance query note:", err);
      setError(err?.message || "Failed to fetch wallet balance");
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [address]);

  // Friendbot faucet trigger with instant UI balance refresh
  const fundWithFriendbot = useCallback(async (): Promise<boolean> => {
    if (!address) return false;
    setFunding(true);
    addToast("info", "Requesting 10,000 Testnet XLM from Stellar Friendbot...", "Friendbot Faucet");

    try {
      const ok = await fundTestnetAccount(address);
      if (ok) {
        addToast("success", "Wallet funded with 10,000 Testnet XLM!", "Faucet Success");
      } else {
        addToast("info", "Friendbot request submitted. Funds will reflect shortly.", "Faucet Submitted");
      }
      // Wait a moment for Stellar ledger ledger close (approx 3-4s)
      setTimeout(() => {
        fetchBalance();
      }, 3500);
      setTimeout(() => {
        fetchBalance();
      }, 7000);
      return ok;
    } catch (err: any) {
      console.error("Faucet error:", err);
      addToast("error", "Friendbot request timed out. Please retry.", "Faucet Error");
      return false;
    } finally {
      setFunding(false);
    }
  }, [address, addToast, fetchBalance]);

  // Auto-fetch on mount / address change
  useEffect(() => {
    mountedRef.current = true;
    fetchBalance();

    // Periodic background sync every 15 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchBalance();
      }
    }, 15000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchBalance]);

  // Listen to global balance-refresh events (triggered after tx execution)
  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchBalance();
    };
    window.addEventListener("soroban:refresh-balance", handleGlobalRefresh);
    return () => {
      window.removeEventListener("soroban:refresh-balance", handleGlobalRefresh);
    };
  }, [fetchBalance]);

  return {
    xlmBalance,
    formattedXlm: formatXlmDisplay(xlmBalance),
    rawXlm,
    balances,
    isFunded,
    loading,
    funding,
    error,
    refetch: fetchBalance,
    fundWithFriendbot,
  };
}
