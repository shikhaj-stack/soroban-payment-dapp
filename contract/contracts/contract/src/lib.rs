#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SubscriptionTier {
    pub id: u32,
    pub price: i128,
    pub interval: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Subscriber {
    pub tier_id: u32,
    pub last_payment: u64,
    pub active: bool,
    pub paused: bool,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    Tier(u32),
    TierCount,
    Subscriber(Address),
    Balance(Address),
    MerchantEarnings,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("contract already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::TierCount, &0u32);
        env.storage().instance().set(&DataKey::MerchantEarnings, &0i128);
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).expect("admin not set")
    }

    pub fn get_token(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Token).expect("token not set")
    }

    pub fn get_merchant_earnings(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::MerchantEarnings).unwrap_or(0)
    }

    pub fn get_tier_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TierCount).unwrap_or(0)
    }

    pub fn create_tier(env: Env, admin: Address, tier_id: u32, price: i128, interval: u64) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "only admin can create tiers");
        assert!(price > 0, "price must be positive");
        assert!(interval > 0, "interval must be positive");

        let tier = SubscriptionTier {
            id: tier_id,
            price,
            interval,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Tier(tier_id), &tier);

        let current_count: u32 = env.storage().instance().get(&DataKey::TierCount).unwrap_or(0);
        if tier_id > current_count {
            env.storage().instance().set(&DataKey::TierCount, &tier_id);
        }

        env.events().publish(
            (Symbol::new(&env, "tier_created"),),
            (tier_id, price, interval),
        );
    }

    pub fn update_tier(env: Env, admin: Address, tier_id: u32, price: i128, interval: u64) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "only admin can update tiers");
        assert!(price > 0, "price must be positive");
        assert!(interval > 0, "interval must be positive");

        assert!(
            env.storage().persistent().has(&DataKey::Tier(tier_id)),
            "tier not found"
        );

        let tier = SubscriptionTier {
            id: tier_id,
            price,
            interval,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Tier(tier_id), &tier);

        env.events().publish(
            (Symbol::new(&env, "tier_updated"),),
            (tier_id, price, interval),
        );
    }

    pub fn subscribe(env: Env, user: Address, tier_id: u32, initial_deposit: i128) {
        user.require_auth();
        let _tier: SubscriptionTier = env
            .storage()
            .persistent()
            .get(&DataKey::Tier(tier_id))
            .expect("tier not found");

        if initial_deposit > 0 {
            let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
            token::Client::new(&env, &token_addr).transfer(
                &user,
                &env.current_contract_address(),
                &initial_deposit,
            );

            let current_balance: i128 = env
                .storage()
                .persistent()
                .get(&DataKey::Balance(user.clone()))
                .unwrap_or(0);
            env.storage().persistent().set(
                &DataKey::Balance(user.clone()),
                &(current_balance + initial_deposit),
            );
        }

        let subscriber = Subscriber {
            tier_id,
            last_payment: env.ledger().timestamp(),
            active: true,
            paused: false,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Subscriber(user.clone()), &subscriber);

        env.events().publish(
            (Symbol::new(&env, "subscribed"),),
            (user, tier_id, env.ledger().timestamp()),
        );
    }

    pub fn deposit_funds(env: Env, user: Address, amount: i128) {
        user.require_auth();
        assert!(amount > 0, "amount must be positive");
        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_addr).transfer(
            &user,
            &env.current_contract_address(),
            &amount,
        );

        let current_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(user.clone()))
            .unwrap_or(0);
        env.storage().persistent().set(
            &DataKey::Balance(user.clone()),
            &(current_balance + amount),
        );

        env.events().publish(
            (Symbol::new(&env, "deposited"),),
            (user, amount, env.ledger().timestamp()),
        );
    }

    pub fn withdraw_funds(env: Env, user: Address, amount: i128) {
        user.require_auth();
        assert!(amount > 0, "amount must be positive");
        let current_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(user.clone()))
            .unwrap_or(0);
        assert!(current_balance >= amount, "insufficient deposited balance");

        env.storage().persistent().set(
            &DataKey::Balance(user.clone()),
            &(current_balance - amount),
        );

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_addr).transfer(
            &env.current_contract_address(),
            &user,
            &amount,
        );

        env.events().publish(
            (Symbol::new(&env, "withdrawn"),),
            (user, amount, env.ledger().timestamp()),
        );
    }

    pub fn pause_subscription(env: Env, user: Address) {
        user.require_auth();
        let mut subscriber: Subscriber = env
            .storage()
            .persistent()
            .get(&DataKey::Subscriber(user.clone()))
            .expect("not a subscriber");
        assert!(subscriber.active, "subscription is inactive");
        assert!(!subscriber.paused, "subscription is already paused");

        subscriber.paused = true;
        env.storage()
            .persistent()
            .set(&DataKey::Subscriber(user.clone()), &subscriber);

        env.events().publish(
            (Symbol::new(&env, "paused"),),
            (user, subscriber.tier_id, env.ledger().timestamp()),
        );
    }

    pub fn resume_subscription(env: Env, user: Address) {
        user.require_auth();
        let mut subscriber: Subscriber = env
            .storage()
            .persistent()
            .get(&DataKey::Subscriber(user.clone()))
            .expect("not a subscriber");
        assert!(subscriber.active, "subscription is inactive");
        assert!(subscriber.paused, "subscription is not paused");

        subscriber.paused = false;
        env.storage()
            .persistent()
            .set(&DataKey::Subscriber(user.clone()), &subscriber);

        env.events().publish(
            (Symbol::new(&env, "resumed"),),
            (user, subscriber.tier_id, env.ledger().timestamp()),
        );
    }

    pub fn charge_billing(env: Env, merchant: Address, user: Address) -> bool {
        merchant.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(merchant == admin, "only admin can charge billing");

        let subscriber: Subscriber = env
            .storage()
            .persistent()
            .get(&DataKey::Subscriber(user.clone()))
            .expect("not a subscriber");
        assert!(subscriber.active, "subscription is inactive");
        assert!(!subscriber.paused, "subscription is paused");

        let tier: SubscriptionTier = env
            .storage()
            .persistent()
            .get(&DataKey::Tier(subscriber.tier_id))
            .expect("tier not found");

        let now = env.ledger().timestamp();
        assert!(
            now >= subscriber.last_payment + tier.interval,
            "billing interval not elapsed"
        );

        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(user.clone()))
            .unwrap_or(0);

        let tier_id = subscriber.tier_id;
        if balance >= tier.price {
            env.storage().persistent().set(
                &DataKey::Balance(user.clone()),
                &(balance - tier.price),
            );

            let earnings: i128 = env
                .storage()
                .instance()
                .get(&DataKey::MerchantEarnings)
                .unwrap_or(0);
            env.storage()
                .instance()
                .set(&DataKey::MerchantEarnings, &(earnings + tier.price));

            let mut updated = subscriber;
            updated.last_payment = now;
            env.storage()
                .persistent()
                .set(&DataKey::Subscriber(user.clone()), &updated);
            env.events().publish(
                (Symbol::new(&env, "billing"),),
                (user, tier.price, now),
            );
            true
        } else {
            let mut updated = subscriber;
            updated.active = false;
            env.storage()
                .persistent()
                .set(&DataKey::Subscriber(user.clone()), &updated);
            env.events().publish(
                (Symbol::new(&env, "cancelled"),),
                (user, tier_id, now),
            );
            false
        }
    }

    pub fn charge_billing_batch(env: Env, merchant: Address, users: Vec<Address>) -> u32 {
        merchant.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(merchant == admin, "only admin can charge billing");

        let mut success_count: u32 = 0;
        for user in users.iter() {
            if let Some(subscriber) = env
                .storage()
                .persistent()
                .get::<DataKey, Subscriber>(&DataKey::Subscriber(user.clone()))
            {
                if subscriber.active && !subscriber.paused {
                    if let Some(tier) = env
                        .storage()
                        .persistent()
                        .get::<DataKey, SubscriptionTier>(&DataKey::Tier(subscriber.tier_id))
                    {
                        let now = env.ledger().timestamp();
                        if now >= subscriber.last_payment + tier.interval {
                            let balance: i128 = env
                                .storage()
                                .persistent()
                                .get(&DataKey::Balance(user.clone()))
                                .unwrap_or(0);

                            if balance >= tier.price {
                                env.storage().persistent().set(
                                    &DataKey::Balance(user.clone()),
                                    &(balance - tier.price),
                                );

                                let earnings: i128 = env
                                    .storage()
                                    .instance()
                                    .get(&DataKey::MerchantEarnings)
                                    .unwrap_or(0);
                                env.storage().instance().set(
                                    &DataKey::MerchantEarnings,
                                    &(earnings + tier.price),
                                );

                                let mut updated = subscriber;
                                updated.last_payment = now;
                                env.storage()
                                    .persistent()
                                    .set(&DataKey::Subscriber(user.clone()), &updated);
                                env.events().publish(
                                    (Symbol::new(&env, "billing"),),
                                    (user, tier.price, now),
                                );
                                success_count += 1;
                            } else {
                                let mut updated = subscriber;
                                updated.active = false;
                                env.storage()
                                    .persistent()
                                    .set(&DataKey::Subscriber(user.clone()), &updated);
                                env.events().publish(
                                    (Symbol::new(&env, "cancelled"),),
                                    (user, subscriber.tier_id, now),
                                );
                            }
                        }
                    }
                }
            }
        }
        success_count
    }

    pub fn withdraw_merchant_earnings(env: Env, admin: Address, amount: i128) {
        admin.require_auth();
        let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        assert!(admin == stored_admin, "only admin can withdraw earnings");
        assert!(amount > 0, "amount must be positive");

        let earnings: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MerchantEarnings)
            .unwrap_or(0);
        assert!(earnings >= amount, "insufficient merchant earnings");

        env.storage()
            .instance()
            .set(&DataKey::MerchantEarnings, &(earnings - amount));

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_addr).transfer(
            &env.current_contract_address(),
            &admin,
            &amount,
        );

        env.events().publish(
            (Symbol::new(&env, "merchant_withdrawn"),),
            (admin, amount, env.ledger().timestamp()),
        );
    }

    pub fn cancel_subscription(env: Env, user: Address) {
        user.require_auth();
        let mut subscriber: Subscriber = env
            .storage()
            .persistent()
            .get(&DataKey::Subscriber(user.clone()))
            .expect("not a subscriber");
        let tier_id = subscriber.tier_id;
        subscriber.active = false;
        subscriber.paused = false;
        env.storage()
            .persistent()
            .set(&DataKey::Subscriber(user.clone()), &subscriber);
        env.events().publish(
            (Symbol::new(&env, "cancelled"),),
            (user, tier_id, env.ledger().timestamp()),
        );
    }

    pub fn get_tier(env: Env, tier_id: u32) -> SubscriptionTier {
        env.storage()
            .persistent()
            .get(&DataKey::Tier(tier_id))
            .expect("tier not found")
    }

    pub fn get_subscriber(env: Env, user: Address) -> Subscriber {
        env.storage()
            .persistent()
            .get(&DataKey::Subscriber(user))
            .expect("not a subscriber")
    }

    pub fn has_subscriber(env: Env, user: Address) -> bool {
        env.storage().persistent().has(&DataKey::Subscriber(user))
    }

    pub fn get_balance(env: Env, user: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(user))
            .unwrap_or(0)
    }

    pub fn is_subscription_due(env: Env, user: Address) -> bool {
        if let Some(subscriber) = env
            .storage()
            .persistent()
            .get::<DataKey, Subscriber>(&DataKey::Subscriber(user))
        {
            if !subscriber.active || subscriber.paused {
                return false;
            }
            if let Some(tier) = env
                .storage()
                .persistent()
                .get::<DataKey, SubscriptionTier>(&DataKey::Tier(subscriber.tier_id))
            {
                return env.ledger().timestamp() >= subscriber.last_payment + tier.interval;
            }
        }
        false
    }
}

mod test;
