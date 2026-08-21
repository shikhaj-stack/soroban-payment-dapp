import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}

export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CBKMFIRGM6VRW2ZMJCBIGFT7CNFUQJ5GFO7GUY2ML6RQKVZ3VD3HXAJP",
  }
} as const;

export type DataKey =
  | { tag: "Admin"; values: void }
  | { tag: "Token"; values: void }
  | { tag: "Tier"; values: readonly [u32] }
  | { tag: "TierCount"; values: void }
  | { tag: "Subscriber"; values: readonly [string] }
  | { tag: "Balance"; values: readonly [string] }
  | { tag: "MerchantEarnings"; values: void };

export interface Subscriber {
  active: boolean;
  paused: boolean;
  last_payment: u64;
  tier_id: u32;
}

export interface SubscriptionTier {
  id: u32;
  interval: u64;
  price: i128;
}

export interface Client {
  initialize: ({ admin, token }: { admin: string; token: string }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>;
  get_token: (options?: MethodOptions) => Promise<AssembledTransaction<string>>;
  get_merchant_earnings: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>;
  get_tier_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
  get_tier: ({ tier_id }: { tier_id: u32 }, options?: MethodOptions) => Promise<AssembledTransaction<SubscriptionTier>>;
  create_tier: ({ admin, tier_id, price, interval }: { admin: string; tier_id: u32; price: i128; interval: u64 }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
  update_tier: ({ admin, tier_id, price, interval }: { admin: string; tier_id: u32; price: i128; interval: u64 }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
  subscribe: ({ user, tier_id, initial_deposit }: { user: string; tier_id: u32; initial_deposit: i128 }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
  deposit_funds: ({ user, amount }: { user: string; amount: i128 }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
  withdraw_funds: ({ user, amount }: { user: string; amount: i128 }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
  pause_subscription: ({ user }: { user: string }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
  resume_subscription: ({ user }: { user: string }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
  cancel_subscription: ({ user }: { user: string }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
  charge_billing: ({ merchant, user }: { merchant: string; user: string }, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>;
  charge_billing_batch: ({ merchant, users }: { merchant: string; users: string[] }, options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
  withdraw_merchant_earnings: ({ admin, amount }: { admin: string; amount: i128 }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
  get_subscriber: ({ user }: { user: string }, options?: MethodOptions) => Promise<AssembledTransaction<Subscriber>>;
  has_subscriber: ({ user }: { user: string }, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>;
  get_balance: ({ user }: { user: string }, options?: MethodOptions) => Promise<AssembledTransaction<i128>>;
  is_subscription_due: ({ user }: { user: string }, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>;
}

export class Client extends ContractClient {
  static async deploy<T = Client>(
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        wasmHash: Buffer | string;
        salt?: Buffer | Uint8Array;
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options);
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABQAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAFVG9rZW4AAAAAAAABAAAAAAAAAARUaWVyAAAAAQAAAAQAAAABAAAAAAAAAApTdWJzY3JpYmVyAAAAAAABAAAAEwAAAAEAAAAAAAAAB0JhbGFuY2UAAAAAAQAAABM=",
        "AAAAAQAAAAAAAAAAAAAAClN1YnNjcmliZXIAAAAAAAMAAAAAAAAABmFjdGl2ZQAAAAAAAQAAAAAAAAAMbGFzdF9wYXltZW50AAAABgAAAAAAAAAHdGllcl9pZAAAAAAE",
        "AAAAAQAAAAAAAAAAAAAAEFN1YnNjcmlwdGlvblRpZXIAAAADAAAAAAAAAAJpZAAAAAAABAAAAAAAAAAIaW50ZXJ2YWwAAAAGAAAAAAAAAAVwcmljZQAAAAAAAAs=",
        "AAAAAAAAAAAAAAAIZ2V0X3RpZXIAAAABAAAAAAAAAAd0aWVyX2lkAAAAAAQAAAABAAAH0AAAABBTdWJzY3JpcHRpb25UaWVy",
        "AAAAAAAAAAAAAAAJc3Vic2NyaWJlAAAAAAAAAwAAAAAAAAAEdXNlcgAAABMAAAAAAAAAB3RpZXJfaWQAAAAABAAAAAAAAAAPaW5pdGlhbF9kZXBvc2l0AAAAAAsAAAAA",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAV0b2tlbgAAAAAAABMAAAAA",
        "AAAAAAAAAAAAAAALY3JlYXRlX3RpZXIAAAAABAAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAd0aWVyX2lkAAAAAAQAAAAAAAAABXByaWNlAAAAAAAACwAAAAAAAAAIaW50ZXJ2YWwAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAALZ2V0X2JhbGFuY2UAAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAACw==",
        "AAAAAAAAAAAAAAANZGVwb3NpdF9mdW5kcwAAAAAAAAIAAAAAAAAABHVzZXIAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAAAAAAAOY2hhcmdlX2JpbGxpbmcAAAAAAAIAAAAAAAAACG1lcmNoYW50AAAAEwAAAAAAAAAEdXNlcgAAABMAAAAA",
        "AAAAAAAAAAAAAAAOZ2V0X3N1YnNjcmliZXIAAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAB9AAAAAKU3Vic2NyaWJlcgAA",
        "AAAAAAAAAAAAAAATY2FuY2VsX3N1YnNjcmlwdGlvbgAAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAA="
      ]),
      options
    );
  }
  public readonly fromJSON = {
    get_tier: this.txFromJSON<SubscriptionTier>,
    subscribe: this.txFromJSON<null>,
    initialize: this.txFromJSON<null>,
    create_tier: this.txFromJSON<null>,
    update_tier: this.txFromJSON<null>,
    get_balance: this.txFromJSON<i128>,
    deposit_funds: this.txFromJSON<null>,
    withdraw_funds: this.txFromJSON<null>,
    pause_subscription: this.txFromJSON<null>,
    resume_subscription: this.txFromJSON<null>,
    charge_billing: this.txFromJSON<boolean>,
    charge_billing_batch: this.txFromJSON<u32>,
    withdraw_merchant_earnings: this.txFromJSON<null>,
    get_merchant_earnings: this.txFromJSON<i128>,
    get_subscriber: this.txFromJSON<Subscriber>,
    cancel_subscription: this.txFromJSON<null>,
    get_admin: this.txFromJSON<string>,
    get_token: this.txFromJSON<string>,
    get_tier_count: this.txFromJSON<u32>,
    is_subscription_due: this.txFromJSON<boolean>,
    has_subscriber: this.txFromJSON<boolean>,
  };
}