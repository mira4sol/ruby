# TypeScript & Node.js Engineering Standards
> Cursor must read and follow this file for ALL TypeScript/Node.js code in this project.
> These are non-negotiable engineering standards. Every file written must comply.

---

## Core Philosophy

- **Strict TypeScript always** — no shortcuts, no `any`, no implicit types
- **Arrow functions everywhere** — no `function` keyword except for exported named classes
- **Explicit over implicit** — types, return types, and error handling must always be stated
- **Immutability by default** — prefer `const`, `readonly`, and `as const`
- **Fail loudly** — errors must be typed, caught, and surfaced; never silently swallowed
- **Small, focused modules** — one responsibility per file, one concern per function

---

## TypeScript Rules

### NEVER use `any`
```ts
// ❌ NEVER
const handler = (req: any, res: any) => {}
const data: any = response.json()

// ✅ ALWAYS type everything
const handler = (req: Request, res: Response): void => {}
const data: ApiResponse = await response.json()
```

### ALWAYS use explicit return types
```ts
// ❌ NEVER — implicit return type
const getAgent = async (id: string) => {
  return db.agent.findUnique({ where: { id } })
}

// ✅ ALWAYS — explicit return type
const getAgent = async (id: string): Promise<Agent | null> => {
  return db.agent.findUnique({ where: { id } })
}
```

### ALWAYS use arrow functions
```ts
// ❌ NEVER — function keyword
async function createWallet(agentId: string) {}
export function hashApiKey(key: string) {}

// ✅ ALWAYS — arrow functions
const createWallet = async (agentId: string): Promise<Wallet> => {}
export const hashApiKey = (key: string): string => {}
```

### ALWAYS use `interface` for object shapes, `type` for unions/aliases
```ts
// ✅ Object shapes → interface
interface Agent {
  id: string
  owner_id: string
  name: string
  is_active: boolean
  created_at: Date
}

// ✅ Unions, aliases, computed types → type
type WalletPurpose = 'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL'
type ApiResponse<T> = { data: T; success: true } | { error: string; success: false }
```

### ALWAYS use `readonly` for immutable data
```ts
interface PolicyRule {
  readonly name: string
  readonly method: string
  readonly action: 'ALLOW' | 'DENY'
  readonly conditions: readonly PolicyCondition[]
}
```

### ALWAYS use `as const` for static objects
```ts
const WALLET_PURPOSES = ['TRADING', 'SAVINGS', 'GAS', 'GENERAL'] as const
type WalletPurpose = typeof WALLET_PURPOSES[number]

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const
```

---

## Error Handling

### ALWAYS use typed custom errors
```ts
// src/types/errors.ts
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401)
  }
}

export class PolicyViolationError extends AppError {
  constructor(rule: string) {
    super(`Transaction blocked by policy: ${rule}`, 'POLICY_VIOLATION', 403)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}
```

### ALWAYS use Result pattern for service-layer operations
```ts
// src/types/result.ts
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E }

export const ok = <T>(data: T): Result<T> => ({ success: true, data })
export const err = <E extends AppError>(error: E): Result<never, E> => ({ success: false, error })
```

### ALWAYS handle errors at controller layer
```ts
// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express'
import { AppError } from '../types/errors'

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    })
    return
  }

  console.error('[Unhandled Error]', error)
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  })
}
```

---

## Project Structure Conventions

```
src/
├── agent/                        # Agent logic
├── controllers/                  # HTTP request handlers — thin, delegate to services
├── services/                     # Business logic — all heavy lifting happens here
├── middlewares/                  # Express middlewares (auth, validation, error)
├── routes/                       # Route definitions — mount controllers only
├── models/                       # Prisma model extensions and DB query helpers
├── types/                        # Shared TypeScript interfaces, types, enums, errors
├── utils/                        # Pure utility functions (hashing, formatting, etc.)
├── utils/http_requests           # HTTP requests utilities
├── generated/                    # Prisma generated client — never edit manually
├── index.ts                      # App entrypoint — bootstraps express
├── middlewares.ts                # Global middleware registration
└── routes.ts                     # Global route registration
```

### Controller pattern — thin controllers only
```ts
// src/controllers/agentController.ts
import { Request, Response, NextFunction } from 'express'
import { agentService } from '../services/agentService'

export const createAgent = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await agentService.create(req.body, req.user.id)
    if (!result.success) return next(result.error)
    res.status(201).json({ success: true, data: result.data })
  } catch (error) {
    next(error)
  }
}
```

### Service pattern — all business logic
```ts
// src/services/agentService.ts
import { Result, ok, err } from '../types/result'
import { NotFoundError, ValidationError } from '../types/errors'
import { prisma } from '../utils/prisma'

export const agentService = {
  create: async (input: CreateAgentInput, ownerId: string): Promise<Result<Agent>> => {
    const owner = await prisma.owner.findUnique({ where: { id: ownerId } })
    if (!owner) return err(new NotFoundError('Owner', ownerId))

    const agent = await prisma.agent.create({
      data: {
        owner_id: ownerId,
        name: input.name,
        api_key_hash: await hashApiKey(generateApiKey()),
      },
    })

    return ok(agent)
  },
}
```

---

## Environment Variables

### ALWAYS use a typed env config
```ts
// src/utils/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  PRIVY_APP_ID: z.string().min(1),
  PRIVY_APP_SECRET: z.string().min(1),
  PRIVY_AUTHORIZATION_KEY: z.string().min(1),
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_NETWORK: z.enum(['devnet', 'mainnet-beta']).default('devnet'),
  XAI_API_KEY: z.string().min(1),
  BAGS_API_KEY: z.string().min(1),
  API_KEY_SECRET: z.string().min(32),
})

export const env = envSchema.parse(process.env)
```

---

## Async Patterns

### ALWAYS await — never fire and forget without error handling
```ts
// ❌ NEVER
someAsyncThing()

// ✅ ALWAYS
await someAsyncThing()

// ✅ OR — if intentionally background, still catch errors
someAsyncThing().catch((error) => logger.error('Background task failed', error))
```

### ALWAYS use Promise.all for parallel async operations
```ts
// ❌ Sequential — slow
const balance = await getBalance(walletId)
const history = await getHistory(walletId)

// ✅ Parallel — fast
const [balance, history] = await Promise.all([
  getBalance(walletId),
  getHistory(walletId),
])
```

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | `camelCase.ts` | `agentService.ts` |
| Variables | `camelCase` | `agentWallet` |
| Functions | `camelCase` | `createWallet` |
| Types/Interfaces | `PascalCase` | `AgentWallet` |
| Enums | `SCREAMING_SNAKE_CASE` | `WALLET_PURPOSE` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_WALLETS_PER_AGENT` |
| DB columns | `snake_case` (Prisma) | `owner_id`, `created_at` |
| Route params | `camelCase` | `/agents/:agentId` |
| Env variables | `SCREAMING_SNAKE_CASE` | `PRIVY_APP_SECRET` |

---

## Import Order

Always sort imports in this order (enforced by ESLint):
```ts
// 1. Node built-ins
import { randomBytes, createHash } from 'crypto'

// 2. External packages
import express, { Request, Response } from 'express'
import { PrivyClient } from '@privy-io/server-auth'

// 3. Internal absolute imports
import { agentService } from '../services/agentService'
import { AppError } from '../types/errors'

// 4. Types (import type)
import type { Agent, AgentWallet } from '../types'
```

---

## Validation

### ALWAYS validate request bodies with Zod
```ts
import { z } from 'zod'

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  wallets: z.array(z.enum(['TRADING', 'SAVINGS', 'GAS'])).min(1).default(['TRADING', 'GAS']),
})

export type CreateAgentInput = z.infer<typeof createAgentSchema>

// In middleware
export const validate = (schema: z.ZodSchema) => (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const result = schema.safeParse(req.body)
  if (!result.success) return next(new ValidationError('Invalid request body', result.error.flatten()))
  req.body = result.data
  next()
}
```

---

## tsconfig.json Standards

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Package Standards

Core packages always used in this project:
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "@privy-io/server-auth": "latest",
    "@solana/web3.js": "^1.98.0",
    "@bagsfm/bags-sdk": "latest",
    "ai": "latest",
    "@ai-sdk/xai": "latest",
    "zod": "^3.22.0",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "dotenv": "^16.0.0",
    "bs58": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0"
  }
}
```