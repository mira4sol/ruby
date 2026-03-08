# Dashboard API Integration Guide

This document serves as a comprehensive integration guide for the human (owner) dashboard to consume the backend API. It covers authentication, agent management, wallet operations, and policy configurations.

**Base URL**: `https://joint-quetzal-relieved.ngrok-free.app/api`

---

## 🔒 Authentication

All API endpoints (except where noted) require a standard Privy JWT token sent in the `Authorization` header.

**Headers needed:**

```http
Authorization: Bearer <privy_identity_token>
```

---

## 1. Auth Sync API

Called on the first login to synchronize the Privy user into the local database as an Owner.

### `POST /auth/sync`

- **Description**: Syncs the Privy user. MUST be called after successful Privy login on the frontend.
- **Request Parameters**: None
- **Request Body**: None (Owner details are extracted from the JWT token).
- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    id: string // The Owner ID in the database
    email: string // The synced email address
  }
}
```

---

## 2. Agent Management API

Endpoints to manage AI agents, which hold and operate the wallets.

### `POST /agents`

- **Description**: Create a new agent and its associated wallets.
- **Request Body**:

```typescript
{
  name: string; // The name of the agent (1-100 characters)
  wallets?: Array<'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL'>; // Optional. Defaults to ['TRADING', 'GAS']
}
```

- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    id: string
    name: string
    apiKey: string // ✨ IMPORTANT: Display this to the user immediately. It is returned ONLY ONCE and never stored raw!
    wallets: Array<{
      id: string
      walletAddress: string
      purpose: 'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL'
      label: string
    }>
  }
}
```

### `GET /agents`

- **Description**: List all active agents for the authenticated owner.
- **Query Parameters**:
  - `page` (optional number, default: 1)
  - `limit` (optional number, default: 20)
- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    agents: Array<{
      id: string
      name: string
      isActive: boolean
      createdAt: string // ISO 8601 Date String
      _count: { wallets: number }
    }>
    total: number
  }
}
```

### `GET /agents/:agentId`

- **Description**: Get extensive details of a single agent including its associated wallets.
- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    id: string
    name: string
    isActive: boolean
    createdAt: string // ISO Date
    wallets: Array<{
      id: string
      walletAddress: string
      label: string
      purpose: 'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL'
      isDefault: boolean
    }>
  }
}
```

### `DELETE /agents/:agentId`

- **Description**: Soft delete an agent.
- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    deleted: boolean
  }
}
```

### `POST /agents/:agentId/regenerate-key`

- **Description**: Rotate the API key for an agent.
- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    apiKey: string // ✨ IMPORTANT: The new raw key. Returned ONLY ONCE.
  }
}
```

---

## 3. Wallet Management API

Wallets are tied to an Agent. The parameters `agentId` and `walletId` are passed in the URL.

### `POST /agents/:agentId/wallets`

- **Description**: Create an additional wallet for an agent.
- **Request Body**:

```typescript
{
  purpose: 'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL';
  label?: string; // Optional custom name (max 50 chars)
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

### `GET /agents/:agentId/wallets`

- **Description**: List all active wallets for a specific agent.
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

### `GET /agents/:agentId/wallets/:walletId/balance`

- **Description**: Fetch the full portfolio representation of a wallet (powered by BirdEye). Returns exact token items and total USD balance.
- **Response Shape**:

```typescript
export interface BirdEyeTokenItem {
  address: string;
  decimals: number;
  balance: number;       // Raw balance
  uiAmount: number;      // Human-readable amount (e.g. 1.2 SOL)
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
    items: BirdEyeTokenItem[]; // Array of standard tokens held in the wallet
  }
}
```

### `DELETE /agents/:agentId/wallets/:walletId`

- **Description**: Soft delete a wallet.
- ⚠️ **Note**: This will fail and throw a 409 Conflict if the wallet has a non-zero balance. The funds must be transferred out first.
- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    deleted: boolean
  }
}
```

### `POST /agents/:agentId/wallets/:walletId/send`

- **Description**: Send native SOL from the wallet.
- **Request Body**:

```typescript
{
  toAddress: string
  amount: number // Amount in SOL (e.g., 0.5 for 0.5 SOL. NOT in lamports)
}
```

- **Response Shape**:

```typescript
{
  success: boolean
  data: {
    txHash: string // Solana transaction signature
    logId: string // Internal database transaction log ID
  }
}
```

### `POST /agents/:agentId/wallets/:walletId/send-spl`

- **Description**: Send SPL tokens from the wallet.
- **Request Body**:

```typescript
{
  toAddress: string
  mint: string // Token Mint Address
  amount: number // Human-readable amount (e.g. 1000 for 1000 USDC)
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

### `POST /agents/:agentId/wallets/:walletId/swap`

- **Description**: Swap tokens via Jupiter aggregator using the wallet.
- **Request Body**:

```typescript
{
  inputMint: string
  outputMint: string
  amount: number // Amount given in human-readable units (e.g., 1 for 1 SOL)
}
```

- **Response Shape**:

````typescript
{
  success: boolean
  data: {
    txHash: string // Solana transaction signature
    logId: string // Internal transaction log ID
  }
### `GET /agents/:agentId/wallets/:walletId/transactions`

- **Description**: Fetch the transaction history for a wallet (powered by BirdEye). Returns the list of historical transactions on Solana.
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
````

### `GET /agents/:agentId/wallets/:walletId/orders`

- **Description**: Fetch all trigger (limit) and recurring (DCA) orders for a wallet on Jupiter.
- **Response Shape**:

```typescript
export interface TriggerOrder {
  orderId: string
  maker: string
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  expiredAt: string | null
  status: string
  createdAt: string
}

export interface RecurringOrder {
  orderId: string
  maker: string
  inputMint: string
  outputMint: string
  inAmount: string
  remainingAmount: string
  numberOfOrders: number
  completedOrders: number
  interval: number
  status: string
  createdAt: string
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

## 4. Policy Configuration API

Policies are managed strictly via Privy's server wallet policies.

### `GET /agents/:agentId/wallets/:walletId/policy`

- **Description**: Gets the current loaded Privy policy for the wallet.
- **Response Shape**:

```typescript
// Uses Privy structures
export interface PrivyPolicy {
  id: string
  name: string
  version: string
  chain_type: string
  rules: Array<{
    name: string
    method: string
    action: 'ALLOW' | 'DENY'
    conditions: Array<{
      field_source: string
      field: string
      operator: string
      value: string | string[]
    }>
  }>
  created_at?: string
  updated_at?: string
}

{
  success: boolean
  data: PrivyPolicy | null // Null if no policy is attached to the wallet
}
```

### `PUT /agents/:agentId/wallets/:walletId/policy`

- **Description**: Updates or replaces the existing policy. Allows the dashboard owner to modify transaction limits, whitelist addresses, or restrict chain interactions.
- **Request Body**:

```typescript
{
  name: string // Max 200 characters
  rules: Array<{
    name: string // Rule display name
    method: string // Example: "transfer", "swap", or "*"
    action: 'ALLOW' | 'DENY'
    conditions: Array<{
      fieldSource: string // "solana.transaction" or "solana.program"
      field: string // e.g. "destination", "amount"
      operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in'
      value: string | string[] // Dependent on operator
    }>
  }>
}
```

- **Response Shape**:

```typescript
{
  success: boolean
  message: string
}
```

### `DELETE /agents/:agentId/wallets/:walletId/policy`

- **Description**: Removes all policies from a wallet.
- ⚠️ **Note**: This fundamentally locks the server wallet logic. By default, Privy wallets usually require a strict policy structure to operate successfully for certain interactions if previously set up via strict creation.
- **Response Shape**:

```typescript
{
  success: boolean
  message: string
}
```
