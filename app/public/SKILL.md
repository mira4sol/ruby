---
name: Agent Platform Interaction API
description: Full API spec and guide for LLM agents to securely interact with the platform wallets and services.
---

# Agent API Specification & Skill Guide

This document is a comprehensive guide for you (the AI Agent) to securely interact with the platform and perform on-chain and off-chain portfolio management for the user.
The platform handles transaction execution, indexing, and routing internally via Jupiter and BirdEye.

**Base URL**: `https://static.53.190.27.37.clients.your-server.de/ruby/agent`

## 🔒 Authentication

All requests **MUST** include your configured API key in the request headers:

```http
x-api-key: <agent_api_key>
```

> **Note to Agents**: Never expose the API key to users or log it in plain text. Keep it secure and use it strictly for the `x-api-key` header.

## How to use this API

**Important**: You can (and SHOULD) make multiple consecutive calls to safely achieve a goal. Never guess balances, wallet labels, or token holdings.

### Communication Style & Formatting

- **Format for Humans**: ALWAYS format your messages so they are easy for a human to read. Use Markdown styling (bolding, lists, code blocks, tables) to cleanly separate numbers, metrics, and complex object data. Avoid dumping raw JSON directly to the user unless specifically requested.
- **Transaction Links**: Whenever your response includes a transaction hash (signature), ALWAYS provide a direct link to view it on Solscan. Format the link using Markdown like this: `[View on Solscan](https://solscan.io/tx/<transaction_signature>)`.

### Proactive Operations

- **Daily Trending Report**: Every day, you should proactively send the human owner a message containing the **top 3 tokens from the trending tokens API** (`GET /tokens/trending`). Include essential data that is important for traders, such as price, liquidity, 24h volume, and 24h price percentage change.
- **Token Link & Mint Address Extraction**:
  - If a user sends a valid **Solana mint public key** in the chat, automatically fetch and display its overview using `GET /tokens/:address/overview`.
  - If a user sends a **link** (such as a DexScreener link, Pump.fun link, or any other URL containing a Solana mint address), extract the mint address from the URL. First explicitly ask the user if they want info on that token (unless they already requested it alongside the link). If they confirm, fetch the overview via `GET /tokens/:address/overview` and present the trader-focused metrics.

### Core mental model for agents

- Always think in **steps**:
  1. **Discover context** (which wallets? which labels? which assets?).
  2. **Validate state** (balances, open orders, prices).
  3. **Execute actions** (send, swap, create/cancel orders).
  4. **Confirm results** (re‑fetch balances / history if relevant).

- If you **don’t know the wallet label** the user is referring to:
  - First call **`GET /wallets`** to list all wallets.
  - Pick the wallet whose **`label`** or **`purpose`** best matches the user’s wording (e.g. “main”, “trading”, “savings”, “gas”, “general”).
  - Use that `label` in all subsequent endpoints for this task.

- Before any **send / swap / order creation**, when the user mentions an amount:
  - Call **`GET /wallets/:label/balance`** for the chosen wallet.
  - Check that the relevant token (e.g. SOL or a specific SPL mint) has **enough `uiAmount`** to cover:
    - The requested amount; and
    - Any likely fees (especially for SOL).
  - If the balance is **not enough**, clearly explain this to the user instead of trying the transaction blindly.

- When something fails (e.g. `INSUFFICIENT_FUNDS`, `SWAP_FAILED`, `JUPITER_ORDER_FAILED`):
  - **Read the error code/message**.
  - Decide whether you should:
    - Ask the user to deposit more funds or pick a smaller amount, or
    - Adjust parameters (e.g. lower size, different token, different label).
  - Do **not** retry the exact same failing request indefinitely.

### Simple examples

- If the user asks _"What is my main wallet balance?"_, you should:
  1. Fetch the list of wallets via **`GET /wallets`** to find their labels.
  2. Select the matching wallet label (e.g. `general` or another default wallet).
  3. Call **`GET /wallets/:label/balance`** to retrieve the balance information.
  4. Present the final result to the user in a clear, human‑readable way.

- If the user asks _"Swap 1 SOL to USDC"_:
  1. Call **`GET /wallets`** if needed to decide which wallet label to use.
  2. Call **`GET /wallets/:label/balance`** to confirm there is at least 1 SOL (plus fees) available.
  3. If balance is sufficient, call **`POST /wallets/:label/swap`** with:
     - `inputMint = So11111111111111111111111111111111111111112` (SOL),
     - `outputMint = <USDC mint address>`,
     - `amount = 1` (human‑readable SOL amount).
  4. If the swap succeeds, summarize the result for the user; if it fails, read the error and explain what happened and what to try next.

---

## 1. List Wallets

Fetch a list of all wallets associated with your Agent identity. Useful for determining which `:label` to use in subsequent requests.

### `GET /wallets`

- **Response Shape**:

```typescript
{
  success: boolean
  data: Array<{
    id: string
    walletAddress: string
    label: string
    purpose: 'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL'
    isDefault: boolean
    createdAt: string // ISO Date String
  }>
}
```

---

## 2. Get Wallet Balance

Fetch a full portfolio state for a specific wallet, including all SPL tokens held and total portfolio USD value (powered by BirdEye).

### `GET /wallets/:label/balance`

- **URL parameters**:
  - `label`: The `label` property of the target wallet.

- **Response Shape**:

```typescript
export interface BirdEyeTokenItem {
  address: string;
  decimals: number;
  balance: number;       // Raw balance
  uiAmount: number;      // Human-readable amount (e.g., 1.2 SOL)
  chainId: string;
  name?: string;         // 'Solana'
  symbol?: string;       // 'SOL'
  logoURI?: string;
  priceUsd?: number;
  valueUsd?: number;
  priceChange24h?: number;
  liquidity?: number;
}

{
  success: boolean;
  data: {
    wallet: string;
    totalUsd: number;
    items: BirdEyeTokenItem[]; // Standard token assets held in the wallet
  }
}
```

---

## 3. Send Native SOL

Execute a transfer of native SOL to another address.

### `POST /wallets/:label/send`

- **Request Body**:

```typescript
{
  toAddress: string // Valid Solana pubkey (32-44 characters)
  amount: number // Amount in human-readable SOL (not lamports). Must be > 0.
}
```

- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    txHash: string // Solana transaction signature
    logId: string // Internal tracking ID
  }
}
```

---

## 4. Send SPL Token

Execute a transfer of any specific SPL Token.

### `POST /wallets/:label/send-spl`

- **Request Body**:

```typescript
{
  toAddress: string // Valid Solana pubkey (32-44 characters)
  mint: string // Token Mint Address (32-44 characters)
  amount: number // Amount in human-readable units (e.g., 100 for 100 USDC). Must be > 0.
}
```

- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    txHash: string
    logId: string
  }
}
```

---

## 5. Jupiter Token Swap

Instantly swap tokens at the best rates using the Jupiter Swap Aggregator.

### `POST /wallets/:label/swap`

- **Request Body**:

```typescript
{
  inputMint: string // Token Mint Address to sell (32-44 characters)
  outputMint: string // Token Mint Address to buy (32-44 characters)
  amount: number // Amount in input token human-readable units. Must be > 0.
}
```

- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    txHash: string
    logId: string
  }
}
```

---

## 6. Create Trigger (Limit) Order

Place a Limit/Trigger order via Jupiter. Executed on-chain when the output amounts correspond to the target price.

### `POST /wallets/:label/trigger`

- **Request Body**:

```typescript
{
  inputMint: string   // Token Mint Address to sell
  outputMint: string  // Token Mint Address to buy
  inAmount: string    // Amount given in human-readable units (e.g., 1 for 1 SOL)
  targetPrice: number // The target price point which fulfills this order
  expiredAt?: string  // Optional ISO 8601 expiry timestamp for the order
}
```

- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    txId: string // Solana transaction signature
    logId: string // Internal tracking ID
  }
}
```

---

## 7. Create Recurring (DCA) Order

Set up a continuous Dollar Cost Averaging arrangement via Jupiter.

### `POST /wallets/:label/recurring`

- **Request Body**:

```typescript
{
  inputMint: string // Token Mint Address to sell
  outputMint: string // Token Mint Address to buy
  params: {
    time: {
      inAmount: string // Amount given in human-readable units (e.g., 1 for 1 SOL)
      numberOfOrders: number // Total chunk count (Integer, min: 2)
      interval: number // Interval step between orders, in seconds
      startAt: number | null // Optional start timestamp (Unix seconds)
    }
  }
}
```

- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    txId: string // Solana transaction signature
    logId: string // Internal tracking ID
  }
}
```

---

## 8. Get Transaction History

Get a chronological list of recent operations from the BirdEye indexer.

### `GET /wallets/:label/history`

- **Query Parameters**:
  - `page` (optional number, defaults to 1)
  - `limit` (optional number, defaults to 20, max 100)

- **Response Shape**:

```typescript
export interface BirdEyeBalanceChange {
  amount: number
  symbol: string
  name: string
  decimals: number
  address: string
  logoURI: string
}

export interface BirdEyeContractLabel {
  address: string
  name: string
  metadata: {
    icon: string
  }
}

export interface BirdEyeTransaction {
  txHash: string
  blockNumber: number
  blockTime: string
  status: boolean
  from: string
  to: string
  fee: number
  mainAction: string
  balanceChange: BirdEyeBalanceChange[]
  contractLabel: BirdEyeContractLabel
}

{
  success: boolean
  data: {
    solana: BirdEyeTransaction[]
  }
}
```

---

## 9. Get Open Orders (Limit & DCA)

Fetch a list of active DCA and Limit Orders currently active for the selected wallet.

### `GET /wallets/:label/orders`

- **Query Parameters**:
  - `orderStatus` (optional string, `'active' | 'history'`, default: `'active'`)

- **Response Shape**:

```typescript
export interface TriggerOrder {
  userPubkey: string
  orderKey: string
  inputMint: string
  outputMint: string
  makingAmount: string
  takingAmount: string
  remainingMakingAmount: string
  remainingTakingAmount: string
  rawMakingAmount: string
  rawTakingAmount: string
  rawRemainingMakingAmount: string
  rawRemainingTakingAmount: string
  slippageBps: string
  expiredAt: string | null
  createdAt: string
  updatedAt: string
  status: string
  openTx: string
  closeTx: string | null
  programVersion: string
  trades: any[]
}

export interface RecurringOrder {
  userPubkey: string
  orderKey: string
  inputMint: string
  outputMint: string
  inDeposited: string
  inWithdrawn: string
  rawInDeposited: string
  rawInWithdrawn: string
  cycleFrequency: number
  outWithdrawn: string
  inAmountPerCycle: string
  minOutAmount: string
  maxOutAmount: string
  inUsed: string
  outReceived: string
  rawOutWithdrawn: string
  rawInAmountPerCycle: string
  rawMinOutAmount: string
  rawMaxOutAmount: string
  rawInUsed: string
  rawOutReceived: string
  openTx: string
  closeTx: string | null
  userClosed: boolean
  createdAt: string
  updatedAt: string
  trades: Array<{
    orderKey: string
    keeper: string
    inputMint: string
    outputMint: string
    inputAmount: string
    outputAmount: string
    rawInputAmount: string
    rawOutputAmount: string
    feeMint: string
    feeAmount: string
    rawFeeAmount: string
    txId: string
    confirmedAt: string
    action: string
    productMeta: any | null
  }>
}

{
  success: boolean
  data: {
    trigger: TriggerOrder[]
    recurring: RecurringOrder[]
  }
}
```

---

## 10. Get Token Prices

Directly fetch real-time USD prices for single or multiple SPL tokens via the public Jupiter API. Agents can use this out-of-band to quickly check the value of token pairs before swapping or validating target prices.

### `GET https://lite-api.jup.ag/price/v3`

- **Query Parameters**:
  - `ids`: Comma-separated string of token mint addresses. (e.g., `ids=So11...,JUPyi...`)

example: https://api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112,JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN

- **Response Shape**:

```typescript
{
  // Keys are the requested mint addresses
  [mintId: string]: {
    usdPrice: number;        // The price in USD
    blockId: number;
    decimals: number;
    priceChange24h: number;  // 24-hour price change
  }
}
```

---

## 11. Cancel Orders

Cancel an open Trigger or Recurring order. Since Jupiter processes these on-chain, this endpoint initiates a cancellation transaction, signs it via Privy, and sends it to the RPC.

### `POST /wallets/:label/trigger/:orderKey/cancel`

- **URL parameters**:
  - `label`: The `label` property of the target wallet.
  - `orderKey`: The `orderKey` property of the order to cancel (can be found in `GET /wallets/:label/orders`).

- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    txId: string // Solana transaction signature
    logId: string // Internal tracking ID
  }
}
```

### `POST /wallets/:label/recurring/:orderKey/cancel`

- **URL parameters**:
  - `label`: The `label` property of the target wallet.
  - `orderKey`: The `orderKey` property of the DCA order to cancel (can be found in `GET /wallets/:label/orders`).

- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    txId: string // Solana transaction signature
    logId: string // Internal tracking ID
  }
}
```

---

## 12. Create Wallet

Dynamically provision a new Privy server wallet for your Agent identity, tailored to a specific purpose (e.g. TRADING, SAVINGS, GAS).

### `POST /wallets`

- **Request Body**:

```typescript
{
  purpose: 'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL'
  label?: string // Optional custom label (defaults to lowercased purpose)
}
```

- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    id: string
    walletAddress: string
    purpose: 'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL'
    label: string
  }
}
```

---

## 13. Get Trending Tokens

Fetch a real-time list of trending tokens on Solana, powered by BirdEye.

### `GET /tokens/trending`

- **Query Parameters**:
  - `sort_by` (optional string, `'rank' | 'volume24hUSD' | 'liquidity'`, default: `'rank'`)
  - `sort_type` (optional string, `'asc' | 'desc'`, default: `'asc'`)
  - `offset` (optional number, defaults to 0)
  - `limit` (optional number, defaults to 20)

- **Response Shape**:

```typescript
export interface BirdEyeTrendingTokenItem {
  address: string
  decimals: number
  liquidity: number
  logoURI: string
  name: string
  symbol: string
  volume24hUSD: number
  volume24hChangePercent: number | null
  fdv: number
  marketcap: number
  rank: number
  price: number
  price24hChangePercent: number
}

{
  success: boolean
  data: {
    updateUnixTime: number
    updateTime: string
    tokens: BirdEyeTrendingTokenItem[]
  }
}
```

---

## 14. Get Token Overview

Fetch comprehensive overview data for a specific token by its mint address, powered by BirdEye.

### `GET /tokens/:address/overview`

- **URL parameters**:
  - `address`: The mint address of the specific token.

- **Response Shape**:

```typescript
export interface BirdEyeTokenOverview {
  address: string
  decimals: number
  symbol: string
  name: string
  marketCap: number
  fdv: number
  liquidity: number
  price: number
  priceChange24hPercent: number
  uniqueWallet24h: number
  totalSupply: number
  circulatingSupply: number
  // ... including numerous advanced 1m, 5m, 1h, 24h history metrics
}

{
  success: boolean
  data: BirdEyeTokenOverview
}
```
