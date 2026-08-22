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

/* ────────── Reactive Contract State Store ────────── */

export interface StoredSubscriber {
  tier_id: number;
  last_payment: number;
  active: boolean;
  paused: boolean;
}

export interface StoredTier {
  id: number;
  price: string; // stroops as string
  interval: string; // seconds as string
  name?: string;
}

export interface StoredEvent {
  txHash: string;
  topic: string;
  value: unknown;
  ledger: number;
  timestamp: number;
}

interface ContractState {
  // Address -> balance in stroops as string
  balances: Record<string, string>;
  // Address -> subscriber info
  subscribers: Record<string, StoredSubscriber>;
  // Merchant earnings in stroops
  merchantEarnings: string;
  // Custom tiers published
  customTiers: StoredTier[];
  // Reactive live contract events
  customEvents: StoredEvent[];

  getBalance: (address: string) => bigint;
  setBalance: (address: string, amount: bigint) => void;
  addBalance: (address: string, amount: bigint) => void;
  deductBalance: (address: string, amount: bigint) => boolean;

  getSubscriber: (address: string) => StoredSubscriber | null;
  setSubscriber: (address: string, sub: StoredSubscriber) => void;
  updateSubscriber: (address: string, updates: Partial<StoredSubscriber>) => void;

  getMerchantEarnings: () => bigint;
  addMerchantEarnings: (amount: bigint) => void;
  withdrawMerchantEarnings: (amount: bigint) => boolean;

  addCustomTier: (tier: StoredTier) => void;
  addEvent: (event: StoredEvent) => void;
}

export const useContractStore = create<ContractState>()(
  persist(
    (set, get) => ({
      balances: {
        // Default initial balances for demo accounts
        GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFXYORTMB35THQI2TTOHS: "500000000",
      },
      subscribers: {},
      merchantEarnings: "150000000",
      customTiers: [],
      customEvents: [],

      getBalance: (address: string) => {
        const str = get().balances[address];
        return str ? BigInt(str) : 0n;
      },

      setBalance: (address: string, amount: bigint) => {
        set((state) => ({
          balances: { ...state.balances, [address]: amount.toString() },
        }));
      },

      addBalance: (address: string, amount: bigint) => {
        const current = get().getBalance(address);
        const next = current + amount;
        set((state) => ({
          balances: { ...state.balances, [address]: next.toString() },
        }));
      },

      deductBalance: (address: string, amount: bigint) => {
        const current = get().getBalance(address);
        if (current < amount) return false;
        const next = current - amount;
        set((state) => ({
          balances: { ...state.balances, [address]: next.toString() },
        }));
        return true;
      },

      getSubscriber: (address: string) => {
        return get().subscribers[address] ?? null;
      },

      setSubscriber: (address: string, sub: StoredSubscriber) => {
        set((state) => ({
          subscribers: { ...state.subscribers, [address]: sub },
        }));
      },

      updateSubscriber: (address: string, updates: Partial<StoredSubscriber>) => {
        const current = get().subscribers[address];
        if (!current) return;
        set((state) => ({
          subscribers: {
            ...state.subscribers,
            [address]: { ...current, ...updates },
          },
        }));
      },

      getMerchantEarnings: () => {
        return BigInt(get().merchantEarnings || "0");
      },

      addMerchantEarnings: (amount: bigint) => {
        const current = get().getMerchantEarnings();
        set({ merchantEarnings: (current + amount).toString() });
      },

      withdrawMerchantEarnings: (amount: bigint) => {
        const current = get().getMerchantEarnings();
        if (current < amount) return false;
        set({ merchantEarnings: (current - amount).toString() });
        return true;
      },

      addCustomTier: (tier: StoredTier) => {
        set((state) => ({
          customTiers: [
            ...state.customTiers.filter((t) => t.id !== tier.id),
            tier,
          ],
        }));
      },

      addEvent: (event: StoredEvent) => {
        set((state) => ({
          customEvents: [event, ...state.customEvents].slice(0, 50),
        }));
      },
    }),
    {
      name: "soroban-contract-state",
    }
  )
);

/* ────────── Global Toast Notification Store ────────── */

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  title?: string;
  message: string;
  timestamp: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (type: "success" | "error" | "info", message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message, title) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, title, timestamp: Date.now() }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4500);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
