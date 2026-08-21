#!/usr/bin/env node
/**
 * Cross-Platform Soroban Subscription Contract Deployment & Setup Script
 * Usage: node scripts/deploy.js [options]
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RPC_URL = process.env.RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
const SOURCE_IDENTITY = process.env.STELLAR_SOURCE || "dev";
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "CDLZFB3OFI6D26GFNIZM7MPIIPEEZZ2DCCYNEI4RWG5RUVY475YGLUM";
const WASM_PATH = path.resolve(__dirname, "../contract/target/wasm32v1-none/release/contract.wasm");

console.log("═════════════════════════════════════════════════════════");
console.log("  🚀 Soroban Subscription Contract Auto-Deployer");
console.log("═════════════════════════════════════════════════════════\n");

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] }).trim();
  } catch (err) {
    console.error(`❌ Failed executing: ${cmd}`);
    process.exit(1);
  }
}

async function main() {
  // Step 1: Ensure Stellar CLI or Soroban tools are installed
  console.log("[1/5] Checking Stellar CLI toolchain...");
  try {
    const version = execSync("stellar --version", { encoding: "utf8" }).trim();
    console.log(`      ✅ Found Stellar CLI: ${version}\n`);
  } catch {
    console.log("      ⚠️ Stellar CLI not found in PATH.");
    console.log("      Please install stellar CLI: cargo install --locked stellar-cli\n");
    process.exit(1);
  }

  // Step 2: Build WASM contract
  console.log("[2/5] Compiling Soroban Rust contract to WASM...");
  execSync("stellar contract build", {
    cwd: path.resolve(__dirname, "../contract"),
    stdio: "inherit",
  });
  console.log(`      ✅ WASM built at: ${WASM_PATH}\n`);

  // Step 3: Ensure testnet account is funded
  console.log("[3/5] Funding deployer identity on testnet...");
  try {
    execSync(`stellar keys generate ${SOURCE_IDENTITY} --network testnet --fund`, { stdio: "ignore" });
  } catch {}
  console.log(`      ✅ Deployer identity '${SOURCE_IDENTITY}' ready\n`);

  // Step 4: Deploy WASM
  console.log("[4/5] Deploying contract to Stellar Testnet...");
  const deployOutput = runCommand(
    `stellar contract deploy --wasm "${WASM_PATH}" --source-account ${SOURCE_IDENTITY} --network testnet`
  );
  const contractId = deployOutput.split("\n").pop().trim();
  console.log(`      🎉 Contract Deployed! ID: ${contractId}\n`);

  // Step 5: Initialize contract and create initial tiers
  console.log("[5/5] Initializing contract and seeding subscription tiers...");
  runCommand(
    `stellar contract invoke --id "${contractId}" --source-account ${SOURCE_IDENTITY} --network testnet -- initialize --admin "${SOURCE_IDENTITY}" --token "${TOKEN_ADDRESS}"`
  );

  console.log("      Creating Tier 1 (Starter - 10 XLM / 30 Days)...");
  runCommand(
    `stellar contract invoke --id "${contractId}" --source-account ${SOURCE_IDENTITY} --network testnet -- create_tier --admin "${SOURCE_IDENTITY}" --tier_id 1 --price 100000000 --interval 2592000`
  );

  console.log("      Creating Tier 2 (Pro - 25 XLM / 30 Days)...");
  runCommand(
    `stellar contract invoke --id "${contractId}" --source-account ${SOURCE_IDENTITY} --network testnet -- create_tier --admin "${SOURCE_IDENTITY}" --tier_id 2 --price 250000000 --interval 2592000`
  );

  console.log("      Creating Tier 3 (Enterprise - 50 XLM / 30 Days)...");
  runCommand(
    `stellar contract invoke --id "${contractId}" --source-account ${SOURCE_IDENTITY} --network testnet -- create_tier --admin "${SOURCE_IDENTITY}" --tier_id 3 --price 500000000 --interval 2592000`
  );

  // Update client .env.local
  const envLocalPath = path.resolve(__dirname, "../client/.env.local");
  const envContent = [
    `# Stellar RPC endpoint`,
    `NEXT_PUBLIC_RPC_URL=${RPC_URL}`,
    ``,
    `# Network passphrase (testnet)`,
    `NEXT_PUBLIC_NETWORK_PASSPHRASE=${NETWORK_PASSPHRASE}`,
    ``,
    `# Deployed contract address`,
    `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractId}`,
    `NEXT_PUBLIC_TOKEN_ADDRESS=${TOKEN_ADDRESS}`,
    ``,
  ].join("\n");

  fs.writeFileSync(envLocalPath, envContent, "utf8");
  console.log(`\n      ✅ Updated client/.env.local with contract ID: ${contractId}\n`);

  console.log("═════════════════════════════════════════════════════════");
  console.log("  ✨ Deployment & Configuration Complete!");
  console.log(`  📋 Contract ID: ${contractId}`);
  console.log(`  🌐 Network:     Testnet`);
  console.log("\n  Next Steps:");
  console.log("  1. cd client");
  console.log("  2. npm run dev");
  console.log("  3. Open http://localhost:3000 in your browser");
  console.log("═════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
