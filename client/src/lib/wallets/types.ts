export type WalletType =
  | "freighter"
  | "albedo"
  | "xbull"
  | "rabet"
  | "hana"
  | "secret_key"
  | "demo";

export interface WalletProviderInfo {
  id: WalletType;
  name: string;
  shortDesc: string;
  category: "extension" | "web" | "dev";
  iconName: string;
  badge?: string;
  installUrl?: string;
  isWebReady: boolean;
  recommended?: boolean;
}

export interface WalletConnectionResult {
  address: string;
  walletType: WalletType;
  walletName: string;
  secretKey?: string;
}
