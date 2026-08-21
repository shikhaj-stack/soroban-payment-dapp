"use client";

import { useState } from "react";
import { useWalletStore } from "@/lib/store";
import { connectFreighter } from "@/lib/stellar";
import { shortenAddress } from "@/hooks/useEvents";
import { Wallet, LogOut, Copy, Check, AlertCircle, X } from "lucide-react";

export default function WalletConnect() {
  const {
    address,
    isConnected,
    isConnecting,
    error,
    setAddress,
    setConnecting,
    setError,
    disconnect,
  } = useWalletStore();
  const [copied, setCopied] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const addr = await connectFreighter();
      setAddress(addr);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setError(msg);
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-zinc-800/50 border border-zinc-700/30 px-3 py-2 glass-subtle">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-zinc-400">
            {shortenAddress(address)}
          </span>
          <button
            onClick={handleCopy}
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-0.5"
            title="Copy address"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>
        <button
          onClick={handleDisconnect}
          className="flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-red-400 hover:border-red-900/30 hover:bg-red-500/5 transition-all"
          title="Disconnect"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 disabled:cursor-not-allowed px-4 py-2 text-xs font-semibold text-white transition-all shadow-lg shadow-violet-900/20"
      >
        <Wallet className="h-3.5 w-3.5" />
        {isConnecting ? "Connecting..." : "Connect"}
      </button>

      {/* Error toast */}
      {showError && error && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in-right">
          <div className="flex items-start gap-3 rounded-xl border border-red-900/30 bg-zinc-900 glass px-4 py-3 shadow-2xl shadow-red-900/10 max-w-sm">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-red-300">Wallet Error</p>
              <p className="text-xs text-zinc-500 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setShowError(false)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
