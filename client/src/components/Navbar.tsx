"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWalletStore } from "@/lib/store";
import { fundTestnetAccount } from "@/lib/stellar";
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
  Sparkles,
  ExternalLink,
} from "lucide-react";

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

  const [copied, setCopied] = useState(false);
  const [funding, setFunding] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const handleFaucet = async () => {
    if (!address) return;
    setFunding(true);
    try {
      const ok = await fundTestnetAccount(address);
      if (ok) {
        alert("Account funded with 10,000 Testnet XLM via Friendbot!");
      } else {
        alert("Friendbot request submitted.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFunding(false);
    }
  };

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
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
          <div className="flex items-center gap-2.5">
            {/* Faucet button */}
            {isConnected && address && (
              <button
                onClick={handleFaucet}
                disabled={funding}
                className="hidden lg:flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                title="Fund this account with testnet XLM via Stellar Friendbot"
              >
                {funding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Droplets className="h-3.5 w-3.5" />
                )}
                <span>Friendbot Faucet</span>
              </button>
            )}

            {/* Stellar Explorer */}
            <a
              href="https://stellar.expert/testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/40 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all"
            >
              Explorer
              <ArrowUpRight className="h-3 w-3 text-zinc-500" />
            </a>

            {/* Connected wallet view */}
            {isConnected && address ? (
              <div className="relative">
                <div className="flex items-center gap-1.5 sm:gap-2">
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
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-800/90 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl z-50 animate-scale-in">
                      <div className="px-2 py-2 border-b border-zinc-800/80 mb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                            Active Wallet
                          </span>
                          <span className="text-[10px] text-emerald-400 font-medium">
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
                        <div className="text-[11px] font-mono text-zinc-400 break-all mt-1">
                          {address}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setAccountMenuOpen(false);
                            handleFaucet();
                          }}
                          className="flex items-center justify-between w-full rounded-xl px-2.5 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                            Fund with Friendbot
                          </span>
                        </button>

                        <a
                          href={`https://stellar.expert/testnet/account/${address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between w-full rounded-xl px-2.5 py-2 text-xs text-zinc-300 hover:bg-zinc-850 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                            View on Stellar Expert
                          </span>
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
              <button
                onClick={handleFaucet}
                disabled={funding}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-300"
              >
                <Droplets className="h-4 w-4" /> Fund Testnet XLM (Friendbot)
              </button>
            )}
          </div>
        )}
      </header>

      {/* Global Multi-Wallet Modal */}
      <WalletModal />
    </>
  );
}
