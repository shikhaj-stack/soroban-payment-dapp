import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WalletState {
  address: string;
  isConnected: boolean;
  isConnecting: boolean;
  isDemoMode: boolean;
  demoSecret: string;
  role: "subscriber" | "merchant";
  error: string | null;
  setAddress: (address: string) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setDemoMode: (isDemo: boolean, secret?: string) => void;
  setRole: (role: "subscriber" | "merchant") => void;
  setError: (error: string | null) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: "",
      isConnected: false,
      isConnecting: false,
      isDemoMode: false,
      demoSecret: "",
      role: "subscriber",
      error: null,
      setAddress: (address) => set({ address, isConnected: !!address }),
      setConnected: (isConnected) => set({ isConnected }),
      setConnecting: (isConnecting) => set({ isConnecting }),
      setDemoMode: (isDemoMode, demoSecret = "") =>
        set({ isDemoMode, demoSecret }),
      setRole: (role) => set({ role }),
      setError: (error) => set({ error }),
      disconnect: () =>
        set({
          address: "",
          isConnected: false,
          isDemoMode: false,
          demoSecret: "",
          error: null,
        }),
    }),
    {
      name: "soroban-wallet-storage",
      partialize: (state) => ({
        address: state.address,
        isConnected: state.isConnected,
        isDemoMode: state.isDemoMode,
        demoSecret: state.demoSecret,
        role: state.role,
      }),
    }
  )
);

export interface TxRecord {
  hash: string;
  method: string;
  status: "pending" | "success" | "failed";
  timestamp: number;
  error?: string;
}

interface TxState {
  transactions: TxRecord[];
  addTransaction: (tx: TxRecord) => void;
  updateTransaction: (hash: string, updates: Partial<TxRecord>) => void;
  clearTransactions: () => void;
}

export const useTxStore = create<TxState>()(
  persist(
    (set) => ({
      transactions: [],
      addTransaction: (tx) =>
        set((state) => ({
          transactions: [tx, ...state.transactions].slice(0, 50),
        })),
      updateTransaction: (hash, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.hash === hash ? { ...t, ...updates } : t
          ),
        })),
      clearTransactions: () => set({ transactions: [] }),
    }),
    {
      name: "soroban-tx-storage",
    }
  )
);
