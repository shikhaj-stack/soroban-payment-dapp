import { create } from "zustand";
import { persist } from "zustand/middleware";
import { WalletType } from "./wallets/types";

export interface WalletState {
  address: string;
  walletType: WalletType | null;
  walletName: string;
  isConnected: boolean;
  isConnecting: boolean;
  isDemoMode: boolean;
  demoSecret: string;
  role: "subscriber" | "merchant";
  error: string | null;
  isModalOpen: boolean;
  setAddress: (address: string) => void;
  setWalletInfo: (info: {
    address: string;
    walletType: WalletType;
    walletName: string;
    secretKey?: string;
  }) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setDemoMode: (isDemo: boolean, secret?: string) => void;
  setRole: (role: "subscriber" | "merchant") => void;
  setError: (error: string | null) => void;
  setModalOpen: (open: boolean) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: "",
      walletType: null,
      walletName: "",
      isConnected: false,
      isConnecting: false,
      isDemoMode: false,
      demoSecret: "",
      role: "subscriber",
      error: null,
      isModalOpen: false,
      setAddress: (address) => set({ address, isConnected: !!address }),
      setWalletInfo: ({ address, walletType, walletName, secretKey }) =>
        set({
          address,
          walletType,
          walletName,
          isConnected: !!address,
          isDemoMode: walletType === "demo" || walletType === "secret_key",
          demoSecret: secretKey ?? "",
          error: null,
          isModalOpen: false,
        }),
      setConnected: (isConnected) => set({ isConnected }),
      setConnecting: (isConnecting) => set({ isConnecting }),
      setDemoMode: (isDemoMode, demoSecret = "") =>
        set({
          isDemoMode,
          demoSecret,
          walletType: isDemoMode ? "demo" : null,
          walletName: isDemoMode ? "Demo Account" : "",
        }),
      setRole: (role) => set({ role }),
      setError: (error) => set({ error }),
      setModalOpen: (isModalOpen) => set({ isModalOpen }),
      disconnect: () =>
        set({
          address: "",
          walletType: null,
          walletName: "",
          isConnected: false,
          isDemoMode: false,
          demoSecret: "",
          error: null,
          isModalOpen: false,
        }),
    }),
    {
      name: "soroban-wallet-storage",
      partialize: (state) => ({
        address: state.address,
        walletType: state.walletType,
        walletName: state.walletName,
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
