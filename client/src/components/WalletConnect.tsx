"use client";

import { useState } from "react";
import { useWalletStore } from "@/lib/store";
import { shortenAddress } from "@/hooks/useEvents";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { getExplorerUrl } from "@/lib/stellar";
import WalletModal from "./WalletModal";
import {
  Wallet,
  LogOut,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Coins,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";

export default function WalletConnect() {
  const {
    address,
    walletName,
    isDemoMode,
    isConnected,
    isConnecting,
    setModalOpen,
    disconnect,
  } = useWalletStore();

  const { formattedXlm, loading: balanceLoading, refetch } = useWalletBalance(address);

  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isConnected && address) {
    return (
      <div className="relative">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Balance Pill */}
          <div
            className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-xs font-mono text-violet-300 glass-subtle shadow-sm"
            title="Wallet native XLM balance"
          >
            <Coins className="h-3.5 w-3.5 text-violet-400" />
            <span className="font-semibold">{formattedXlm}</span>
            <button
              onClick={() => refetch()}
              disabled={balanceLoading}
              title="Refresh wallet balance"
              className="text-violet-400 hover:text-violet-200 p-0.5"
            >
              <RefreshCw className={`h-2.5 w-2.5 ${balanceLoading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>

          {/* Main Wallet pill */}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-all glass-subtle shadow-sm"
          >
            <div
              className={`h-2 w-2 rounded-full ${
                isDemoMode ? "bg-amber-400" : "bg-emerald-400"
              } animate-pulse`}
            />
            <span className="font-mono text-xs">{shortenAddress(address)}</span>
            {walletName && (
              <span className="hidden sm:inline-block rounded-md bg-zinc-800 border border-zinc-700/60 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                {walletName}
              </span>
            )}
            <ChevronDown className="h-3 w-3 text-zinc-500" />
          </button>

          {/* Quick Copy */}
          <button
            onClick={handleCopy}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all"
            title="Copy address"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Dropdown Menu */}
        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-800/90 bg-zinc-950/95 p-3 shadow-xl backdrop-blur-xl z-50 animate-scale-in">
              <div className="px-2 py-1.5 border-b border-zinc-800/80 mb-2">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Connected Provider
                </div>
                <div className="text-xs font-bold text-zinc-200 mt-0.5 flex items-center gap-1.5">
                  {walletName || "Stellar Wallet"}
                  {isDemoMode && (
                    <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 text-[9px] text-amber-400">
                      Demo
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-zinc-400 break-all mt-1">
                  {address}
                </div>
                <div className="mt-2 rounded-lg bg-zinc-900/60 border border-zinc-800 p-2 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Wallet XLM:</span>
                  <span className="font-mono font-bold text-violet-300">{formattedXlm}</span>
                </div>
              </div>

              <div className="space-y-1">
                <a
                  href={getExplorerUrl("account", address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full rounded-xl px-2.5 py-2 text-xs text-zinc-300 hover:bg-zinc-850 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                    View on Stellar Expert
                  </span>
                  <ArrowUpRight className="h-3 w-3 text-zinc-500" />
                </a>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    setModalOpen(true);
                  }}
                  className="flex items-center justify-between w-full rounded-xl px-2.5 py-2 text-xs text-zinc-300 hover:bg-zinc-850 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5 text-violet-400" />
                    Switch Wallet
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    disconnect();
                  }}
                  className="flex items-center justify-between w-full rounded-xl px-2.5 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="h-3.5 w-3.5" />
                    Disconnect Wallet
                  </span>
                </button>
              </div>
            </div>
          </>
        )}

        <WalletModal />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        disabled={isConnecting}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-all shadow-lg shadow-violet-900/20"
      >
        <Wallet className="h-3.5 w-3.5" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>

      <WalletModal />
    </>
  );
}
