# 💳 SorobanPay

**Decentralized, non-custodial recurring payments and subscriptions on the Stellar blockchain.**

SorobanPay brings the convenience of Web2 subscriptions (like Netflix or Spotify) to Web3 without locking your funds or requiring risky unlimited token allowances.

---

## 🌟 How It Works

1. **Deposit** — You add funds to your personal escrow balance in the smart contract.
2. **Subscribe** — Pick a subscription plan offered by a merchant.
3. **Auto-Charge & Withdraw** — The merchant collects the subscription fee each billing cycle. You can withdraw your unspent funds or cancel at any time.

---

## ✨ Features

- **🔒 Non-Custodial & Safe** — Your money stays in your control. Withdraw any unspent balance whenever you want.
- **⚡ Automated Recurring Billing** — No need to manually sign transactions every single month.
- **⏯️ Pause & Resume** — Pause your active subscriptions and resume whenever you're ready.
- **💼 Merchant Dashboard** — Create custom plans, track active subscribers, and run batch billing.
- **👛 Multi-Wallet Support** — Connect with **Freighter**, **xBull**, **Albedo**, or use a **Demo Keypair** for instant testnet testing.

---

## 📁 Project Structure

```text
soroban-payment-dapp/
├── client/     # Next.js 16 frontend application
├── contract/   # Soroban smart contract written in Rust
└── scripts/    # Deployment and testnet setup scripts
```

---

## 🚀 Quick Start (Run Locally)

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Rust & Soroban CLI** *(only if compiling smart contracts)*

### 2. Run the Frontend

```bash
# Navigate to the client directory
cd client

# Install dependencies
npm install

# Start the local development server
npm run dev
```

Open [https://soroban-payment-dapp-sand.vercel.app/](https://soroban-payment-dapp-sand.vercel.app/) in your browser to view the dApp.

### 3. Smart Contract (Optional)

```bash
# Navigate to contract directory
cd contract

# Run contract tests
cargo test

# Build the WASM contract
stellar contract build
```

---

## 🛠️ Built With

- **Blockchain:** Stellar (Testnet) & Soroban Smart Contracts (Rust)
- **Frontend:** Next.js 16, React 19, Tailwind CSS, Lucide Icons
- **State & Web3:** Zustand, Stellar SDK, Freighter API

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
