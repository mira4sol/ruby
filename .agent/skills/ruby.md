# Ruby — Project Flow & Privy Integration
> Cursor must read this file to understand the full system architecture, user flows,
> wallet lifecycle, and how Privy policies are created, applied, and managed.
> This file governs ALL decisions about auth, wallets, and transactions.

---

## System Overview

Ruby is a **Wallet-as-a-Service for AI Agents** on Solana devnet.

```
Human (Owner)
  └── signs up on Ruby dashboard (our product)
      └── Privy powers the auth silently under the hood — user never sees "Privy"
      └── Privy creates an embedded Solana wallet for the owner on first login
  └── creates Agents → each agent gets an API key
  └── each Agent has multiple Privy server wallets (created by our backend)
  └── sets policies/rules per wallet
  └── monitors all activity

AI Agent (Operator)
  └── receives API key from human
  └── calls Ruby REST API autonomously
  └── performs wallet operations within policy limits
  └── never touches auth or key management
  └── never knows Privy exists
```

---

## Core Mental Model

```
Privy embedded wallet  = Human's personal wallet (they control, UI-based)
Privy server wallet    = Agent's wallet (backend controls, no UI needed)
API key                = Agent's identity credential to call Ruby
Policy                 = Rules attached to a Privy server wallet by human
Policy Engine          = Our backend enforces rules BEFORE calling Privy to sign
```

**DENY by default:** Privy policies deny all unlisted methods. Every new wallet
must have a policy that explicitly ALLOWs the operations it needs.

---

## Directory Structure

```
src/
├── controllers/
│   ├── authController.ts         # Privy webhook, session handling
│   ├── agentController.ts        # CRUD for agents (human-facing)
│   ├── walletController.ts       # Wallet creation, balance, history (human-facing)
│   ├── policyController.ts       # Policy CRUD (human-facing)
│   └── agentApiController.ts     # Agent-facing API (API key auth)
├── services/
│   ├── privyService.ts           # All Privy SDK calls (wallets + policies)
│   ├── agentService.ts           # Agent business logic
│   ├── walletService.ts          # Wallet operations (send, swap, launch)
│   ├── policyService.ts          # Policy creation, update, delete
│   ├── solanaService.ts          # Raw Solana tx building
│   ├── bagsService.ts            # bags.fm token launch integration
│   └── llmService.ts             # xAI Grok — natural language → intent
├── middlewares/
│   ├── privyAuth.ts              # Verifies Privy JWT (human routes)
│   ├── apiKeyAuth.ts             # Verifies hashed API key (agent routes)
│   ├── validate.ts               # Zod schema validation
│   └── errorHandler.ts           # Global error handler
├── models/
│   ├── agentModel.ts             # Prisma queries for agents
│   ├── walletModel.ts            # Prisma queries for wallets
│   └── policyModel.ts            # Prisma queries for policies
├── utils/
│   ├── privy.ts                  # Privy client singleton
│   ├── solana.ts                 # Solana connection singleton
│   ├── apiKeys.ts                # API key generation + hashing
│   ├── env.ts                    # Typed env with Zod
│   └── logger.ts                 # Structured logging
└── types/
    ├── index.ts                  # All shared interfaces/types
    ├── errors.ts                 # Custom error classes
    ├── result.ts                 # Result<T> monad
    └── privy.ts                  # Privy-specific type extensions
```

---

## Authentication Architecture

### Human Authentication (Privy JWT)
All `/api/*` routes (dashboard, agent management) require a valid Privy session token.

```
Human → Privy login (email/social/wallet)
      → Privy returns access token
      → Client sends: Authorization: Bearer <privy_access_token>
      → privyAuth middleware verifies with privy.verifyAuthToken(token)
      → Attaches decoded user to req.privyUser
      → Controller reads req.privyUser.userId
```

```ts
// src/middlewares/privyAuth.ts
import { Request, Response, NextFunction } from 'express'
import { privy } from '../utils/privy'
import { UnauthorizedError } from '../types/errors'

export const privyAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return next(new UnauthorizedError('Missing authorization token'))

  try {
    const claims = await privy.verifyAuthToken(token)
    req.privyUser = claims
    next()
  } catch {
    next(new UnauthorizedError('Invalid or expired token'))
  }
}
```

### Agent Authentication (API Key)
All `/agent/*` routes require a valid API key issued by the human owner.

```
Agent → calls Ruby with: x-api-key: <raw_api_key>
      → apiKeyAuth middleware hashes the key with SHA-256
      → looks up hash in agents table
      → attaches agent record to req.agent
      → controller reads req.agent.id, req.agent.owner_id
```

```ts
// src/middlewares/apiKeyAuth.ts
import { Request, Response, NextFunction } from 'express'
import { createHash } from 'crypto'
import { prisma } from '../utils/prisma'
import { UnauthorizedError } from '../types/errors'

export const apiKeyAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const rawKey = req.headers['x-api-key'] as string
  if (!rawKey) return next(new UnauthorizedError('Missing API key'))

  const hash = createHash('sha256').update(rawKey).digest('hex')
  const agent = await prisma.agent.findUnique({ where: { api_key_hash: hash } })

  if (!agent || !agent.is_active) return next(new UnauthorizedError('Invalid API key'))

  req.agent = agent
  next()
}
```

---

## Human Sign-Up Flow

```
1. Human visits Ruby (our dashboard — they never see "Privy" branding)
2. They sign up with email, Google, or wallet — powered invisibly by Privy under the hood
3. Privy issues a JWT session token → our frontend stores it and sends it on every request
4. On first login → POST /api/auth/sync
   - Our backend calls privy.verifyAuthToken(token) to get privyUserId
   - Creates owner record in our DB (owners table)
   - Privy silently creates an embedded Solana wallet for the owner (their personal funding wallet)
5. Human lands on /dashboard — they see Ruby, not Privy
```

```ts
// src/services/privyService.ts (sign-up sync)
export const syncOwner = async (privyUserId: string): Promise<Result<Owner>> => {
  const existing = await prisma.owner.findUnique({ where: { privy_user_id: privyUserId } })
  if (existing) return ok(existing)

  const privyUser = await privy.getUser(privyUserId)

  const owner = await prisma.owner.create({
    data: {
      privy_user_id: privyUserId,
      email: privyUser.email?.address ?? null,
    },
  })

  return ok(owner)
}
```

---

## Agent Creation Flow

```
1. Human POSTs to /api/agents with { name, wallets: ['TRADING', 'GAS', 'SAVINGS'] }
2. Backend creates agent record
3. For each requested wallet type:
   a. Call privy.walletApi.create({ chainType: 'solana' })
   b. Store agent_wallet record (agentId, privyWalletId, address, label, purpose)
   c. Attach DEFAULT policy to each wallet (see Policy Defaults below)
4. Generate raw API key → hash with SHA-256 → store hash in agents table
5. Return raw API key ONCE to human (never stored again)
6. Human copies key and gives to their AI agent
```

```ts
// src/services/agentService.ts (agent creation)
export const createAgentWithWallets = async (
  ownerId: string,
  input: CreateAgentInput,
): Promise<Result<AgentWithKey>> => {
  const rawApiKey = generateApiKey()
  const apiKeyHash = hashApiKey(rawApiKey)

  const agent = await prisma.agent.create({
    data: { owner_id: ownerId, name: input.name, api_key_hash: apiKeyHash },
  })

  await Promise.all(
    input.wallets.map((purpose) => walletService.createWalletForAgent(agent.id, purpose)),
  )

  // Return raw key once — never stored
  return ok({ ...agent, api_key: rawApiKey })
}
```

---

## Wallet Lifecycle

### Creating a Wallet
```ts
// src/services/walletService.ts
export const createWalletForAgent = async (
  agentId: string,
  purpose: WalletPurpose,
): Promise<Result<AgentWallet>> => {
  // 1. Create Privy server wallet
  const privyWallet = await privy.walletApi.create({ chainType: 'solana' })

  // 2. Persist to DB
  const wallet = await prisma.agent_wallet.create({
    data: {
      agent_id: agentId,
      privy_wallet_id: privyWallet.id,
      wallet_address: privyWallet.address,
      label: purpose.toLowerCase(),
      purpose,
      is_active: true,
    },
  })

  // 3. Attach default policy for this wallet purpose
  await policyService.attachDefaultPolicy(wallet.id, privyWallet.id, purpose)

  return ok(wallet)
}
```

### Signing a Transaction
**ALWAYS** run through policy engine before calling Privy to sign:
```ts
// src/services/walletService.ts
export const signAndSend = async (
  walletId: string,
  serializedTx: string,
  agentId: string,
): Promise<Result<string>> => {
  const wallet = await prisma.agent_wallet.findUnique({ where: { id: walletId } })
  if (!wallet) return err(new NotFoundError('Wallet', walletId))

  // Policy is enforced by Privy at the enclave level
  // Our policyEngine is an extra application-level guard
  const check = await policyEngine.evaluate(wallet, serializedTx)
  if (!check.allowed) return err(new PolicyViolationError(check.rule))

  // Privy signs and broadcasts
  const { hash } = await privy.walletApi.solana.signAndSendTransaction({
    walletId: wallet.privy_wallet_id,
    caip2: 'solana:devnet',
    transaction: serializedTx,
  })

  await prisma.transaction_log.create({
    data: { agent_id: agentId, wallet_id: walletId, tx_hash: hash, type: 'SEND' },
  })

  return ok(hash)
}
```

---

## Privy Policy System

### How Policies Work
- A **Policy** is attached to a **Privy server wallet**
- It defines what that wallet is ALLOWED or DENIED to do
- Privy evaluates policies inside a secure enclave before signing
- `DENY` always beats `ALLOW`
- If no rule matches → default `DENY`
- Every wallet MUST have a policy, or all transactions are denied

### Privy Client Setup
```ts
// src/utils/privy.ts
import { PrivyClient } from '@privy-io/server-auth'
import { env } from './env'

export const privy = new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_APP_SECRET, {
  walletApi: {
    authorizationPrivateKey: env.PRIVY_AUTHORIZATION_KEY,
  },
})
```

### Creating a Policy on a Wallet
```ts
// src/services/policyService.ts
export const createPolicy = async (
  privyWalletId: string,
  policy: PrivyPolicy,
): Promise<Result<string>> => {
  const created = await privy.walletApi.solana.createPolicy(policy)

  await privy.walletApi.assignPolicy({
    walletId: privyWalletId,
    policyId: created.id,
  })

  await prisma.wallet_policy.create({
    data: {
      privy_policy_id: created.id,
      privy_wallet_id: privyWalletId,
      policy_name: policy.name,
      policy_snapshot: JSON.stringify(policy),
    },
  })

  return ok(created.id)
}
```

---

## Default Policies by Wallet Purpose

Every wallet gets one of these default policies on creation.
The human can update them later via the dashboard.

### GAS Wallet — SOL only, tiny amounts
```ts
export const GAS_WALLET_DEFAULT_POLICY = {
  version: '1.0' as const,
  name: 'Gas wallet defaults — SOL micro-transfers only',
  chain_type: 'solana' as const,
  rules: [
    {
      name: 'Allow SOL transfers up to 0.1 SOL',
      method: 'signAndSendTransaction',
      conditions: [
        {
          field_source: 'solana_system_program_instruction',
          field: 'Transfer.lamports',
          operator: 'lte',
          value: '100000000', // 0.1 SOL
        },
      ],
      action: 'ALLOW',
    },
    {
      name: 'Block private key export',
      method: 'exportPrivateKey',
      conditions: [],
      action: 'DENY',
    },
  ],
}
```

### TRADING Wallet — broader access, capped at 10 SOL per tx
```ts
export const TRADING_WALLET_DEFAULT_POLICY = {
  version: '1.0' as const,
  name: 'Trading wallet defaults — capped SOL + SPL + programs',
  chain_type: 'solana' as const,
  rules: [
    {
      name: 'Allow SOL transfers up to 10 SOL',
      method: 'signAndSendTransaction',
      conditions: [
        {
          field_source: 'solana_system_program_instruction',
          field: 'Transfer.lamports',
          operator: 'lte',
          value: '10000000000', // 10 SOL
        },
      ],
      action: 'ALLOW',
    },
    {
      name: 'Allow SPL token transfers (TransferChecked)',
      method: 'signAndSendTransaction',
      conditions: [
        {
          field_source: 'solana_token_program_instruction',
          field: 'instructionName',
          operator: 'in',
          value: ['TransferChecked', 'Transfer'],
        },
      ],
      action: 'ALLOW',
    },
    {
      name: 'Allow Jupiter and Compute Budget programs',
      method: 'signAndSendTransaction',
      conditions: [
        {
          field_source: 'solana_program_instruction',
          field: 'programId',
          operator: 'in',
          value: [
            'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter v6
            'ComputeBudget111111111111111111111111111111',   // Compute Budget
            '11111111111111111111111111111111',              // System Program
          ],
        },
      ],
      action: 'ALLOW',
    },
    {
      name: 'Block private key export',
      method: 'exportPrivateKey',
      conditions: [],
      action: 'DENY',
    },
  ],
}
```

### SAVINGS Wallet — receive only, human approval to withdraw
```ts
export const SAVINGS_WALLET_DEFAULT_POLICY = {
  version: '1.0' as const,
  name: 'Savings wallet defaults — receive only, no outbound',
  chain_type: 'solana' as const,
  rules: [
    // No outbound rules → all signAndSendTransaction is DENIED by default
    {
      name: 'Block private key export',
      method: 'exportPrivateKey',
      conditions: [],
      action: 'DENY',
    },
  ],
}
```

### GENERAL Wallet — 1 SOL cap, standard allowlist
```ts
export const GENERAL_WALLET_DEFAULT_POLICY = {
  version: '1.0' as const,
  name: 'General wallet defaults — 1 SOL cap',
  chain_type: 'solana' as const,
  rules: [
    {
      name: 'Allow SOL transfers up to 1 SOL',
      method: 'signAndSendTransaction',
      conditions: [
        {
          field_source: 'solana_system_program_instruction',
          field: 'Transfer.lamports',
          operator: 'lte',
          value: '1000000000', // 1 SOL
        },
      ],
      action: 'ALLOW',
    },
    {
      name: 'Allow SPL TransferChecked',
      method: 'signAndSendTransaction',
      conditions: [
        {
          field_source: 'solana_token_program_instruction',
          field: 'instructionName',
          operator: 'eq',
          value: 'TransferChecked',
        },
      ],
      action: 'ALLOW',
    },
    {
      name: 'Block private key export',
      method: 'exportPrivateKey',
      conditions: [],
      action: 'DENY',
    },
  ],
}
```

---

## Policy Management APIs (Human-Facing)

These are human-controlled via the dashboard. All require `privyAuth` middleware.

| Method   | Route                                                 | Description                                 |
| -------- | ----------------------------------------------------- | ------------------------------------------- |
| `GET`    | `/api/agents/:agentId/wallets/:walletId/policy`       | Get current policy                          |
| `PUT`    | `/api/agents/:agentId/wallets/:walletId/policy`       | Replace policy entirely                     |
| `PATCH`  | `/api/agents/:agentId/wallets/:walletId/policy/rules` | Add/remove individual rules                 |
| `DELETE` | `/api/agents/:agentId/wallets/:walletId/policy`       | Remove policy (wallet becomes fully locked) |

### Supported Policy Scenarios (all managed by our API)

**1. Max SOL transfer**
```ts
{ field_source: 'solana_system_program_instruction', field: 'Transfer.lamports', operator: 'lte', value: '1000000000' }
```

**2. Allowlist recipients**
```ts
{ field_source: 'solana_system_program_instruction', field: 'Transfer.to', operator: 'in', value: ['addr1', 'addr2'] }
```

**3. Denylist recipients**
```ts
{ field_source: 'solana_system_program_instruction', field: 'Transfer.to', operator: 'in', value: ['badAddr1'] }
// action: 'DENY'
```

**4. Allowlist programs (e.g. Jupiter only)**
```ts
{ field_source: 'solana_program_instruction', field: 'programId', operator: 'in', value: ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'] }
```

**5. Time-bound access window**
```ts
{ field_source: 'system', field: 'current_unix_timestamp', operator: 'gte', value: '1756699200' }
{ field_source: 'system', field: 'current_unix_timestamp', operator: 'lt',  value: '1759291200' }
```

**6. SPL token transfer with mint + amount cap**
```ts
{ field_source: 'solana_token_program_instruction', field: 'TransferChecked.mint', operator: 'eq', value: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }
{ field_source: 'solana_token_program_instruction', field: 'TransferChecked.amount', operator: 'lte', value: '5000000' }
```

**7. Block key export**
```ts
{ method: 'exportPrivateKey', conditions: [], action: 'DENY' }
```

---

## Agent-Facing Wallet API

These routes use `apiKeyAuth` middleware. The agent provides `x-api-key` header.

| Method | Route                                | Description                                |
| ------ | ------------------------------------ | ------------------------------------------ |
| `GET`  | `/agent/wallets`                     | List all wallets for this agent            |
| `GET`  | `/agent/wallets/:label/balance`      | Get SOL + SPL balances                     |
| `POST` | `/agent/wallets/:label/send`         | Send native SOL                            |
| `POST` | `/agent/wallets/:label/send-spl`     | Send SPL token                             |
| `POST` | `/agent/wallets/:label/swap`         | Swap via Jupiter                           |
| `POST` | `/agent/wallets/:label/launch-token` | Launch token via bags.fm                   |
| `GET`  | `/agent/wallets/:label/history`      | Transaction history                        |
| `POST` | `/agent/chat`                        | LLM chat → natural language wallet actions |

Both human and agent can perform wallet activities:
- **Human** uses `/api/agents/:agentId/wallets/:walletId/...` (Privy auth)
- **Agent** uses `/agent/wallets/:label/...` (API key auth)
Both paths call the same underlying `walletService` methods.

---

## Wallet Operations — Service Layer

### Send Native SOL
```ts
// src/services/walletService.ts
export const sendSOL = async (
  agentWalletId: string,
  toAddress: string,
  lamports: number,
): Promise<Result<string>> => {
  const wallet = await getWalletOrFail(agentWalletId)

  const connection = getSolanaConnection()
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(wallet.wallet_address),
      toPubkey: new PublicKey(toAddress),
      lamports,
    }),
  )
  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = new PublicKey(wallet.wallet_address)

  const serialized = tx.serialize({ requireAllSignatures: false }).toString('base64')
  return signAndSend(agentWalletId, serialized, wallet.agent_id)
}
```

### Send SPL Token
```ts
export const sendSPL = async (
  agentWalletId: string,
  mint: string,
  toAddress: string,
  amount: bigint,
): Promise<Result<string>> => {
  // Build TransferChecked instruction using @solana/spl-token
  // Then serialize and pass to signAndSend
}
```

### Swap via Jupiter
```ts
export const swapOnJupiter = async (
  agentWalletId: string,
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number,
): Promise<Result<string>> => {
  // 1. GET https://quote-api.jup.ag/v6/quote
  // 2. POST https://quote-api.jup.ag/v6/swap — pass wallet address as feePayer
  // 3. Deserialize returned tx, serialize unsigned, pass to signAndSend
}
```

### Launch Token via bags.fm
```ts
// src/services/bagsService.ts
import { BagsSDK } from '@bagsfm/bags-sdk'

export const launchToken = async (
  agentWalletId: string,
  params: LaunchTokenParams,
): Promise<Result<string>> => {
  const wallet = await getWalletOrFail(agentWalletId)
  const bags = new BagsSDK({ apiKey: env.BAGS_API_KEY })

  // bags SDK returns an unsigned transaction
  const { transaction } = await bags.launchToken({
    name: params.name,
    symbol: params.symbol,
    description: params.description,
    image: params.imageUrl,
    creator: wallet.wallet_address,
    initialBuyAmount: params.initialBuyAmount,
  })

  return signAndSend(agentWalletId, transaction, wallet.agent_id)
}
```

---

## LLM Layer — xAI Grok

Used for `/agent/chat` endpoint and natural language → intent parsing.

```ts
// src/services/llmService.ts
import { generateText } from 'ai'
import { xai } from '@ai-sdk/xai'
import { env } from '../utils/env'

const SYSTEM_PROMPT = `
You are the Ruby wallet assistant. You help AI agents manage their Solana wallets.
You can perform these actions: getBalance, sendSOL, sendSPL, swap, launchToken, getHistory.
Always respond with a JSON object: { action, params, message }.
If the intent is unclear, set action to "clarify" and ask in message.
`

export const parseIntent = async (
  userMessage: string,
  agentContext: AgentContext,
): Promise<Result<LLMIntent>> => {
  const { text } = await generateText({
    model: xai('grok-3'),
    system: SYSTEM_PROMPT,
    prompt: `Agent wallets: ${JSON.stringify(agentContext.wallets)}\nUser: ${userMessage}`,
  })

  try {
    const intent = JSON.parse(text) as LLMIntent
    return ok(intent)
  } catch {
    return err(new ValidationError('LLM returned unparseable intent', text))
  }
}
```

---

## Database Tables (Summary)

```
owners           — privy_user_id, email
agents           — owner_id, name, api_key_hash, is_active
agent_wallets    — agent_id, privy_wallet_id, wallet_address, label, purpose, is_active
wallet_policies  — privy_policy_id, privy_wallet_id, policy_name, policy_snapshot
transaction_logs — agent_id, wallet_id, tx_hash, type, amount, token_mint, status
```

All columns are `snake_case`. See `PRISMA.md` for full schema rules.

---

## Environment Variables Required

```env
# Privy
PRIVY_APP_ID=
PRIVY_APP_SECRET=
PRIVY_AUTHORIZATION_KEY=   # for server wallet signing

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# xAI Grok
XAI_API_KEY=

# bags.fm
BAGS_API_KEY=

# App
DATABASE_URL=
API_KEY_SECRET=             # 32+ char secret for API key HMAC
NODE_ENV=development
PORT=3000
```

---

## Security Checklist

- [ ] API keys hashed with SHA-256 before storage — raw key returned once only
- [ ] Every agent wallet has a Privy policy on creation
- [ ] Our policy engine runs before EVERY Privy signing call
- [ ] Private key export is DENIED by default on all wallets
- [ ] SAVINGS wallet outbound transactions are DENIED by default
- [ ] All inputs validated with Zod before reaching service layer
- [ ] Privy JWT verified on every human-facing request
- [ ] Agent API key checked on every agent-facing request
- [ ] No private keys ever touch our application code — all signing via Privy