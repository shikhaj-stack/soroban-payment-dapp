"use client";

import { useState, useEffect } from "react";
import { useWalletStore, useToastStore } from "@/lib/store";
import {
  useMerchantEarnings,
  useWithdrawMerchantEarnings,
  useCreateTier,
  useChargeBilling,
  useBatchBilling,
  useAllTiers,
} from "@/hooks/useContract";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { getExplorerUrl, CONTRACT_ADDRESS } from "@/lib/stellar";
import Navbar from "@/components/Navbar";
import ActivityFeed from "@/components/ActivityFeed";
import TransactionTracker from "@/components/TransactionTracker";
import {
  Store,
  DollarSign,
  Users,
  Layers,
  PlusCircle,
  Play,
  Loader2,
  Sparkles,
  Zap,
  Wallet,
  Coins,
  ArrowUpRight,
  RefreshCw,
  Droplets,
} from "lucide-react";

function formatXLM(amount: bigint | number): string {
  const num = typeof amount === "bigint" ? Number(amount) / 10_000_000 : amount / 10_000_000;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// Sample subscriber directory for merchant demo and monitoring
interface MockSubscriberRecord {
  address: string;
  tierId: number;
  tierName: string;
  amount: number;
  lastBilled: string;
  status: "due" | "current" | "paused";
}

const INITIAL_SUBSCRIBERS: MockSubscriberRecord[] = [
  {
    address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYORTMB35THQI2TTOHS",
    tierId: 1,
    tierName: "Starter",
    amount: 10,
    lastBilled: "31 days ago",
    status: "due",
  },
  {
    address: "GCZ7N22VRK5M4U6Y78P9OPQRST1234ABCDEF567890XYZWVUTSRQ",
    tierId: 2,
    tierName: "Pro Plan",
    amount: 25,
    lastBilled: "32 days ago",
    status: "due",
  },
  {
    address: "GAXODFXRJFZ7YBCPZP3UQ2K4LKJHG87654321QWERTYUIOPASDF",
    tierId: 3,
    tierName: "Enterprise VIP",
    amount: 50,
    lastBilled: "12 days ago",
    status: "current",
  },
  {
    address: "GDHJR34MNO8PQ9988AABBCCDDEEFF00112233445566778899",
    tierId: 2,
    tierName: "Pro Plan",
    amount: 25,
    lastBilled: "20 days ago",
    status: "paused",
  },
];

export default function MerchantPortal() {
  const isConnected = useWalletStore((s) => s.isConnected);
  const address = useWalletStore((s) => s.address);
  const walletName = useWalletStore((s) => s.walletName);
  const setModalOpen = useWalletStore((s) => s.setModalOpen);
  const addToast = useToastStore((s) => s.addToast);

  const { earnings, refetch: refetchEarnings } = useMerchantEarnings();
  const { tiers, refetch: refetchTiers } = useAllTiers();
  const {
    formattedXlm,
    loading: walletLoading,
    funding,
    refetch: refetchWalletBalance,
    fundWithFriendbot,
  } = useWalletBalance(address);

  const { mutate: withdrawEarnings, loading: withdrawing } = useWithdrawMerchantEarnings();
  const { mutate: createTier, loading: creatingTier } = useCreateTier();
  const { mutate: chargeBilling, loading: charging } = useChargeBilling();
  const { mutate: batchBilling, loading: batchCharging } = useBatchBilling();

  const [subscribers, setSubscribers] = useState<MockSubscriberRecord[]>(INITIAL_SUBSCRIBERS);
  const [newTierName, setNewTierName] = useState("");
  const [newTierPrice, setNewTierPrice] = useState("");
  const [newTierDays, setNewTierDays] = useState("30");

  useEffect(() => {
    if (isConnected) {
      refetchEarnings();
      refetchTiers();
      refetchWalletBalance();
    }
  }, [isConnected, refetchEarnings, refetchTiers, refetchWalletBalance]);

  const handleWithdrawAll = async () => {
    if (earnings <= 0n) return;
    try {
      await withdrawEarnings(earnings);
      addToast("success", `Claimed ${formatXLM(earnings)} XLM revenue directly into your merchant wallet!`, "Earnings Claimed");
      refetchEarnings();
      refetchWalletBalance();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Withdrawal failed", "Claim Error");
    }
  };

  const handleCreateNewTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTierPrice) return;
    const priceBigInt = BigInt(Math.floor(parseFloat(newTierPrice) * 10_000_000));
    const intervalSec = BigInt(parseInt(newTierDays || "30") * 86400);
    const nextTierId = (tiers?.length || 0) + 1;
    const tierTitle = newTierName.trim() || `Tier ${nextTierId}`;

    try {
      await createTier(nextTierId, priceBigInt, intervalSec, tierTitle);
      addToast("success", `Tier #${nextTierId} ("${tierTitle}") published on smart contract!`, "Tier Published");
      setNewTierName("");
      setNewTierPrice("");
      refetchTiers();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to create tier", "Tier Error");
    }
  };

  const handleSingleCharge = async (userAddress: string) => {
    try {
      await chargeBilling(userAddress);
      addToast("success", `Billed recurring subscription for ${userAddress.slice(0, 4)}...${userAddress.slice(-4)}`, "Billing Executed");
      setSubscribers((prev) =>
        prev.map((s) =>
          s.address === userAddress
            ? { ...s, status: "current", lastBilled: "Just now" }
            : s
        )
      );
      refetchEarnings();
      refetchWalletBalance();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Billing failed", "Billing Error");
    }
  };

  const handleBatchCharge = async () => {
    const dueUsers = subscribers
      .filter((s) => s.status === "due")
      .map((s) => s.address);

    if (dueUsers.length === 0) return;

    try {
      await batchBilling(dueUsers);
      addToast("success", `Atomic batch billing executed for ${dueUsers.length} subscribers!`, "Batch Billing Complete");
      setSubscribers((prev) =>
        prev.map((s) =>
          s.status === "due"
            ? { ...s, status: "current", lastBilled: "Just now" }
            : s
        )
      );
      refetchEarnings();
      refetchWalletBalance();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Batch billing failed", "Batch Error");
    }
  };

  const dueCount = subscribers.filter((s) => s.status === "due").length;

  return (
    <div className="flex flex-1 flex-col min-h-screen relative overflow-hidden bg-zinc-950">
      {/* Background Ambience */}
      <div className="orb orb-violet w-[500px] h-[500px] -top-32 -left-32 fixed animate-float opacity-30" />
      <div className="orb orb-cyan w-[400px] h-[400px] top-1/2 -right-32 fixed animate-float-delayed opacity-20" />

      <div className="relative z-10 flex flex-1 flex-col">
        <Navbar />

        <main className="flex-1 px-4 sm:px-6 py-8">
          <div className="mx-auto max-w-7xl space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 shadow-md">
                    <Store className="h-4 w-4" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                    Merchant Administration Portal
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Manage subscription tiers, track smart contract earnings, and execute automated batch billing cycles.
                </p>
              </div>

              {isConnected ? (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Admin Mode Active ({walletName || "Connected"})
                  </span>
                  <a
                    href={getExplorerUrl("account", address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-all"
                  >
                    Merchant Explorer
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-900/30 transition-all"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Connect Merchant Wallet
                </button>
              )}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Claimable Contract Revenue */}
              <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 glass-subtle p-5 shadow-lg shadow-violet-950/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                    Claimable Revenue
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-zinc-100 font-mono">
                    {formatXLM(earnings)}
                  </span>
                  <span className="text-xs font-bold text-violet-400">XLM</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Accumulated in Soroban escrow
                </p>
              </div>

              {/* Card 2: Merchant Wallet Balance */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Merchant Wallet
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => refetchWalletBalance()}
                      disabled={walletLoading}
                      title="Refresh"
                      className="text-zinc-500 hover:text-zinc-300 p-1"
                    >
                      <RefreshCw className={`h-3 w-3 ${walletLoading ? "animate-spin text-cyan-400" : ""}`} />
                    </button>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Coins className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-zinc-100 font-mono">
                    {formattedXlm}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  On-chain Stellar account balance
                </p>
              </div>

              {/* Card 3: Active Subscribers */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Active Subscribers
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-zinc-100">
                    {subscribers.filter((s) => s.status !== "paused").length}
                  </span>
                  <span className="text-xs text-zinc-500">subscribers</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  {dueCount} billing renewal(s) due
                </p>
              </div>

              {/* Card 4: Quick Claim Action */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Quick Claim
                  </span>
                  <p className="text-xs text-zinc-400 mt-1">
                    Withdraw claimable earnings to your wallet
                  </p>
                </div>
                <button
                  onClick={handleWithdrawAll}
                  disabled={withdrawing || earnings <= 0n || !isConnected}
                  className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-900/30 transition-all"
                >
                  {withdrawing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Coins className="h-3.5 w-3.5" />
                  )}
                  {withdrawing ? "Claiming..." : "Claim All Earnings"}
                </button>
              </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid gap-8 lg:grid-cols-5">
              {/* Left Column: Subscriber Directory & Billing Engine */}
              <div className="lg:col-span-3 space-y-6">
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                        <Users className="h-4 w-4 text-violet-400" />
                        Subscriber Directory & Billing Engine
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Trigger interval payments from user pre-funded escrow balances.
                      </p>
                    </div>

                    <button
                      onClick={handleBatchCharge}
                      disabled={batchCharging || dueCount === 0 || !isConnected}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition-all"
                    >
                      {batchCharging ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      Charge All Due ({dueCount})
                    </button>
                  </div>

                  {/* Subscribers Table */}
                  <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950/40">
                    {subscribers.map((sub) => (
                      <div
                        key={sub.address}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-zinc-900/40 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-zinc-200">
                              {sub.address.slice(0, 8)}...{sub.address.slice(-6)}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                                sub.status === "due"
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse"
                                  : sub.status === "paused"
                                  ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                              }`}
                            >
                              {sub.status === "due" ? "Billing Due" : sub.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500">
                            Plan: <span className="text-zinc-300 font-semibold">{sub.tierName}</span> ({sub.amount} XLM) · Last billed: {sub.lastBilled}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSingleCharge(sub.address)}
                            disabled={charging || sub.status !== "due" || !isConnected}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                              sub.status === "due"
                                ? "bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/20"
                                : "bg-zinc-800/60 text-zinc-600 cursor-not-allowed border border-zinc-800"
                            }`}
                          >
                            <Play className="h-3 w-3" />
                            Charge Billing
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Create New Tier Card */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-6 space-y-4">
                  <div className="border-b border-zinc-800/80 pb-3">
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                      <PlusCircle className="h-4 w-4 text-emerald-400" />
                      Create New Subscription Tier
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Publish a new recurring tier contract configuration onto Stellar.
                    </p>
                  </div>

                  <form onSubmit={handleCreateNewTier} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                          Plan Name
                        </label>
                        <input
                          type="text"
                          value={newTierName}
                          onChange={(e) => setNewTierName(e.target.value)}
                          placeholder="e.g. VIP Business"
                          className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                          Price (XLM)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required
                          value={newTierPrice}
                          onChange={(e) => setNewTierPrice(e.target.value)}
                          placeholder="e.g. 75"
                          className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                          Interval (Days)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          required
                          value={newTierDays}
                          onChange={(e) => setNewTierDays(e.target.value)}
                          placeholder="e.g. 30"
                          className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={creatingTier || !newTierPrice || !isConnected}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:bg-zinc-800 disabled:text-zinc-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition-all"
                    >
                      {creatingTier ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {creatingTier ? "Publishing Tier..." : "Publish New Tier to Smart Contract"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Transaction tracker & Activity */}
              <div className="lg:col-span-2 space-y-6">
                <TransactionTracker />
                <ActivityFeed />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
