"use client";

import { useState, useEffect } from "react";
import { useWalletStore } from "@/lib/store";
import {
  useAllTiers,
  useSubscribe,
  useDepositFunds,
  useWithdrawFunds,
  usePauseSubscription,
  useResumeSubscription,
  useCancelSubscription,
  useBalance,
  useSubscriber,
  type SubscriptionTier,
} from "@/hooks/useContract";
import {
  Check,
  Zap,
  Star,
  Crown,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
  Coins,
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
  Pause,
  Play,
  Layers,
  ShieldCheck,
} from "lucide-react";

const TIER_ICONS = [Zap, Star, Crown];
const TIER_GRADIENTS = [
  "from-blue-500 to-cyan-500",
  "from-violet-500 to-purple-500",
  "from-amber-500 to-orange-500",
];
const TIER_NAMES = ["Starter", "Pro Plan", "Enterprise VIP"];

function formatPrice(price: bigint): string {
  const xlm = Number(price) / 10_000_000;
  return xlm.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatInterval(seconds: bigint): string {
  const days = Number(seconds) / 86400;
  if (days >= 30) return `${Math.round(days / 30)} mo`;
  return `${days}d`;
}

export default function SubscriptionTiers() {
  const address = useWalletStore((s) => s.address);
  const isConnected = useWalletStore((s) => s.isConnected);
  const { tiers, loading: tiersLoading, refetch: refetchTiers } = useAllTiers();
  const { balance, refetch: refetchBalance } = useBalance(address || null);
  const { subscriber, refetch: refetchSub } = useSubscriber(address || null);

  const { mutate: subscribe, loading: subscribing } = useSubscribe();
  const { mutate: deposit, loading: depositing } = useDepositFunds();
  const { mutate: withdraw, loading: withdrawing } = useWithdrawFunds();
  const { mutate: pauseSub, loading: pausing } = usePauseSubscription();
  const { mutate: resumeSub, loading: resuming } = useResumeSubscription();
  const { mutate: cancelSub, loading: cancelling } = useCancelSubscription();

  const [activeTab, setActiveTab] = useState<"tiers" | "deposit" | "withdraw">("tiers");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      refetchBalance();
      refetchSub();
      refetchTiers();
    }
  }, [isConnected, address, refetchBalance, refetchSub, refetchTiers]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    try {
      await subscribe(tier.id, tier.price);
      setToast({
        type: "success",
        msg: `Successfully subscribed to ${TIER_NAMES[tier.id - 1] || `Tier ${tier.id}`}!`,
      });
      refetchBalance();
      refetchSub();
    } catch (err) {
      setToast({
        type: "error",
        msg: err instanceof Error ? err.message : "Subscription failed",
      });
    }
  };

  const handleDeposit = async (customVal?: string) => {
    const val = customVal || depositAmount;
    if (!val || parseFloat(val) <= 0) return;
    try {
      const stroops = BigInt(Math.floor(parseFloat(val) * 10_000_000));
      await deposit(stroops);
      setToast({ type: "success", msg: `Deposited ${val} XLM into contract balance!` });
      refetchBalance();
      setDepositAmount("");
    } catch (err) {
      setToast({
        type: "error",
        msg: err instanceof Error ? err.message : "Deposit failed",
      });
    }
  };

  const handleWithdraw = async (customVal?: string) => {
    const val = customVal || withdrawAmount;
    if (!val || parseFloat(val) <= 0) return;
    try {
      const stroops = BigInt(Math.floor(parseFloat(val) * 10_000_000));
      await withdraw(stroops);
      setToast({ type: "success", msg: `Withdrew ${val} XLM back to your wallet!` });
      refetchBalance();
      setWithdrawAmount("");
    } catch (err) {
      setToast({
        type: "error",
        msg: err instanceof Error ? err.message : "Withdrawal failed",
      });
    }
  };

  const handlePause = async () => {
    try {
      await pauseSub();
      setToast({ type: "success", msg: "Subscription paused. Auto-billing suspended." });
      refetchSub();
    } catch (err) {
      setToast({ type: "error", msg: err instanceof Error ? err.message : "Failed to pause" });
    }
  };

  const handleResume = async () => {
    try {
      await resumeSub();
      setToast({ type: "success", msg: "Subscription resumed and active." });
      refetchSub();
    } catch (err) {
      setToast({ type: "error", msg: err instanceof Error ? err.message : "Failed to resume" });
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your recurring subscription?")) return;
    try {
      await cancelSub();
      setToast({ type: "success", msg: "Subscription cancelled successfully." });
      refetchSub();
    } catch (err) {
      setToast({
        type: "error",
        msg: err instanceof Error ? err.message : "Cancel failed",
      });
    }
  };

  const isSubActive = subscriber?.active;
  const isSubPaused = subscriber?.paused;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={`animate-slide-in-right flex items-start gap-3 rounded-2xl border px-4 py-3 glass backdrop-blur-md shadow-xl ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
              : "border-red-500/30 bg-red-950/40 text-red-300"
          }`}
        >
          {toast.type === "success" ? (
            <Check className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <p className="text-sm font-medium flex-1">{toast.msg}</p>
          <button
            onClick={() => setToast(null)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Subscription Status Card */}
      {isConnected && address && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                  isSubActive
                    ? isSubPaused
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500"
                }`}
              >
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-100">
                    {isSubActive
                      ? `${TIER_NAMES[subscriber.tier_id - 1] || `Tier ${subscriber.tier_id}`}`
                      : "No Active Subscription"}
                  </h3>
                  {isSubActive && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        isSubPaused
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      }`}
                    >
                      {isSubPaused ? "Paused" : "Active"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Deposited Balance:{" "}
                  <span className="font-bold text-zinc-200">
                    {formatPrice(balance)} XLM
                  </span>
                </p>
              </div>
            </div>

            {/* Controls */}
            {isSubActive && (
              <div className="flex items-center gap-2">
                {isSubPaused ? (
                  <button
                    onClick={handleResume}
                    disabled={resuming}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-all disabled:opacity-50"
                  >
                    {resuming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Resume Plan
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    disabled={pausing}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-all disabled:opacity-50"
                  >
                    {pausing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                    Pause Plan
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 transition-all disabled:opacity-50"
                >
                  {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  Cancel Plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
        <button
          onClick={() => setActiveTab("tiers")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "tiers"
              ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Subscription Plans
        </button>
        <button
          onClick={() => setActiveTab("deposit")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "deposit"
              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          Deposit Balance
        </button>
        <button
          onClick={() => setActiveTab("withdraw")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "withdraw"
              ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <ArrowUpFromLine className="h-3.5 w-3.5" />
          Withdraw Funds
        </button>
      </div>

      {/* TAB: TIERS */}
      {activeTab === "tiers" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier, i) => {
            const Icon = TIER_ICONS[i % TIER_ICONS.length];
            const gradient = TIER_GRADIENTS[i % TIER_GRADIENTS.length];
            const name = TIER_NAMES[i] || `Tier ${tier.id}`;
            const isActive = subscriber?.active && subscriber.tier_id === tier.id;
            const hasFunds = balance >= tier.price;

            return (
              <div
                key={tier.id}
                className={`group relative rounded-2xl border bg-zinc-900/40 glass-subtle p-6 transition-all duration-300 hover:border-zinc-700/80 hover:bg-zinc-900/60 flex flex-col justify-between ${
                  isActive
                    ? "border-violet-500/40 ring-1 ring-violet-500/30 glow-violet"
                    : "border-zinc-800/80"
                }`}
              >
                {isActive && (
                  <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
                )}

                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`inline-flex rounded-xl bg-gradient-to-br ${gradient} p-3 shadow-lg`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    {isActive ? (
                      <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-2.5 py-0.5 text-[10px] font-bold text-violet-300 uppercase tracking-wider">
                        Current Plan
                      </span>
                    ) : i === 1 ? (
                      <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
                        Popular
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-lg font-bold text-zinc-100 mb-1">{name}</h3>

                  <div className="flex items-baseline gap-1.5 mb-5">
                    <span className="text-3xl font-extrabold text-zinc-100">
                      {formatPrice(tier.price)}
                    </span>
                    <span className="text-sm font-semibold text-violet-400">XLM</span>
                    <span className="text-xs text-zinc-500 font-medium">
                      / {formatInterval(tier.interval)}
                    </span>
                  </div>

                  <ul className="space-y-2.5 mb-6 text-xs text-zinc-400">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      Trustless smart contract auto-charge
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      Pause & resume anytime with no penalty
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      Withdraw unallocated balance at will
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSubscribe(tier)}
                  disabled={!isConnected || subscribing || isActive}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-zinc-800/60 text-zinc-400 cursor-default border border-zinc-700/40"
                      : isConnected
                      ? hasFunds
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/30"
                        : "bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50"
                      : "bg-zinc-800/40 text-zinc-500 cursor-not-allowed border border-zinc-800"
                  }`}
                >
                  {subscribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isActive ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {!isConnected
                    ? "Connect Wallet to Subscribe"
                    : isActive
                    ? "Active Subscription"
                    : subscribing
                    ? "Confirming..."
                    : hasFunds
                    ? "Subscribe Now"
                    : "Deposit & Subscribe"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB: DEPOSIT */}
      {activeTab === "deposit" && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-6 max-w-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 mb-1">
              Top Up Your Contract Balance
            </h3>
            <p className="text-xs text-zinc-400">
              Deposited funds are securely held in the Soroban smart contract to cover upcoming billing intervals. You can withdraw unused funds anytime.
            </p>
          </div>

          <div className="flex gap-2">
            {[10, 25, 50, 100].map((amt) => (
              <button
                key={amt}
                onClick={() => setDepositAmount(amt.toString())}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 text-xs font-semibold text-zinc-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all"
              >
                +{amt} XLM
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                step="1"
                min="1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Deposit amount in XLM"
                className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 font-mono"
              />
              <span className="absolute right-3.5 top-3.5 text-xs font-bold text-zinc-400">
                XLM
              </span>
            </div>
            <button
              onClick={() => handleDeposit()}
              disabled={depositing || !depositAmount || !isConnected}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition-all"
            >
              {depositing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Coins className="h-4 w-4" />
              )}
              {depositing ? "Depositing..." : "Deposit"}
            </button>
          </div>
        </div>
      )}

      {/* TAB: WITHDRAW */}
      {activeTab === "withdraw" && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-6 max-w-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 mb-1">
              Withdraw Available Deposit
            </h3>
            <p className="text-xs text-zinc-400">
              Claim back any unspent tokens stored in the contract directly into your connected wallet.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-zinc-800/40 border border-zinc-700/40 px-4 py-2.5 text-xs">
            <span className="text-zinc-400">Available to Withdraw:</span>
            <span className="font-bold text-cyan-300 font-mono">
              {formatPrice(balance)} XLM
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                step="1"
                min="1"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Withdraw amount in XLM"
                className="w-full rounded-xl border border-zinc-700/60 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 font-mono"
              />
              <button
                onClick={() => setWithdrawAmount((Number(balance) / 10_000_000).toString())}
                className="absolute right-3.5 top-3 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                MAX
              </button>
            </div>
            <button
              onClick={() => handleWithdraw()}
              disabled={withdrawing || !withdrawAmount || balance <= 0n || !isConnected}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-900/30 transition-all"
            >
              {withdrawing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4" />
              )}
              {withdrawing ? "Withdrawing..." : "Withdraw"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
