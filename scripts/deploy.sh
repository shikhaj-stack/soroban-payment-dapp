#!/usr/bin/env bash
set -euo pipefail

# ────────────────────────────────────────────────────────
# Soroban Recurring Payment Contract — Deploy & Seed Script
# ────────────────────────────────────────────────────────
# Prerequisites:
#   - cargo + rust with wasm32v1-none / wasm32-unknown-unknown target
#   - stellar CLI (cargo install --locked stellar-cli)
#   - A funded testnet account (stellar keys generate dev --network testnet --fund)
#
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh

NETWORK="testnet"
SOURCE="dev"
CONTRACT_WASM="target/wasm32v1-none/release/contract.wasm"

echo "═════════════════════════════════════════════════════════"
echo "  🚀 Soroban Recurring Payments & Subscription Deployer "
echo "═════════════════════════════════════════════════════════"
echo ""

# Step 1: Build the WASM
echo "[1/5] Building Soroban contract WASM..."
(cd contract && stellar contract build)
echo "      ✅ WASM built at: $CONTRACT_WASM"
echo ""

# Step 2: Ensure source account is funded
echo "[2/5] Ensuring deployer testnet identity is funded..."
stellar keys generate "$SOURCE" --network "$NETWORK" --fund 2>/dev/null || true
echo "      ✅ Deployer account ready"
echo ""

# Step 3: Deploy the contract
echo "[3/5] Deploying contract to $NETWORK..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "contract/$CONTRACT_WASM" \
  --source-account "$SOURCE" \
  --network "$NETWORK" \
  --output json 2>/dev/null | grep -o '"contract_id":"[^"]*"' | cut -d'"' -f4 || true)

if [ -z "$CONTRACT_ID" ]; then
  CONTRACT_ID=$(stellar contract deploy \
    --wasm "contract/$CONTRACT_WASM" \
    --source-account "$SOURCE" \
    --network "$NETWORK")
fi

echo "      🎉 Contract deployed!"
echo "      📋 Contract ID: $CONTRACT_ID"
echo ""

# Step 4: Initialize the contract
TOKEN_ADDRESS="${TOKEN_ADDRESS:-CDLZFB3OFI6D26GFNIZM7MPIIPEEZZ2DCCYNEI4RWG5RUVY475YGLUM}"

echo "[4/5] Initializing contract..."
echo "      Admin:    $SOURCE"
echo "      Token:    $TOKEN_ADDRESS"

stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-account "$SOURCE" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$SOURCE" \
  --token "$TOKEN_ADDRESS"

echo "      ✅ Contract initialized"
echo ""

# Step 5: Create sample subscription tiers
echo "[5/5] Seeding subscription tiers..."

# Tier 1: Starter — 10 XLM / 30 days
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-account "$SOURCE" \
  --network "$NETWORK" \
  -- create_tier \
  --admin "$SOURCE" \
  --tier_id 1 \
  --price 100000000 \
  --interval 2592000

echo "      ✅ Tier 1: Starter (10 XLM / 30 days)"

# Tier 2: Pro Plan — 25 XLM / 30 days
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-account "$SOURCE" \
  --network "$NETWORK" \
  -- create_tier \
  --admin "$SOURCE" \
  --tier_id 2 \
  --price 250000000 \
  --interval 2592000

echo "      ✅ Tier 2: Pro Plan (25 XLM / 30 days)"

# Tier 3: Enterprise VIP — 50 XLM / 30 days
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-account "$SOURCE" \
  --network "$NETWORK" \
  -- create_tier \
  --admin "$SOURCE" \
  --tier_id 3 \
  --price 500000000 \
  --interval 2592000

echo "      ✅ Tier 3: Enterprise VIP (50 XLM / 30 days)"
echo ""

# Update client .env.local
cat <<EOF > client/.env.local
# Stellar RPC endpoint
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org

# Network passphrase (testnet)
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Deployed contract address
NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT_ID
NEXT_PUBLIC_TOKEN_ADDRESS=$TOKEN_ADDRESS
EOF

echo "═════════════════════════════════════════════════════════"
echo "  Deployment Complete!"
echo ""
echo "  Contract: $CONTRACT_ID"
echo "  Network:  $NETWORK"
echo ""
echo "  Next steps:"
echo "  1. cd client && npm run dev"
echo "  2. Open http://localhost:3000"
echo "═════════════════════════════════════════════════════════"
