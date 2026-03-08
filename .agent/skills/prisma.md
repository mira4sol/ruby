# Prisma Standards & Best Practices

> Cursor must follow this file for ALL Prisma schema definitions, queries, and migrations.
> These rules are non-negotiable. Every model and query must comply.

---

## Core Rules

- **ALL column names are `snake_case`** — enforced via `@@map` and `@map`
- **ALL table names are `snake_case` plural** — enforced via `@@map`
- **Model names in Prisma schema are `PascalCase`** — mapped to snake_case in DB
- **ALWAYS use `@id` with `@default(uuid())`** — no integer IDs
- **ALWAYS define `created_at` and `updated_at`** on every model
- **ALWAYS use explicit `@relation` names** on foreign keys
- **NEVER use `String` for IDs** without a `@default` — always provide one
- **NEVER use `Json` type** unless absolutely unavoidable — prefer structured columns
- **ALWAYS use `@@index`** on frequently queried foreign key columns

---

## Naming Convention Reference

| Thing          | Convention              | Example              |
| -------------- | ----------------------- | -------------------- |
| Model name     | `PascalCase`            | `AgentWallet`        |
| DB table name  | `snake_case` plural     | `agent_wallets`      |
| Field name     | `camelCase` in schema   | `createdAt`          |
| DB column name | `snake_case` via `@map` | `created_at`         |
| Relation name  | `PascalCase`            | `AgentWalletToAgent` |
| Enum name      | `PascalCase`            | `WalletPurpose`      |
| Enum values    | `SCREAMING_SNAKE_CASE`  | `TRADING`, `SAVINGS` |

---

## Schema Template

```prisma
// prisma/models/schema.prisma

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────
// ENUMS
// ─────────────────────────────────────

enum WalletPurpose {
  TRADING
  SAVINGS
  GAS
  GENERAL
}

enum TransactionType {
  SEND_SOL
  SEND_SPL
  SWAP
  LAUNCH_TOKEN
  RECEIVE
}

enum TransactionStatus {
  PENDING
  CONFIRMED
  FAILED
}

// ─────────────────────────────────────
// MODELS
// ─────────────────────────────────────

model Owner {
  id           String   @id @default(uuid())
  privyUserId  String   @unique @map("privy_user_id")
  email        String?  @map("email")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  agents Agent[]

  @@map("owners")
}

model Agent {
  id         String   @id @default(uuid())
  ownerId    String   @map("owner_id")
  name       String   @map("name")
  apiKeyHash String   @unique @map("api_key_hash")
  isActive   Boolean  @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  owner            Owner             @relation("OwnerToAgent", fields: [ownerId], references: [id], onDelete: Cascade)
  wallets          AgentWallet[]
  transactionLogs  TransactionLog[]

  @@index([ownerId])
  @@map("agents")
}

model AgentWallet {
  id            String        @id @default(uuid())
  agentId       String        @map("agent_id")
  privyWalletId String        @unique @map("privy_wallet_id")
  walletAddress String        @unique @map("wallet_address")
  label         String        @map("label")
  purpose       WalletPurpose @map("purpose")
  isActive      Boolean       @default(true) @map("is_active")
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  agent           Agent           @relation("AgentToWallet", fields: [agentId], references: [id], onDelete: Cascade)
  policies        WalletPolicy[]
  transactionLogs TransactionLog[]

  @@index([agentId])
  @@index([walletAddress])
  @@map("agent_wallets")
}

model WalletPolicy {
  id             String   @id @default(uuid())
  privyPolicyId  String   @unique @map("privy_policy_id")
  privyWalletId  String   @map("privy_wallet_id")
  policyName     String   @map("policy_name")
  policySnapshot String   @map("policy_snapshot") // JSON string of full policy
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  wallet AgentWallet @relation("WalletToPolicy", fields: [privyWalletId], references: [privyWalletId], onDelete: Cascade)

  @@index([privyWalletId])
  @@map("wallet_policies")
}

model TransactionLog {
  id          String            @id @default(uuid())
  agentId     String            @map("agent_id")
  walletId    String            @map("wallet_id")
  txHash      String?           @unique @map("tx_hash")
  type        TransactionType   @map("type")
  status      TransactionStatus @default(PENDING) @map("status")
  amountRaw   String?           @map("amount_raw")   // lamports or token units as string
  tokenMint   String?           @map("token_mint")
  toAddress   String?           @map("to_address")
  errorMsg    String?           @map("error_msg")
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")

  agent  Agent       @relation("AgentToTransactionLog", fields: [agentId], references: [id], onDelete: Cascade)
  wallet AgentWallet @relation("WalletToTransactionLog", fields: [walletId], references: [id], onDelete: Cascade)

  @@index([agentId])
  @@index([walletId])
  @@index([txHash])
  @@index([createdAt])
  @@map("transaction_logs")
}
```

---

## Prisma Client Usage Patterns

### ALWAYS use a singleton client

```ts
// src/utils/prisma.ts
import { PrismaClient } from '../generated/prisma'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### ALWAYS select only the fields you need

```ts
// ❌ NEVER — fetches all columns including sensitive ones
const agent = await prisma.agent.findUnique({ where: { id } })

// ✅ ALWAYS — explicit field selection
const agent = await prisma.agent.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    is_active: true,
    owner_id: true,
    created_at: true,
  },
})
```

### ALWAYS use transactions for multi-step writes

```ts
// ✅ Use $transaction for atomic operations
const [agent, wallet] = await prisma.$transaction(async (tx) => {
  const newAgent = await tx.agent.create({ data: { ... } })
  const newWallet = await tx.agentWallet.create({ data: { agent_id: newAgent.id, ... } })
  return [newAgent, newWallet]
})
```

### ALWAYS paginate list queries

```ts
// ✅ Always include take + skip (or cursor-based) for lists
const wallets = await prisma.agentWallet.findMany({
  where: { agent_id: agentId },
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { created_at: 'desc' },
})
```

### ALWAYS use `findUniqueOrThrow` / `findFirstOrThrow` when record must exist

```ts
// ❌ NEVER — silent null, requires manual null check
const agent = await prisma.agent.findUnique({ where: { id } })

// ✅ ALWAYS — throws PrismaClientKnownRequestError if not found
const agent = await prisma.agent.findUniqueOrThrow({ where: { id } })
```

### NEVER use `deleteMany` without a `where` clause

```ts
// ❌ CATASTROPHIC — deletes everything
await prisma.transactionLog.deleteMany()

// ✅ ALWAYS scope deletes
await prisma.transactionLog.deleteMany({ where: { agent_id: agentId } })
```

---

## Migration Workflow

```bash
# 1. After editing schema — create migration
npx prisma migrate dev --name describe_your_change

# 2. Apply to production
npx prisma migrate deploy

# 3. Generate client after schema changes (always)
npx prisma generate

# 4. Open Prisma Studio for debugging
npx prisma studio

# 5. Reset DB in development
npx prisma migrate reset
```

**NEVER edit generated migration files manually.**
**ALWAYS run `prisma generate` after schema changes before writing queries.**

---

## prisma.config.ts

```ts
// prisma.config.ts
import path from 'path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: {
    kind: 'multi',
    files: ['prisma/models/user.prisma', 'prisma/models/schema.prisma'],
  },
})
```

---

## Index Strategy

| When to add `@@index`           | Rule                                  |
| ------------------------------- | ------------------------------------- |
| Foreign key columns             | Always                                |
| Columns used in `WHERE` clauses | Always                                |
| Columns used in `ORDER BY`      | If frequently sorted                  |
| Columns with high cardinality   | Preferred                             |
| Boolean flags                   | Never — low cardinality, not worth it |
| `created_at`                    | Yes — used in pagination              |
| `tx_hash`                       | Yes — looked up frequently            |

---

## Soft Delete Pattern

For agents and wallets, prefer soft delete over hard delete:

```prisma
// In schema — add to Agent and AgentWallet
deletedAt DateTime? @map("deleted_at")

// In queries — always filter out deleted records
const activeAgents = await prisma.agent.findMany({
  where: { owner_id: ownerId, deleted_at: null },
})

// Soft delete
await prisma.agent.update({
  where: { id: agentId },
  data: { deleted_at: new Date(), is_active: false },
})
```

---

## Common Anti-Patterns — NEVER DO THESE

```ts
// ❌ N+1 queries — never loop and query inside
for (const agent of agents) {
  const wallets = await prisma.agentWallet.findMany({
    where: { agent_id: agent.id },
  })
}

// ✅ Use include or a single IN query
const agents = await prisma.agent.findMany({
  where: { owner_id: ownerId },
  include: { wallets: true },
})

// ❌ Raw SQL without parameterization
await prisma.$queryRawUnsafe(`SELECT * FROM agents WHERE id = '${id}'`)

// ✅ Always parameterized
await prisma.$queryRaw`SELECT * FROM agents WHERE id = ${id}`

// ❌ Storing raw API keys in the database
await prisma.agent.create({ data: { api_key: rawKey } })

// ✅ Always hash first
await prisma.agent.create({ data: { api_key_hash: sha256(rawKey) } })
```
