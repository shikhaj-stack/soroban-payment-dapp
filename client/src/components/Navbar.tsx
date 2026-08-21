"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useWalletStore } from "@/lib/store";
import {
  connectFreighter,
  getOrCreateDemoAccount,
  fundTestnetAccount,
} from "@/lib/stellar";
import { shortenAddress } from "@/hooks/useEvents";
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
  Sparkles,
  Droplets,
  Loader2,
} from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    address,
    isConnected,
    isConnecting,
    isDemoMode,
    error,
    setAddress,
    setConnecting,
    setDemoMode,
    setError,
    disconnect,
  } = useWalletStore();

  const [copied, setCopied] = useState(false);
  const [funding, setFunding] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleConnectFreighter = async () => {
    setConnecting(true);
    setError(null);
    try {
      const addr = await connectFreighter();
      setAddress(addr);
      setDemoMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectDemo = async () => {
    setConnecting(true);
    setError(null);
    try {
      const demo = getOrCreateDemoAccount();
      setAddress(demo.publicKey);
      setDemoMode(true, demo.secretKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo setup failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleFaucet = async () => {
    if (!address) return;
    setFunding(true);
    try {
      const ok = await fundTestnetAccount(address);
      if (ok) {
        alert("Account funded with 10,000 Testnet XLM via Friendbot!");
      } else {
        alert("Friendbot request completed.");
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
    <header className="sticky top-0 z-50 glass border-b border-zinc-800/60 backdrop-blur-xl bg-zinc-950/70">
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
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 glass-subtle shadow-inner">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isDemoMode ? "bg-amber-400" : "bg-emerald-400"
                  } animate-pulse`}
                />
                <span className="text-xs font-mono text-zinc-300">
                  {shortenAddress(address)}
                </span>
                {isDemoMode && (
                  <span className="rounded bg-amber-500/10 border border-amber-500/20 px-1 py-0.2 text-[9px] font-mono text-amber-400">
                    DEMO
                  </span>
                )}
                <button
                  onClick={handleCopy}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <button
                onClick={disconnect}
                className="flex items-center justify-center h-8 w-8 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-red-400 hover:border-red-900/40 hover:bg-red-500/10 transition-all"
                title="Disconnect"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleConnectFreighter}
                disabled={isConnecting}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-violet-900/20 transition-all disabled:opacity-50"
              >
                <Wallet className="h-3.5 w-3.5" />
                {isConnecting ? "Connecting..." : "Connect"}
              </button>

              <button
                onClick={handleConnectDemo}
                disabled={isConnecting}
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all"
                title="Use a built-in instant local keypair without browser extensions"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Demo Mode
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
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  handleConnectFreighter();
                  setMobileOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white"
              >
                <Wallet className="h-4 w-4" /> Connect with Freighter
              </button>
              <button
                onClick={() => {
                  handleConnectDemo();
                  setMobileOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300"
              >
                <Sparkles className="h-4 w-4 text-amber-400" /> Instant Demo Mode
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
  );
}
