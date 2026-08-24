"use client";

import {
  useEvents,
  formatEvent,
  formatTimestamp,
} from "@/hooks/useEvents";
import { getExplorerUrl } from "@/lib/stellar";
import { RefreshCw, ArrowUpRight, Activity, Rss } from "lucide-react";

function EventDot({ topic }: { topic: string }) {
  const colors: Record<string, string> = {
    subscribed: "bg-emerald-400 shadow-emerald-400/40",
    billing: "bg-blue-400 shadow-blue-400/40",
    cancelled: "bg-red-400 shadow-red-400/40",
    deposited: "bg-cyan-400 shadow-cyan-400/40",
    withdrawn: "bg-amber-400 shadow-amber-400/40",
    paused: "bg-yellow-400 shadow-yellow-400/40",
    resumed: "bg-emerald-400 shadow-emerald-400/40",
    tier_created: "bg-purple-400 shadow-purple-400/40",
    merchant_withdrawn: "bg-violet-400 shadow-violet-400/40",
  };

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div
        className={`h-2.5 w-2.5 rounded-full shadow-lg ${
          colors[topic] ?? "bg-zinc-500 shadow-zinc-500/40"
        }`}
      />
    </div>
  );
}

export default function ActivityFeed() {
  const { events, loading, error, refetch } = useEvents(15000);

  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 glass-subtle overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <Rss className="h-3.5 w-3.5 text-zinc-600" />
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Activity
          </h3>
          {events.length > 0 && (
            <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-500 font-mono">
              {events.length}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-all disabled:opacity-50"
        >
          <RefreshCw
            className={`h-2.5 w-2.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="divide-y divide-zinc-800/30 max-h-72 overflow-y-auto">
        {error && (
          <div className="px-4 py-2.5 text-[11px] text-amber-400/80 bg-amber-950/10">
            {error}
          </div>
        )}

        {events.length === 0 && !loading && (
          <div className="px-4 py-8 text-center">
            <Activity className="h-5 w-5 text-zinc-800 mx-auto mb-2" />
            <p className="text-xs text-zinc-600">
              No events yet
            </p>
          </div>
        )}

        {events.map((event, i) => (
          <div
            key={`${event.txHash}-${event.topic}-${i}`}
            className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors"
          >
            <EventDot topic={event.topic} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-300 font-medium">
                {formatEvent(event)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-600 font-mono">
                  #{event.ledger.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-700">·</span>
                <span className="text-[10px] text-zinc-600">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
            </div>
            <a
              href={getExplorerUrl("tx", event.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-zinc-700 hover:text-zinc-400 transition-colors p-0.5"
              title="View on Stellar Expert"
            >
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        ))}
      </div>

      {loading && events.length === 0 && (
        <div className="px-4 py-6 flex items-center justify-center gap-2 text-xs text-zinc-600">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Loading...
        </div>
      )}
    </div>
  );
}
