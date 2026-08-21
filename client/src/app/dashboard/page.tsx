"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWalletStore } from "@/lib/store";
import { useBalance, useSubscriber } from "@/hooks/useContract";
import Navbar from "@/components/Navbar";
import SubscriptionTiers from "@/components/SubscriptionTiers";
import ActivityFeed from "@/components/ActivityFeed";
import TransactionTracker from "@/components/TransactionTracker";
import {
  Wallet,
  TrendingUp,
  Clock,
  Shield,
  ArrowUpRight,
  Layers,
  Sparkles,
  Store,
  CheckCircle2,
  Calendar,
} from "lucide-react";

function formatPrice(price: bigint): string {
  const xlm = Number(price) / 10_000_000;
  return xlm.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function DashboardPage() {
  const isConnected = useWalletStore((s) => s.isConnected);
  const address = useWalletStore((s) => s.address);
  const isDemoMode = useWalletStore((s) => s.isDemoMode);
  const router = useRouter();

  const { balance, refetch: refetchBalance } = useBalance(address || null);
  const { subscriber, refetch: refetchSub } = useSubscriber(address || null);

  useEffect(() => {
    if (isConnected && address) {
      refetchBalance();
      refetchSub();
    }
  }, [isConnected, address, refetchBalance, refetchSub]);

  return (
    <div className="flex flex-1 flex-col min-h-screen relative overflow-hidden bg-zinc-950">
      {/* Background orbs */}
      <div className="orb orb-violet w-[500px] h-[500px] -top-32 -right-32 fixed animate-float opacity-30" />
      <div className="orb orb-cyan w-[400px] h-[400px] bottom-20 -left-20 fixed animate-float-delayed opacity-20" />

      <div className="relative z-10 flex flex-1 flex-col">
        <Navbar />

        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
          <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800/80 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                    Subscriber Hub
                  </h1>
                  {isDemoMode && (
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-300 font-bold">
                      DEMO MODE
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Manage trustless subscriptions, monitor deposit balances, and inspect on-chain activity.
                </p>
              </div>

              {isConnected && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push("/merchant")}
                    className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-300 transition-all"
                  >
                    <Store className="h-3.5 w-3.5" />
                    Switch to Merchant Portal
                  </button>
                  <a
                    href={`https://stellar.expert/testnet/account/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-all"
                  >
                    Stellar Expert
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {!isConnected ? (
              /* Not connected hero prompt */
              <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-800/80 bg-zinc-900/20 glass-subtle py-16 sm:py-24 px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/20 mb-5">
                  <Layers className="h-8 w-8 text-violet-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-100 mb-2">
                  Connect Your Stellar Wallet
                </h3>
                <p className="text-sm text-zinc-400 max-w-md leading-relaxed mb-6">
                  Connect with Freighter browser wallet or activate instant Demo Mode to explore decentralized recurring payments on Stellar Soroban.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl w-full">
                  {[
                    { icon: Shield, label: "Trustless Deposits", desc: "Non-custodial smart contract" },
                    { icon: Clock, label: "Automated Renewal", desc: "Interval billing execution" },
                    { icon: TrendingUp, label: "Instant Withdrawals", desc: "Withdraw anytime" },
                  ].map((f) => (
                    <div key={f.label} className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-left">
                      <f.icon className="h-4 w-4 text-violet-400 mb-2" />
                      <div className="text-xs font-bold text-zinc-200">{f.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <StatCard
                    label="Contract Balance"
                    value={`${formatPrice(balance)} XLM`}
                    subtext="Pre-funded deposit"
                    icon={<Wallet className="h-4 w-4" />}
                    color="violet"
                  />
                  <StatCard
                    label="Active Plan"
                    value={
                      subscriber?.active
                        ? `Tier ${subscriber.tier_id}`
                        : "No Plan"
                    }
                    subtext={
                      subscriber?.active
                        ? subscriber.paused
                          ? "Paused"
                          : "Auto-renewing"
                        : "Inactive"
                    }
                    icon={<Shield className="h-4 w-4" />}
                    color={
                      subscriber?.active
                        ? subscriber.paused
                          ? "zinc"
                          : "emerald"
                        : "zinc"
                    }
                    badge={
                      subscriber?.active && !subscriber.paused ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ) : undefined
                    }
                  />
                  <StatCard
                    label="Billing Cycle"
                    value="30 Days"
                    subtext="Recurring interval"
                    icon={<Calendar className="h-4 w-4" />}
                    color="cyan"
                  />
                  <StatCard
                    label="Stellar Network"
                    value="Testnet"
                    subtext="Soroban SDK v25"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    color="emerald"
                    badge={<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  />
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-5">
                  {/* Left Column: Subscription Tiers & Deposit/Withdraw Hub */}
                  <div className="lg:col-span-3 space-y-6">
                    <SubscriptionTiers />
                  </div>

                  {/* Right Column: Transaction tracker & Live activity */}
                  <div className="lg:col-span-2 space-y-5">
                    <TransactionTracker />
                    <ActivityFeed />
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  color,
  badge,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  color: "violet" | "emerald" | "cyan" | "zinc";
  badge?: React.ReactNode;
}) {
  const colorMap = {
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    zinc: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  };

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold">
          {label}
        </span>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg border ${colorMap[color]}`}
        >
          {icon}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-xl font-bold text-zinc-100">{value}</span>
          {badge}
        </div>
        {subtext && <p className="text-[10px] text-zinc-500 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}
