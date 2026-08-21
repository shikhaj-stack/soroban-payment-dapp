#![cfg(test)]
use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::testutils::Ledger as _;
use soroban_sdk::token::StellarAssetClient;
use soroban_sdk::{Address, Env, Vec};

fn setup() -> (Env, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let merchant = Address::generate(&env);
    (env, admin, user, merchant)
}

fn register_token(env: &Env, admin: &Address) -> Address {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    sac.address()
}

fn mint_tokens(env: &Env, token: &Address, to: &Address, amount: &i128) {
    let client = StellarAssetClient::new(env, token);
    client.mint(to, amount);
}

#[test]
fn test_initialize_and_getters() {
    let (env, admin, _, _) = setup();
    let token = register_token(&env, &admin);
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token);
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_token(), token);
    assert_eq!(client.get_merchant_earnings(), 0);
    assert_eq!(client.get_tier_count(), 0);

    client.create_tier(&admin, &1, &1000, &86400);
    assert_eq!(client.get_tier_count(), 1);
    let tier = client.get_tier(&1);
    assert_eq!(tier.price, 1000);
    assert_eq!(tier.interval, 86400);
}

#[test]
#[should_panic(expected = "contract already initialized")]
fn test_initialize_twice_panics() {
    let (env, admin, _, _) = setup();
    let token = register_token(&env, &admin);
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token);
    client.initialize(&admin, &token);
}

#[test]
fn test_create_and_update_tier() {
    let (env, admin, _, _) = setup();
    let token = register_token(&env, &admin);
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token);
    client.create_tier(&admin, &1, &5000, &2592000);

    let tier = client.get_tier(&1);
    assert_eq!(tier.id, 1);
    assert_eq!(tier.price, 5000);
    assert_eq!(tier.interval, 2592000);

    client.update_tier(&admin, &1, &6000, &1296000);
    let updated = client.get_tier(&1);
    assert_eq!(updated.price, 6000);
    assert_eq!(updated.interval, 1296000);
}

#[test]
#[should_panic(expected = "only admin can create tiers")]
fn test_create_tier_unauthorized() {
    let (env, admin, user, _) = setup();
    let token = register_token(&env, &admin);
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.initialize(&admin, &token);
    client.create_tier(&user, &1, &5000, &2592000);
}

#[test]
fn test_subscribe_and_withdraw_funds() {
    let (env, admin, user, _) = setup();
    let token = register_token(&env, &admin);
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    mint_tokens(&env, &token, &user, &10000);

    client.initialize(&admin, &token);
    client.create_tier(&admin, &1, &1000, &86400);
    client.subscribe(&user, &1, &5000);

    let sub = client.get_subscriber(&user);
    assert_eq!(sub.tier_id, 1);
    assert!(sub.active);
    assert!(!sub.paused);

    let balance = client.get_balance(&user);
    assert_eq!(balance, 5000);

    // Withdraw partial funds
    client.withdraw_funds(&user, &2000);
    assert_eq!(client.get_balance(&user), 3000);

    // Withdraw remaining
    client.withdraw_funds(&user, &3000);
    assert_eq!(client.get_balance(&user), 0);
}

#[test]
#[should_panic(expected = "insufficient deposited balance")]
fn test_withdraw_funds_excessive() {
    let (env, admin, user, _) = setup();
    let token = register_token(&env, &admin);
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    mint_tokens(&env, &token, &user, &10000);

    client.initialize(&admin, &token);
    client.create_tier(&admin, &1, &1000, &86400);
    client.subscribe(&user, &1, &2000);

    client.withdraw_funds(&user, &3000);
}

#[test]
fn test_pause_and_resume_subscription() {
    let (env, admin, user, _) = setup();
    let token = register_token(&env, &admin);
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    mint_tokens(&env, &token, &user, &10000);

    client.initialize(&admin, &token);
    client.create_tier(&admin, &1, &1000, &86400);
    client.subscribe(&user, &1, &5000);

    client.pause_subscription(&user);
    let sub = client.get_subscriber(&user);
    assert!(sub.paused);

    // While paused, is_subscription_due should be false even if timestamp advanced
    env.ledger().set_timestamp(100000);
    assert!(!client.is_subscription_due(&user));

    client.resume_subscription(&user);
    let sub = client.get_subscriber(&user);
    assert!(!sub.paused);
    assert!(client.is_subscription_due(&user));
}

#[test]
fn test_charge_billing_and_merchant_withdrawal() {
    let (env, admin, user, _) = setup();
    let token = register_token(&env, &admin);
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    mint_tokens(&env, &token, &user, &10000);

    client.initialize(&admin, &token);
    client.create_tier(&admin, &1, &1000, &86400);
    client.subscribe(&user, &1, &5000);

    env.ledger().set_timestamp(100000);
    assert!(client.is_subscription_due(&user));

    let success = client.charge_billing(&admin, &user);
    assert!(success);

    let balance = client.get_balance(&user);
    assert_eq!(balance, 4000);
    assert_eq!(client.get_merchant_earnings(), 1000);

    // Admin withdraws merchant earnings
    client.withdraw_merchant_earnings(&admin, &1000);
    assert_eq!(client.get_merchant_earnings(), 0);
}

#[test]
fn test_charge_billing_batch() {
    let (env, admin, user1, _) = setup();
    let user2 = Address::generate(&env);
    let token = register_token(&env, &admin);
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    mint_tokens(&env, &token, &user1, &10000);
    mint_tokens(&env, &token, &user2, &10000);

    client.initialize(&admin, &token);
    client.create_tier(&admin, &1, &1000, &86400);

    client.subscribe(&user1, &1, &5000);
    client.subscribe(&user2, &1, &5000);

    env.ledger().set_timestamp(100000);

    let mut users = Vec::new(&env);
    users.push_back(user1.clone());
    users.push_back(user2.clone());

    let count = client.charge_billing_batch(&admin, &users);
    assert_eq!(count, 2);
    assert_eq!(client.get_merchant_earnings(), 2000);
    assert_eq!(client.get_balance(&user1), 4000);
    assert_eq!(client.get_balance(&user2), 4000);
}

#[test]
fn test_cancel_subscription() {
    let (env, admin, user, _) = setup();
    let token = register_token(&env, &admin);
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    mint_tokens(&env, &token, &user, &10000);

    client.initialize(&admin, &token);
    client.create_tier(&admin, &1, &1000, &86400);
    client.subscribe(&user, &1, &2000);

    client.cancel_subscription(&user);

    let sub = client.get_subscriber(&user);
    assert!(!sub.active);
}
