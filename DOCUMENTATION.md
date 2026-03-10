# Ruby - Agentic Wallets System Documentation

## Overview

Ruby is a robust, end-to-end "Wallet-as-a-Service" tailored specifically for AI Agents on the Solana blockchain. It provides a secure, flexible, and policy-driven sandbox for agents to hold assets, sign transactions, and interact with the Solana ecosystem—without human intervention or managing raw private keys.

At its core, Ruby uses **Privy** to provision embedded wallets for human users (owners) and server wallets for AI Agents.

---

## 1. Core Architecture

The system involves two main actors:

1. **Human (Owner):** Interacts via the UI Dashboard. Signs up using Privy, creates AI agents, configures server wallets for them, and sets robust security policies.
2. **AI Agent (Operator):** Uses an API key provisioned by the human to programmatically call the Ruby REST API and perform on-chain operations within the limits set by policies.

### Flow Summary

```
Human Owner -> Privy Login -> Ruby Dashboard -> Creates Agent -> Ruby provisions Privy Server Wallets -> Human defines Policies
   |
   +-> Issues API Key to AI Agent -> Agent authenticates to Ruby API -> Issues Trade/Send Commands -> Ruby Policy Engine Checks -> Privy Enclave Signs -> Solana Tx
```

---

## 2. Directory Structure

- **`src/`:** Backend service written in Node.js/TypeScript.
  - **`controllers/` & `routes/`:** Endpoint definitions and business logic handlers. Separated cleanly into human-facing UI routes (`/api/*`) and agent-facing programmatic routes (`/agent/*`).
  - **`services/`:** Core integrations and services (`privyService.ts`, `agentService.ts`, `walletService.ts`, `solanaService.ts`, etc.)
  - **`middlewares/`:** Contains `privyAuth.ts` (human authentication using JWT verification) and `apiKeyAuth.ts` (agent authentication using SHA-256 hashed API keys).
  - **`models/`:** Prisma database abstraction wrappers.
- **`app/`:** Frontend dashboard built with Vite, React, Shadcn UI, and Tailwind. Provides the GUI for the human owner to manage their agents and wallets.
- **`prisma/`:** Database schema (`schema.prisma`) and migrations.

---

## 3. Data Models

The system is backed by a PostgreSQL database managed via Prisma. The key models are:

- **`Owner`:** Represents the human user. Bound to a Privy User ID (`privy_user_id`).
- **`Agent`:** Created by an owner. Has an `api_key_hash` for secure programmatic access.
- **`Wallet`:** Represents a specific Privy Server Wallet assigned to an agent. Every wallet has an address, a label, and a specific `WalletPurpose` (e.g., TRADING, SAVINGS, GAS).
- **`TransactionLog`:** Maintains a history of all transaction attempts (Sends, Swaps, Jupiter Orders) performed by the wallets.

---

## 4. Wallet Operations & Capabilities

AI Agents have diverse on-chain capabilities. All of these require valid API keys and execution within active policy rules.

Detailed integrations include:

- **Send SOL/SPL Tokens:** Basic transfer utilities integrated with `@solana/web3.js` and `@solana/spl-token`.
- **Jupiter Integration:**
  - **Swaps (`/agent/wallets/:label/swap`):** Execute token swaps via Jupiter Aggregator (v6 API).
  - **Trigger (Limit) Orders & Recurring (DCA) Orders:** Advanced trading capabilities powered by Jupiter.
- **Portfolio & History:** Managed via **BirdEye API** for accurate token values, metadata, and transaction history.
- **Token Launch:** Fully integrated with `bags.fm` for automatic token launching and LP initialization.

---

## 5. Security & Policy Engine

A fundamental feature of Ruby is its security layer. Agents use server wallets managed by Privy, so the underlying private keys exist strictly within Privy's secure enclaves.

- **Agent Auth:** Programmatic requests must pass an `x-api-key` header. These are hashed using SHA-256 before being verified in the database.
- **Policy Engine Guardrail:** Any on-chain request made by an agent passes through multiple layers:
  1. **Application-Level Policy Engine:** Validates the operation in the Ruby backend (e.g. `check = await policyEngine.evaluate(wallet, tx)`).
  2. **Privy Enclave Enforced Policies:** Privy server-wallets enforce rules (e.g., Transfer Limit caps, Program allowlisting, or strict Deny for Private Key exports). If a policy validation fails, the signature is aborted.

### Wallet Presets

- **GAS:** Allowed small micro-transfers of SOL.
- **TRADING:** Allowed broader Solana interactions (e.g., Jupiter program, up to 10 SOL limits).
- **SAVINGS:** Receive only. Outbound transfers denied.
- **GENERAL:** Basic limits for average use cases.

---

## 6. Embedded AI Chat

Ruby provides an integrated LLM Chat interface (`/api/chat` or `/agent/chat`).

- Powered by the **`xai` (grok) SDK**.
- Intent parsing allows conversational inputs (e.g., _"Send 0.05 SOL to user X"_) to be translated into programmatic JSON wallet actions, acting as an intelligent bridge for non-technical commands.
