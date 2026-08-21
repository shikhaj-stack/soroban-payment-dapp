"use client";

import { useTxStore, type TxRecord } from "@/lib/store";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  History,
  FileText,
} from "lucide-react";

function TxStatusIcon({ status }: { status: TxRecord["status"] }) {
  switch (status) {
    case "pending":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
        </div>
      );
    case "success":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      );
    case "failed":
      return (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
          <XCircle className="h-3.5 w-3.5 text-red-400" />
        </div>
      );
  }
}

function TxStatusLabel({ status }: { status: TxRecord["status"] }) {
  const config: Record<
    string,
    { label: string; cls: string }
  > = {
    pending: {
      label: "Pending",
      cls: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    success: {
      label: "Success",
      cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    failed: {
      label: "Failed",
      cls: "text-red-400 bg-red-500/10 border-red-500/20",
    },
  };
  const { label, cls } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

function formatMethod(method: string): string {
  const names: Record<string, string> = {
    subscribe: "Subscribe",
    deposit_funds: "Deposit",
    cancel_subscription: "Cancel",
    charge_billing: "Billing",
  };
  return names[method] ?? method;
}

function shortenHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

export default function TransactionTracker() {
  const transactions = useTxStore((s) => s.transactions);

  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 glass-subtle overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-zinc-600" />
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Transactions
          </h3>
          {transactions.length > 0 && (
            <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-500 font-mono">
              {transactions.length}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-zinc-800/30 max-h-64 overflow-y-auto">
        {transactions.length === 0 && (
          <div className="px-4 py-8 text-center">
            <History className="h-5 w-5 text-zinc-800 mx-auto mb-2" />
            <p className="text-xs text-zinc-600">
              No transactions yet
            </p>
          </div>
        )}

        {transactions.map((tx) => (
          <div
            key={tx.hash}
            className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors"
          >
            <TxStatusIcon status={tx.status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-300 font-semibold">
                  {formatMethod(tx.method)}
                </span>
                <TxStatusLabel status={tx.status} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {!tx.hash.startsWith("pending-") ? (
                  <a
                    href={`https://stellar.expert/testnet/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-violet-400 font-mono transition-colors"
                  >
                    {shortenHash(tx.hash)}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : (
                  <span className="text-[10px] text-zinc-700 font-mono">
                    broadcasting...
                  </span>
                )}
              </div>
              {tx.error && (
                <p
                  className="mt-0.5 text-[10px] text-red-400/60 truncate"
                  title={tx.error}
                >
                  {tx.error}
                </p>
              )}
            </div>
            <span className="text-[10px] text-zinc-700 shrink-0 font-mono">
              {new Date(tx.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
