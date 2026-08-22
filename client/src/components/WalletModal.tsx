"use client";

import { useState, useEffect } from "react";
import { useWalletStore } from "@/lib/store";
import {
  WALLET_PROVIDERS,
  WalletType,
  WalletProviderInfo,
  connectWallet,
  isWalletAvailable,
} from "@/lib/wallets";
import { fundTestnetAccount } from "@/lib/stellar";
import {
  X,
  Sparkles,
  Key,
  Shield,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Wallet,
  Globe,
  Radio,
  Zap,
} from "lucide-react";

/* ────────── Custom SVG Wallet Icons ────────── */

function WalletIcon({ type, className = "h-6 w-6" }: { type: string; className?: string }) {
  switch (type) {
    case "freighter":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#000000" />
          <path
            d="M12 28.5L24 14L36 28.5H29L24 22.5L19 28.5H12Z"
            fill="url(#freighter-grad)"
          />
          <path
            d="M16 34L24 24.5L32 34H16Z"
            fill="#8B5CF6"
            fillOpacity="0.8"
          />
          <defs>
            <linearGradient id="freighter-grad" x1="12" y1="14" x2="36" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#06B6D4" />
              <stop offset="0.5" stopColor="#3B82F6" />
              <stop offset="1" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
      );
    case "albedo":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#0F172A" />
          <circle cx="24" cy="24" r="14" fill="url(#albedo-grad)" />
          <path
            d="M24 14C18.477 14 14 18.477 14 24C14 29.523 18.477 34 24 34C29.523 34 34 29.523 34 24"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="24" cy="24" r="4" fill="#FFFFFF" />
          <defs>
            <linearGradient id="albedo-grad" x1="14" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
              <stop stopColor="#065F46" />
              <stop offset="1" stopColor="#059669" />
            </linearGradient>
          </defs>
        </svg>
      );
    case "xbull":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#18181B" />
          <path
            d="M14 16L24 32L34 16"
            stroke="#EC4899"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19 24H29"
            stroke="#F43F5E"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "rabet":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#0C4A6E" />
          <circle cx="24" cy="24" r="12" fill="#0284C7" />
          <path
            d="M20 18L28 24L20 30"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "hana":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#311042" />
          <circle cx="24" cy="24" r="11" fill="#C084FC" fillOpacity="0.2" />
          <circle cx="24" cy="24" r="6" fill="#D946EF" />
        </svg>
      );
    case "key":
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <Key className="h-6 w-6" />
        </div>
      );
    case "sparkles":
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-900/40">
          <Sparkles className="h-6 w-6" />
        </div>
      );
    default:
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
          <Wallet className="h-6 w-6" />
        </div>
      );
  }
}

export default function WalletModal() {
  const isModalOpen = useWalletStore((s) => s.isModalOpen);
  const setModalOpen = useWalletStore((s) => s.setModalOpen);
  const setWalletInfo = useWalletStore((s) => s.setWalletInfo);
  const isConnecting = useWalletStore((s) => s.isConnecting);
  const setConnecting = useWalletStore((s) => s.setConnecting);
  const error = useWalletStore((s) => s.error);
  const setError = useWalletStore((s) => s.setError);

  const [activeTab, setActiveTab] = useState<"all" | "extension" | "web" | "dev">("all");
  const [detectedMap, setDetectedMap] = useState<Record<string, boolean>>({});
  const [connectingType, setConnectingType] = useState<WalletType | null>(null);

  // Secret Key Import State
  const [showSecretKeyInput, setShowSecretKeyInput] = useState(false);
  const [secretKeyValue, setSecretKeyValue] = useState("");
  const [secretKeyError, setSecretKeyError] = useState<string | null>(null);

  // Check availability of extensions when modal opens
  useEffect(() => {
    if (!isModalOpen) return;

    let mounted = true;
    async function checkAvailability() {
      const results: Record<string, boolean> = {};
      for (const provider of WALLET_PROVIDERS) {
        results[provider.id] = await isWalletAvailable(provider.id);
      }
      if (mounted) setDetectedMap(results);
    }
    checkAvailability();

    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      mounted = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen, setModalOpen]);

  if (!isModalOpen) return null;

  const handleSelectWallet = async (provider: WalletProviderInfo) => {
    setError(null);
    setSecretKeyError(null);

    // If it's secret key, switch to input screen
    if (provider.id === "secret_key") {
      setShowSecretKeyInput(true);
      return;
    }

    setConnecting(true);
    setConnectingType(provider.id);

    try {
      const result = await connectWallet(provider.id);
      setWalletInfo(result);

      // Auto fund testnet demo account if empty
      if (provider.id === "demo") {
        fundTestnetAccount(result.address).catch(() => {});
      }

      setModalOpen(false);
    } catch (err: any) {
      setError(err?.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
      setConnectingType(null);
    }
  };

  const handleImportSecretKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKeyValue.trim()) {
      setSecretKeyError("Please enter your Stellar secret key.");
      return;
    }

    setConnecting(true);
    setConnectingType("secret_key");
    setSecretKeyError(null);

    try {
      const result = await connectWallet("secret_key", { secretKey: secretKeyValue });
      setWalletInfo(result);
      setShowSecretKeyInput(false);
      setSecretKeyValue("");
      setModalOpen(false);
    } catch (err: any) {
      setSecretKeyError(err?.message || "Invalid secret key");
    } finally {
      setConnecting(false);
      setConnectingType(null);
    }
  };

  const filteredProviders = WALLET_PROVIDERS.filter((p) => {
    if (activeTab === "all") return true;
    return p.category === activeTab;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
        onClick={() => setModalOpen(false)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800/90 bg-zinc-950/95 p-6 sm:p-8 shadow-2xl shadow-violet-950/20 backdrop-blur-2xl z-10 animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-400">
                <Wallet className="h-4 w-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100">
                {showSecretKeyInput ? "Import Secret Key" : "Connect Stellar Wallet"}
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {showSecretKeyInput
                ? "Sign testnet transactions securely in this browser session"
                : "Choose a wallet provider or use instant Demo Mode"}
            </p>
          </div>

          <button
            onClick={() => {
              if (showSecretKeyInput) {
                setShowSecretKeyInput(false);
              } else {
                setModalOpen(false);
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && !showSecretKeyInput && (
          <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/30 p-3 text-xs text-red-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Connection Notice: </span>
              {error}
            </div>
          </div>
        )}

        {showSecretKeyInput ? (
          /* ────────── Secret Key Import Form ────────── */
          <form onSubmit={handleImportSecretKey} className="mt-6 space-y-4 flex-1">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Stellar Private Secret Key (S...)
              </label>
              <input
                type="password"
                value={secretKeyValue}
                onChange={(e) => setSecretKeyValue(e.target.value)}
                placeholder="SD..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                autoFocus
              />
              <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                <Info className="h-3 w-3 text-zinc-400 shrink-0" />
                Keys are stored strictly in local memory and never transmitted anywhere.
              </p>
            </div>

            {secretKeyError && (
              <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-2.5 text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {secretKeyError}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSecretKeyInput(false)}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Back to Wallets
              </button>
              <button
                type="submit"
                disabled={isConnecting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 py-2.5 text-xs font-semibold text-white transition-all shadow-lg shadow-violet-900/30 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Key className="h-3.5 w-3.5" />
                    Import & Connect
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* ────────── Wallet Provider List ────────── */
          <>
            {/* Category Filter Pills */}
            <div className="mt-4 flex items-center gap-1.5 p-1 bg-zinc-900/70 rounded-xl border border-zinc-800/80">
              {[
                { id: "all", label: "All Wallets" },
                { id: "extension", label: "Extensions" },
                { id: "web", label: "Web / Universal" },
                { id: "dev", label: "Instant & Dev" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                    activeTab === tab.id
                      ? "bg-violet-600/30 text-violet-200 border border-violet-500/40 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Provider List Items */}
            <div className="mt-4 space-y-2 overflow-y-auto pr-1 flex-1 max-h-[380px] custom-scrollbar">
              {filteredProviders.map((provider) => {
                const isDetected = detectedMap[provider.id];
                const isCurrentConnecting = isConnecting && connectingType === provider.id;

                return (
                  <div
                    key={provider.id}
                    className="group relative flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/90 hover:border-violet-500/40 p-3.5 transition-all cursor-pointer shadow-sm"
                    onClick={() => handleSelectWallet(provider)}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="shrink-0 transition-transform group-hover:scale-105">
                        <WalletIcon type={provider.iconName} className="h-10 w-10" />
                      </div>

                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-100 group-hover:text-white">
                            {provider.name}
                          </span>
                          {provider.badge && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                                provider.badge === "Official"
                                  ? "bg-violet-500/15 border border-violet-500/30 text-violet-300"
                                  : provider.badge === "Universal Web"
                                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                                  : provider.badge === "Instant Test"
                                  ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                                  : "bg-zinc-800 border border-zinc-700 text-zinc-400"
                              }`}
                            >
                              {provider.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 group-hover:text-zinc-300 mt-0.5 line-clamp-1">
                          {provider.shortDesc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrentConnecting ? (
                        <div className="flex items-center gap-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 px-2.5 py-1 text-xs text-violet-300">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Connecting</span>
                        </div>
                      ) : provider.category === "extension" && !isDetected ? (
                        <div className="flex items-center gap-1.5">
                          <span className="hidden sm:inline-block text-[10px] text-zinc-500">
                            Not Installed
                          </span>
                          {provider.installUrl && (
                            <a
                              href={provider.installUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-850 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:text-white hover:border-zinc-700"
                              title={`Install ${provider.name}`}
                            >
                              Install
                              <ExternalLink className="h-2.5 w-2.5 text-zinc-400" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {isDetected && provider.category === "extension" && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Detected
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Notice */}
            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Stellar Soroban Testnet</span>
              </div>
              <a
                href="https://developers.stellar.org/docs/tools/developer-tools/wallets"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-zinc-400 hover:text-violet-400 transition-colors"
              >
                Wallet Docs
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
