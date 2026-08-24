"use client";

import { useState, useEffect } from "react";
import { useWalletStore, useToastStore } from "@/lib/store";
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
import { useWalletBalance } from "@/hooks/useWalletBalance";
import {
  Check,
  Zap,
  Star,
  Crown,
  ArrowRight,
  Loader2,
  X,
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  Pause,
  Play,
  Layers,
  ShieldCheck,
  RefreshCw,
  Droplets,
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
  const setModalOpen = useWalletStore((s) => s.setModalOpen);
  const addToast = useToastStore((s) => s.addToast);

  const { tiers, refetch: refetchTiers } = useAllTiers();
  const { balance, refetch: refetchBalance } = useBalance(address || null);
  const { subscriber, refetch: refetchSub } = useSubscriber(address || null);

  const {
    xlmBalance,
    formattedXlm,
    loading: walletLoading,
    funding,
    refetch: refetchWalletBalance,
    fundWithFriendbot,
  } = useWalletBalance(address);

  const { mutate: subscribe, loading: subscribing } = useSubscribe();
  const { mutate: deposit, loading: depositing } = useDepositFunds();
  const { mutate: withdraw, loading: withdrawing } = useWithdrawFunds();
  const { mutate: pauseSub, loading: pausing } = usePauseSubscription();
  const { mutate: resumeSub, loading: resuming } = useResumeSubscription();
  const { mutate: cancelSub, loading: cancelling } = useCancelSubscription();

  const [activeTab, setActiveTab] = useState<"tiers" | "deposit" | "withdraw">("tiers");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [subscribingTierId, setSubscribingTierId] = useState<number | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      refetchBalance();
      refetchSub();
      refetchTiers();
      refetchWalletBalance();
    }
  }, [isConnected, address, refetchBalance, refetchSub, refetchTiers, refetchWalletBalance]);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!isConnected) {
      setModalOpen(true);
      return;
    }

    setSubscribingTierId(tier.id);
    try {
      // If user has less balance than tier price, auto-deposit the difference
      const depositRequired = balance >= tier.price ? 0n : tier.price - balance;
      await subscribe(tier.id, depositRequired > 0n ? tier.price : 0n);
      
      const tierLabel = tier.name || TIER_NAMES[tier.id - 1] || `Tier ${tier.id}`;
      addToast("success", `Subscribed to ${tierLabel} plan successfully!`, "Subscription Activated");
      refetchBalance();
      refetchSub();
      refetchWalletBalance();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Subscription failed", "Transaction Error");
    } finally {
      setSubscribingTierId(null);
    }
  };

  const handleDeposit = async (customVal?: string) => {
    if (!isConnected) {
      setModalOpen(true);
      return;
    }
    const val = customVal || depositAmount;
    if (!val || parseFloat(val) <= 0) return;
    try {
      const stroops = BigInt(Math.floor(parseFloat(val) * 10_000_000));
      await deposit(stroops);
      addToast("success", `Deposited ${val} XLM into Soroban contract balance!`, "Deposit Confirmed");
      refetchBalance();
      refetchWalletBalance();
      setDepositAmount("");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Deposit failed", "Deposit Error");
    }
  };

  const handleWithdraw = async (customVal?: string) => {
    if (!isConnected) {
      setModalOpen(true);
      return;
    }
    const val = customVal || withdrawAmount;
    if (!val || parseFloat(val) <= 0) return;
    try {
      const stroops = BigInt(Math.floor(parseFloat(val) * 10_000_000));
      await withdraw(stroops);
      addToast("success", `Withdrew ${val} XLM back to your wallet!`, "Withdrawal Confirmed");
      refetchBalance();
      refetchWalletBalance();
      setWithdrawAmount("");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Withdrawal failed", "Withdrawal Error");
    }
  };

  const handlePause = async () => {
    try {
      await pauseSub();
      addToast("info", "Subscription paused. Automated billing cycles suspended.", "Plan Paused");
      refetchSub();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to pause plan", "Action Error");
    }
  };

  const handleResume = async () => {
    try {
      await resumeSub();
      addToast("success", "Subscription resumed and active for renewal.", "Plan Resumed");
      refetchSub();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to resume plan", "Action Error");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your recurring subscription?")) return;
    try {
      await cancelSub();
      addToast("info", "Subscription cancelled. Remaining deposit balance is available for withdrawal.", "Plan Cancelled");
      refetchSub();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Cancellation failed", "Cancel Error");
    }
  };

  const handleMaxDeposit = () => {
    if (xlmBalance > 2) {
      // Keep ~1.5 XLM for reserve / tx fees
      const maxSpendable = Math.max(0, Math.floor(xlmBalance - 1.5));
      setDepositAmount(maxSpendable.toString());
    } else {
      setDepositAmount(xlmBalance > 0 ? xlmBalance.toString() : "0");
    }
  };

  const isSubActive = subscriber?.active;
  const isSubPaused = subscriber?.paused;

  return (
    <div className="space-y-5">
      {/* Subscription Status Banner */}
      {isConnected && address && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                  isSubActive
                    ? isSubPaused
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-950/40"
                    : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500"
                }`}
              >
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                    {isSubActive
                      ? `${TIER_NAMES[subscriber.tier_id - 1] || `Tier ${subscriber.tier_id}`}`
                      : "No Active Subscription"}
                  </h3>
                  {isSubActive && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        isSubPaused
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      }`}
                    >
                      {isSubPaused ? "Paused" : "Active & Renewing"}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
                  <span>
                    Contract Escrow:{" "}
                    <strong className="text-zinc-200 font-mono">
                      {formatPrice(balance)} XLM
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Wallet:{" "}
                    <strong className="text-violet-300 font-mono">
                      {formattedXlm}
                    </strong>
                  </span>
                  <button
                    onClick={() => {
                      refetchBalance();
                      refetchSub();
                      refetchWalletBalance();
                    }}
                    className="text-zinc-500 hover:text-violet-400 transition-colors"
                    title="Refresh Balance"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Controls */}
            {isSubActive && (
              <div className="flex items-center gap-2">
                {isSubPaused ? (
                  <button
                    onClick={handleResume}
                    disabled={resuming}
                    className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition-all disabled:opacity-50"
                  >
                    {resuming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Resume Plan
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    disabled={pausing}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-300 transition-all disabled:opacity-50"
                  >
                    {pausing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                    Pause Plan
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3.5 py-2 text-xs font-semibold text-red-300 transition-all disabled:opacity-50"
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
              ? "bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Subscription Plans ({tiers.length})
        </button>
        <button
          onClick={() => setActiveTab("deposit")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "deposit"
              ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
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
              ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
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
            const name = tier.name || TIER_NAMES[i] || `Tier ${tier.id}`;
            const isActive = subscriber?.active && subscriber.tier_id === tier.id;
            const hasFunds = balance >= tier.price;
            const isProcessingThis = subscribing && subscribingTierId === tier.id;

            return (
              <div
                key={tier.id}
                className={`group relative rounded-2xl border bg-zinc-900/40 glass-subtle p-6 transition-all duration-300 hover:border-zinc-700/80 hover:bg-zinc-900/60 flex flex-col justify-between ${
                  isActive
                    ? "border-violet-500/50 ring-1 ring-violet-500/30 glow-violet"
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
                    <span className="text-3xl font-extrabold text-zinc-100 font-mono">
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
                  disabled={isProcessingThis || isActive}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-zinc-800/60 text-zinc-400 cursor-default border border-zinc-700/40"
                      : isConnected
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-900/30"
                      : "bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60"
                  }`}
                >
                  {isProcessingThis ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isActive ? (
                    <Check className="h-4 w-4 text-violet-400" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {!isConnected
                    ? "Connect Wallet to Subscribe"
                    : isActive
                    ? "Current Active Plan"
                    : isProcessingThis
                    ? "Confirming on Ledger..."
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
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-6 max-w-xl space-y-5">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 mb-1">
              Top Up Your Contract Escrow Balance
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Deposited funds are securely held in the Soroban smart contract to cover upcoming recurring billing intervals. You can withdraw unused balance anytime.
            </p>
          </div>

          {/* Wallet Balance Info Bar */}
          <div className="flex items-center justify-between rounded-xl bg-violet-950/25 border border-violet-500/20 px-4 py-3 text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-violet-400" />
              Available in Your Connected Wallet:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-violet-300 font-mono text-sm">
                {formattedXlm}
              </span>
              {xlmBalance < 10 && (
                <button
                  onClick={() => fundWithFriendbot()}
                  disabled={funding}
                  className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1"
                >
                  <Droplets className="h-2.5 w-2.5 text-cyan-400" />
                  +10k
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {[10, 25, 50, 100].map((amt) => (
              <button
                key={amt}
                onClick={() => setDepositAmount(amt.toString())}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/80 py-2.5 text-xs font-semibold text-zinc-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 transition-all font-mono"
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
              <button
                type="button"
                onClick={handleMaxDeposit}
                className="absolute right-12 top-3 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                title="Fill maximum spendable balance from wallet"
              >
                MAX
              </button>
              <span className="absolute right-3.5 top-3.5 text-xs font-bold text-zinc-400">
                XLM
              </span>
            </div>
            <button
              onClick={() => handleDeposit()}
              disabled={depositing || !depositAmount}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition-all"
            >
              {depositing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Coins className="h-4 w-4" />
              )}
              {depositing ? "Depositing..." : "Deposit XLM"}
            </button>
          </div>
        </div>
      )}

      {/* TAB: WITHDRAW */}
      {activeTab === "withdraw" && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-6 max-w-xl space-y-5">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 mb-1">
              Withdraw Available Escrow Balance
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Claim back any unspent tokens stored in the contract directly into your connected Stellar wallet.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-zinc-800/40 border border-zinc-700/40 px-4 py-3 text-xs">
            <span className="text-zinc-400">Available in Contract Escrow:</span>
            <span className="font-bold text-cyan-300 font-mono text-sm">
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
              disabled={withdrawing || !withdrawAmount || balance <= 0n}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-900/30 transition-all"
            >
              {withdrawing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4" />
              )}
              {withdrawing ? "Withdrawing..." : "Withdraw XLM"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
