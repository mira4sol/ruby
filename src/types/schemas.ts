import { z } from 'zod/v4'

// ─────────────────────────────────────
// Auth
// ─────────────────────────────────────

export const syncOwnerSchema = z.object({
  // No body needed — owner is extracted from Privy JWT
})

// ─────────────────────────────────────
// Agents
// ─────────────────────────────────────

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  wallets: z
    .array(z.enum(['TRADING', 'SAVINGS', 'GAS', 'GENERAL']))
    .min(1)
    .default(['TRADING', 'GAS']),
})

export type CreateAgentInput = z.infer<typeof createAgentSchema>

// ─────────────────────────────────────
// Wallets
// ─────────────────────────────────────

export const createWalletSchema = z.object({
  purpose: z.enum(['TRADING', 'SAVINGS', 'GAS', 'GENERAL']),
  label: z.string().min(1).max(50).optional(),
})

export type CreateWalletInput = z.infer<typeof createWalletSchema>

export const sendSOLSchema = z.object({
  toAddress: z.string().min(32).max(44),
  amount: z.number().positive().describe('Amount in SOL (not lamports)'),
})

export type SendSOLInput = z.infer<typeof sendSOLSchema>

export const sendSPLSchema = z.object({
  toAddress: z.string().min(32).max(44),
  mint: z.string().min(32).max(44),
  amount: z
    .number()
    .positive()
    .describe('Amount in token units (human-readable)'),
})

export type SendSPLInput = z.infer<typeof sendSPLSchema>

export const swapSchema = z.object({
  inputMint: z.string().min(32).max(44),
  outputMint: z.string().min(32).max(44),
  amount: z.number().positive().describe('Amount in input token units'),
})

export type SwapInput = z.infer<typeof swapSchema>

// ─────────────────────────────────────
// Jupiter Trigger (Limit Orders)
// ─────────────────────────────────────

export const triggerOrderSchema = z.object({
  inputMint: z.string().min(32).max(44),
  outputMint: z.string().min(32).max(44),
  inAmount: z.string().describe('Amount in smallest units as string'),
  targetPrice: z.number().positive().describe('Target price to trigger at'),
  expiredAt: z.string().optional().describe('ISO 8601 expiry for the order'),
})

export type TriggerOrderInput = z.infer<typeof triggerOrderSchema>

// ─────────────────────────────────────
// Jupiter Recurring (DCA)
// ─────────────────────────────────────

export const recurringOrderSchema = z.object({
  inputMint: z.string().min(32).max(44),
  outputMint: z.string().min(32).max(44),
  params: z.object({
    time: z.object({
      inAmount: z.coerce
        .number()
        .positive()
        .describe('Total amount in smallest units'),
      numberOfOrders: z.number().int().min(2),
      interval: z
        .number()
        .int()
        .positive()
        .describe('Seconds between each order'),
      startAt: z
        .number()
        .int()
        .nullable()
        .default(null)
        .describe('Unix start time'),
    }),
  }),
})

export type RecurringOrderInput = z.infer<typeof recurringOrderSchema>

// ─────────────────────────────────────
// Policy
// ─────────────────────────────────────

const policyConditionSchema = z.object({
  fieldSource: z.string(),
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in']),
  value: z.union([z.string(), z.array(z.string())]),
})

const policyRuleSchema = z.object({
  name: z.string().min(1).max(200),
  method: z.string(),
  action: z.enum(['ALLOW', 'DENY']),
  conditions: z.array(policyConditionSchema).default([]),
})

export const updatePolicySchema = z.object({
  name: z.string().min(1).max(200),
  rules: z.array(policyRuleSchema).min(1),
})

export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>

// ─────────────────────────────────────
// Pagination
// ─────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationInput = z.infer<typeof paginationSchema>
