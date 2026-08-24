"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWalletStore, useToastStore } from "@/lib/store";
import { fundTestnetAccount, getExplorerUrl, CONTRACT_ADDRESS } from "@/lib/stellar";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useBalance } from "@/hooks/useContract";
import { shortenAddress } from "@/hooks/useEvents";
import WalletModal from "./WalletModal";
import {
  Layers,
  Wallet,
  LogOut,
  Copy,
  Check,
  LayoutDashboard,
  Store,
  ArrowUpRight,
  Menu,
  X,
  Droplets,
  Loader2,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
  Coins,
  Shield,
  FileCode,
} from "lucide-react";

function formatPrice(price: bigint): string {
  const xlm = Number(price) / 10_000_000;
  return xlm.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    address,
    walletName,
    isConnected,
    isConnecting,
    isDemoMode,
    setModalOpen,
    disconnect,
  } = useWalletStore();

  const { toasts, removeToast, addToast } = useToastStore();
  const {
    formattedXlm,
    loading: walletLoading,
    funding,
    refetch: refetchWalletBalance,
    fundWithFriendbot,
  } = useWalletBalance(address);

  const { balance: contractBalance, refetch: refetchContractBalance } = useBalance(address || null);

  const [copied, setCopied] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      addToast("success", "Stellar address copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Subscriber Hub", icon: LayoutDashboard },
    { href: "/merchant", label: "Merchant Portal", icon: Store },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 glass border-b border-zinc-800/60 backdrop-blur-xl bg-zinc-950/75">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          {/* Logo */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 shadow-lg shadow-violet-900/30">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Soroban<span className="text-violet-400">Pay</span>
              </span>
              <span className="hidden sm:block text-[9px] font-mono text-zinc-500 uppercase tracking-widest leading-none">
                Stellar Testnet
              </span>
            </div>
          </button>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-1.5 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/80">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                    active
                      ? "bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent"
                  }`}
                >
                  <link.icon className="h-3.5 w-3.5" />
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Friendbot Faucet button */}
            {isConnected && address && (
              <button
                onClick={() => fundWithFriendbot()}
                disabled={funding}
                className="hidden lg:flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                title="Fund this account with 10,000 testnet XLM via Stellar Friendbot"
              >
                {funding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                )}
                <span>Friendbot Faucet</span>
              </button>
            )}

            {/* Stellar Explorer Link (Fixed to valid Stellar Expert testnet URL) */}
            <a
              href={getExplorerUrl("root")}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/40 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all"
              title="Open Stellar Expert Testnet Explorer"
            >
              <span>Explorer</span>
              <ArrowUpRight className="h-3 w-3 text-zinc-500" />
            </a>

            {/* Connected wallet view with Live Wallet Balance */}
            {isConnected && address ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Live Native XLM Wallet Balance Pill */}
                <div
                  className="hidden md:flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15 px-3 py-1.5 text-xs font-mono text-violet-300 transition-all glass-subtle"
                  title="Your on-chain Stellar wallet XLM balance"
                >
                  <Coins className="h-3.5 w-3.5 text-violet-400" />
                  <span className="font-bold tracking-tight">{formattedXlm}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      refetchWalletBalance();
                      refetchContractBalance();
                    }}
                    disabled={walletLoading}
                    title="Refresh on-chain balance"
                    className="ml-0.5 text-violet-400 hover:text-violet-200 transition-colors p-0.5"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${walletLoading ? "animate-spin text-cyan-400" : ""}`}
                    />
                  </button>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-1.5">
                    {/* Wallet Address Trigger */}
                    <button
                      onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                      className="flex items-center gap-2 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 glass-subtle shadow-inner transition-all"
                    >
                      <div
                        className={`h-2 w-2 rounded-full ${
                          isDemoMode ? "bg-amber-400" : "bg-emerald-400"
                        } animate-pulse`}
                      />
                      <span className="text-xs font-mono text-zinc-300">
                        {shortenAddress(address)}
                      </span>
                      {walletName && (
                        <span className="hidden sm:inline-block rounded-md bg-zinc-800/90 border border-zinc-700/60 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-300">
                          {walletName}
                        </span>
                      )}
                      <ChevronDown className="h-3 w-3 text-zinc-500" />
                    </button>

                    {/* Quick Copy Button */}
                    <button
                      onClick={handleCopy}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Account Details Dropdown */}
                  {accountMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setAccountMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-zinc-800/90 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-xl z-50 animate-scale-in">
                        {/* Header */}
                        <div className="px-2 py-2 border-b border-zinc-800/80 mb-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                              Active Stellar Account
                            </span>
                            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Testnet
                            </span>
                          </div>
                          <div className="text-xs font-bold text-zinc-200 mt-1 flex items-center gap-1.5">
                            {walletName || "Stellar Wallet"}
                            {isDemoMode && (
                              <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] text-amber-300 font-mono">
                                Demo
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-zinc-400 break-all mt-1 select-all">
                            {address}
                          </div>
                        </div>

                        {/* Balances Card */}
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-2.5 mb-2.5 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                              <Coins className="h-3.5 w-3.5 text-violet-400" />
                              Wallet Balance:
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold text-zinc-100">
                                {formattedXlm}
                              </span>
                              <button
                                onClick={() => refetchWalletBalance()}
                                disabled={walletLoading}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                                title="Refresh"
                              >
                                <RefreshCw
                                  className={`h-2.5 w-2.5 ${walletLoading ? "animate-spin" : ""}`}
                                />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs border-t border-zinc-800/60 pt-2">
                            <span className="text-zinc-400 flex items-center gap-1.5">
                              <Shield className="h-3.5 w-3.5 text-cyan-400" />
                              Contract Deposit:
                            </span>
                            <span className="font-mono font-bold text-zinc-100">
                              {formatPrice(contractBalance)} XLM
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-1">
                          <button
                            onClick={() => {
                              setAccountMenuOpen(false);
                              fundWithFriendbot();
                            }}
                            disabled={funding}
                            className="flex items-center justify-between w-full rounded-xl px-2.5 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                              Fund with Friendbot (+10k XLM)
                            </span>
                          </button>

                          <a
                            href={getExplorerUrl("account", address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between w-full rounded-xl px-2.5 py-2 text-xs text-zinc-300 hover:bg-zinc-850 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                              View Account on Stellar Expert
                            </span>
                            <ArrowUpRight className="h-3 w-3 text-zinc-500" />
                          </a>

                          <a
                            href={getExplorerUrl("contract", CONTRACT_ADDRESS)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between w-full rounded-xl px-2.5 py-2 text-xs text-zinc-300 hover:bg-zinc-850 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <FileCode className="h-3.5 w-3.5 text-zinc-400" />
                              View Contract on Stellar Expert
                            </span>
                            <ArrowUpRight className="h-3 w-3 text-zinc-500" />
                          </a>

                          <button
                            onClick={() => {
                              setAccountMenuOpen(false);
                              setModalOpen(true);
                            }}
                            className="flex items-center justify-between w-full rounded-xl px-2.5 py-2 text-xs text-zinc-300 hover:bg-zinc-850 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <RefreshCw className="h-3.5 w-3.5 text-violet-400" />
                              Switch Wallet
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setAccountMenuOpen(false);
                              disconnect();
                              addToast("info", "Wallet disconnected.");
                            }}
                            className="flex items-center justify-between w-full rounded-xl px-2.5 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <LogOut className="h-3.5 w-3.5" />
                              Disconnect
                            </span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalOpen(true)}
                  disabled={isConnecting}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-violet-900/20 transition-all disabled:opacity-50"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-950 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => {
                    router.push(link.href);
                    setMobileOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold border ${
                    pathname === link.href
                      ? "bg-violet-600/20 border-violet-500/30 text-violet-300"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </button>
              ))}
            </div>

            {/* Mobile Wallet Balance Bar */}
            {isConnected && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-violet-400" />
                  <div>
                    <div className="text-[10px] text-zinc-400 font-semibold uppercase">Wallet Balance</div>
                    <div className="text-xs font-mono font-bold text-zinc-100">{formattedXlm}</div>
                  </div>
                </div>
                <button
                  onClick={() => refetchWalletBalance()}
                  disabled={walletLoading}
                  className="rounded-lg bg-zinc-900/60 border border-zinc-700/60 p-2 text-violet-300"
                  title="Refresh Balance"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${walletLoading ? "animate-spin text-cyan-400" : ""}`} />
                </button>
              </div>
            )}

            {!isConnected && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    setModalOpen(true);
                    setMobileOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-900/20"
                >
                  <Wallet className="h-4 w-4" /> Connect Stellar Wallet
                </button>
              </div>
            )}

            {isConnected && (
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    fundWithFriendbot();
                    setMobileOpen(false);
                  }}
                  disabled={funding}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-300"
                >
                  <Droplets className="h-4 w-4" /> Fund Testnet XLM (Friendbot)
                </button>

                <a
                  href={getExplorerUrl(address ? "account" : "root", address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 text-xs text-zinc-300"
                >
                  <ExternalLink className="h-4 w-4" /> Open Stellar Expert Explorer
                </a>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Global Toast Overlay */}
      {toasts.length > 0 && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 glass backdrop-blur-xl shadow-2xl animate-slide-in-right ${
                t.type === "success"
                  ? "border-emerald-500/30 bg-emerald-950/80 text-emerald-200"
                  : t.type === "error"
                  ? "border-red-500/30 bg-red-950/80 text-red-200"
                  : "border-cyan-500/30 bg-cyan-950/80 text-cyan-200"
              }`}
            >
              {t.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : t.type === "error" ? (
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                {t.title && <div className="text-xs font-bold mb-0.5">{t.title}</div>}
                <p className="text-xs leading-relaxed opacity-90">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-zinc-400 hover:text-white transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Global Multi-Wallet Modal */}
      <WalletModal />
    </>
  );
}
