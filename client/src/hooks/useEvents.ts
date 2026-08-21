"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { server, StellarSdk } from "@/lib/stellar";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "CBKMFIRGM6VRW2ZMJCBIGFT7CNFUQJ5GFO7GUY2ML6RQKVZ3VD3HXAJP";

export interface ContractEvent {
  txHash: string;
  topic: string;
  value: unknown;
  ledger: number;
  timestamp: number;
}

async function getContractEvents(
  startLedger?: number,
): Promise<ContractEvent[]> {
  try {
    const result = await server.getEvents({
      ...(startLedger ? { startLedger } : { cursor: "0" }),
      filters: [
        {
          type: "contract",
          contractIds: [CONTRACT_ADDRESS],
        },
      ],
      limit: 50,
    });

    return result.events.map((e) => {
      const topics = e.topic.map((t) => {
        try {
          return String(StellarSdk.scValToNative(t));
        } catch {
          return "unknown";
        }
      });

      let value: unknown;
      try {
        value = e.value ? StellarSdk.scValToNative(e.value) : null;
      } catch {
        value = null;
      }

      return {
        txHash: e.txHash,
        topic: topics[0] ?? "unknown",
        value,
        ledger: e.ledger,
        timestamp: 0,
      };
    });
  } catch {
    return [];
  }
}

export function useEvents(pollIntervalMs: number = 15000) {
  const [events, setEvents] = useState<ContractEvent[]>(DEMO_EVENTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLedger, setLastLedger] = useState<number | undefined>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!CONTRACT_ADDRESS) {
      setEvents(DEMO_EVENTS);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const newEvents = await getContractEvents(lastLedger);
      if (newEvents.length > 0) {
        setEvents((prev) => {
          const merged = [...newEvents, ...prev];
          const unique = merged.filter(
            (e, i, arr) =>
              arr.findIndex((x) => x.txHash === e.txHash && x.topic === e.topic) === i,
          );
          return unique.slice(0, 50);
        });
        setLastLedger(Math.max(...newEvents.map((e) => e.ledger)));
      } else if (events.length === 0) {
        setEvents(DEMO_EVENTS);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
      if (events.length === 0) {
        setEvents(DEMO_EVENTS);
      }
    } finally {
      setLoading(false);
    }
  }, [lastLedger, events.length]);

  useEffect(() => {
    fetchEvents();
    intervalRef.current = setInterval(fetchEvents, pollIntervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEvents, pollIntervalMs]);

  return { events, loading, error, refetch: fetchEvents };
}

/* ────────── Event Formatting Helpers ────────── */

export function formatEvent(event: ContractEvent): string {
  const topic = event.topic.toLowerCase();
  switch (topic) {
    case "subscribed":
      return "New subscription activated";
    case "billing":
      return "Recurring billing cycle charged";
    case "cancelled":
      return "Subscription cancelled";
    case "paused":
      return "Subscription temporarily paused";
    case "resumed":
      return "Subscription resumed";
    case "deposited":
      return "User funds deposited to contract";
    case "withdrawn":
      return "User balance withdrawn";
    case "tier_created":
      return "New subscription tier published";
    case "tier_updated":
      return "Subscription tier modified";
    case "merchant_withdrawn":
      return "Merchant claimed revenue earnings";
    default:
      return `Contract event: ${event.topic}`;
  }
}

export function formatTimestamp(ts: number): string {
  if (ts === 0) return "recently";
  return new Date(ts * 1000).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortenAddress(addr: string): string {
  if (!addr) return "";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

export function shortenHash(hash: string): string {
  if (!hash) return "";
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

/* ────────── Demo Events ────────── */

export const DEMO_EVENTS: ContractEvent[] = [
  {
    txHash: "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef12345678",
    topic: "subscribed",
    value: { address: "GBXODFXRJFZ7YBCPZP3UQ2K4", tier: 2 },
    ledger: 104521,
    timestamp: Math.floor(Date.now() / 1000) - 300,
  },
  {
    txHash: "b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
    topic: "billing",
    value: { address: "GCFGWJKUPQ7RST123XYZ", amount: 25000000 },
    ledger: 104518,
    timestamp: Math.floor(Date.now() / 1000) - 1800,
  },
  {
    txHash: "d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcd",
    topic: "deposited",
    value: { address: "GDHJR34MNO8PQ9988AABB", amount: 50000000 },
    ledger: 104505,
    timestamp: Math.floor(Date.now() / 1000) - 3600,
  },
  {
    txHash: "e5f67890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    topic: "merchant_withdrawn",
    value: { amount: 100000000 },
    ledger: 104480,
    timestamp: Math.floor(Date.now() / 1000) - 7200,
  },
];
