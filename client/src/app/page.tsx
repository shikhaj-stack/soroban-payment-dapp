"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWalletStore } from "@/lib/store";
import { connectFreighter, getOrCreateDemoAccount } from "@/lib/stellar";
import Navbar from "@/components/Navbar";
import {
  Layers,
  ArrowRight,
  Shield,
  Zap,
  RefreshCw,
  Lock,
  BarChart3,
  Globe,
  ChevronRight,
  Wallet,
  Coins,
  Clock,
  ArrowUpRight,
  Store,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

const FEATURES = [
  {
    icon: Shield,
    title: "Non-Custodial Escrow",
    desc: "Pre-fund subscriptions with XLM/USDC held in a trustless Soroban smart contract. Withdraw unused funds anytime.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: RefreshCw,
    title: "Automated Billing & Batching",
    desc: "Merchants charge due subscriptions individually or batch charge all due subscribers in a single atomic transaction.",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    icon: Zap,
    title: "Sub-Second Finality",
    desc: "Every subscription lifecycle event (subscribe, billing, pause, resume, cancel) settles in ~5 seconds on Stellar.",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: Lock,
    title: "Deposit Auto-Eviction",
    desc: "If a user's pre-funded balance is insufficient during billing, the contract safely auto-cancels and emits an audit event.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Store,
    title: "Merchant Revenue Claims",
    desc: "Earned subscription fees accumulate directly into smart contract storage, claimable by the merchant in 1-click.",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    icon: Globe,
    title: "Freighter & Demo Mode",
    desc: "Full support for Freighter browser extension plus instant Demo Mode for rapid testing without wallet installs.",
    gradient: "from-indigo-500 to-violet-600",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Connect Wallet",
    desc: "Connect your Freighter browser wallet or click Demo Mode to get an instant funded testnet account.",
    icon: Wallet,
  },
  {
    num: "02",
    title: "Deposit Contract Balance",
    desc: "Deposit XLM to back your recurring subscription cycles trustlessly in the contract.",
    icon: Coins,
  },
  {
    num: "03",
    title: "Activate & Automate",
    desc: "Select a plan. The contract executes interval billings automatically until cancelled or paused.",
    icon: Clock,
  },
];

export default function Home() {
  const router = useRouter();
  const { setAddress, setDemoMode } = useWalletStore();
  const [showHero, setShowHero] = useState(false);

  useEffect(() => {
    setShowHero(true);
  }, []);

  const handleConnect = async () => {
    try {
      const addr = await connectFreighter();
      setAddress(addr);
      setDemoMode(false);
      router.push("/dashboard");
    } catch {
      // If Freighter fails, open demo mode smoothly
      const demo = getOrCreateDemoAccount();
      setAddress(demo.publicKey);
      setDemoMode(true, demo.secretKey);
      router.push("/dashboard");
    }
  };

  const handleLaunchDemo = () => {
    const demo = getOrCreateDemoAccount();
    setAddress(demo.publicKey);
    setDemoMode(true, demo.secretKey);
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-1 flex-col min-h-screen relative overflow-hidden bg-zinc-950">
      {/* Background orbs */}
      <div className="orb orb-violet w-[500px] h-[500px] -top-40 -left-40 fixed animate-float opacity-30" />
      <div className="orb orb-cyan w-[400px] h-[400px] top-1/3 -right-32 fixed animate-float-delayed opacity-20" />
      <div className="orb orb-emerald w-[350px] h-[350px] bottom-20 left-1/4 fixed animate-float opacity-20" />

      <div className="relative z-10 flex flex-1 flex-col">
        <Navbar />

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-12 pb-24 sm:pt-20 sm:pb-32">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div
              className={`mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 glass-subtle px-4 py-1.5 text-xs text-zinc-300 transition-all duration-700 ${
                showHero ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live on Stellar Testnet · Soroban SDK v25
            </div>

            {/* Heading */}
            <h1
              className={`mb-6 text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-zinc-100 leading-[1.1] transition-all duration-700 delay-100 ${
                showHero ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              Decentralized Recurring
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                Subscriptions on Stellar
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className={`mb-10 text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${
                showHero ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              Non-custodial, deposit-backed recurring billing for Web3 applications. Publish tiers, deposit tokens, automate interval charges, and claim merchant revenue in pure Soroban smart contracts.
            </p>

            {/* CTA Buttons */}
            <div
              className={`flex flex-col sm:flex-row items-center justify-center gap-3 transition-all duration-700 delay-300 ${
                showHero ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <button
                onClick={handleConnect}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 hover:from-violet-500 hover:to-indigo-500 px-7 py-3.5 text-xs sm:text-sm font-bold text-white shadow-xl shadow-violet-900/30 transition-all glow-violet"
              >
                <Wallet className="h-4 w-4" />
                Launch Subscriber Hub
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => router.push("/merchant")}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 hover:border-zinc-700 px-6 py-3.5 text-xs sm:text-sm font-semibold text-zinc-200 transition-all"
              >
                <Store className="h-4 w-4 text-violet-400" />
                Merchant Portal
              </button>

              <button
                onClick={handleLaunchDemo}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-5 py-3.5 text-xs sm:text-sm font-semibold text-amber-300 transition-all"
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
                Instant Demo
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div
            className={`mt-14 sm:mt-18 w-full max-w-3xl transition-all duration-700 delay-500 ${
              showHero ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl border border-zinc-800/80 bg-zinc-800/40 overflow-hidden shadow-2xl">
              {[
                { label: "Blockchain", value: "Stellar" },
                { label: "Smart Contracts", value: "Soroban v25" },
                { label: "Settlement Finality", value: "~5s Finality" },
                { label: "Custody", value: "100% Non-Custodial" },
              ].map((stat) => (
                <div key={stat.label} className="bg-zinc-950/90 px-4 py-4 text-center">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">
                    {stat.label}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-zinc-200">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features grid */}
          <div className="mt-24 sm:mt-32 w-full max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 mb-3">
                Full-Stack Recurring Payments on Stellar
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
                Everything required to operate a web3 SaaS, membership club, or decentralized subscription service.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 glass-subtle p-6 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className={`inline-flex rounded-xl bg-gradient-to-br ${f.gradient} p-3 shadow-lg mb-4`}>
                      <f.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-100 mb-2">
                      {f.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="mt-24 sm:mt-32 w-full max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 mb-3">
                How It Works
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Simple three-step workflow from wallet connection to automated billing.
              </p>
            </div>
            <div className="space-y-4">
              {STEPS.map((step) => (
                <div
                  key={step.num}
                  className="flex items-start gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 glass-subtle p-5 hover:border-zinc-700/80 transition-all"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/20">
                    <step.icon className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-violet-400">
                        {step.num}
                      </span>
                      <h3 className="text-sm font-bold text-zinc-200">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600 mt-1 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Launch Banner */}
          <div className="mt-24 sm:mt-32 w-full max-w-xl text-center">
            <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/40 glass-subtle p-8 sm:p-12">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-2">
                Ready to explore?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mb-6">
                Test the smart contract subscription lifecycle on Stellar Testnet right now.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleConnect}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-violet-900/30 transition-all"
                >
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </button>
                <button
                  onClick={handleLaunchDemo}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-6 py-3 text-xs font-semibold text-zinc-300 transition-all"
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Try Demo Mode
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800/60 px-6 py-6 bg-zinc-950">
          <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600">
                <Layers className="h-3 w-3 text-white" />
              </div>
              <span className="font-semibold text-zinc-300">SorobanPay Subscriptions</span>
            </div>
            <span>Built with Soroban SDK v25 · Stellar Testnet</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
