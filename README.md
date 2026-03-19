# PoT — Bitcoin-Native Trust Layer

A decentralized trust protocol built on **Stacks**, enabling users to create enforceable agreements backed by stake and secured by Bitcoin finality.

---

## Smart Contracts

### `trust-core.clar`
Core agreement lifecycle management.

**Status States:** `PENDING → ACTIVE → COMPLETED | FAILED | DISPUTED → RESOLVED`

**Functions:**
- `create-agreement` — Party A creates agreement with title, description, counterparty, stake, deadline
- `accept-agreement` — Party B accepts, moves status to ACTIVE
- `stake-funds` — Either party locks STX into contract
- `resolve-success` — Both parties agree on success; stakes returned
- `resolve-failure` — Caller admits failure; stake slashed to counterparty
- `raise-dispute` — Escalates to resolver
- `resolve-dispute` — Resolver decides winner; winner takes both stakes

### `reputation.clar`
On-chain reputation tracking. Score formula:
```
score = (successful × 10) − (failed × 15) + (disputes_won × 5)
```

### `vault.clar`
Optional fund management layer for clean separation of custody.

---

## Deploy Contracts

### Prerequisites
- [Clarinet](https://github.com/hirosystems/clarinet) installed
- Hiro wallet with testnet STX

### Deploy to Testnet

```bash
# Install Clarinet
brew install clarinet

# In the pot-project directory
cd pot-project

# Initialize Clarinet project (first time)
clarinet new pot-contracts
cp contracts/*.clar pot-contracts/contracts/

# Deploy
cd pot-contracts
clarinet deploy --testnet
```

Note the deployed contract addresses and update `.env` in the frontend.

---

## Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_USE_TESTNET=true
VITE_CONTRACT_ADDRESS=<your_deployed_address>
VITE_CONTRACT_NAME=trust-core
VITE_REPUTATION_CONTRACT_NAME=reputation
```

### 3. Run dev server

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

---

## Usage Flow

1. **Connect** your Hiro wallet
2. **Create** an agreement (Party A) — set title, counterparty address, stake amount, deadline
3. **Accept** (Party B) — counterparty confirms participation
4. **Stake** — both parties lock STX into the contract
5. **Resolve** — mark success (stakes returned) or failure (stake slashed to counterparty)
6. Optional: **Raise dispute** → resolver decides winner

---

## Security Features

- **Replay guard** — prevents double resolution via `resolution-guard` map
- **Access control** — only parties or resolver can act on agreements
- **State machine** — explicit status transitions prevent invalid operations
- **Post conditions** — STX transfers validated before submission
- **Stake validation** — minimum 1 STX enforced on-chain

---

## Tech Stack

- **Blockchain:** Stacks (Bitcoin L2), Clarity smart contracts
- **Frontend:** React 18, TypeScript, Vite
- **Wallet:** Hiro Wallet via `@stacks/connect`
- **Stacks SDK:** `@stacks/transactions`, `@stacks/network`
- **Routing:** React Router v6
- **Fonts:** Syne (display) + JetBrains Mono
