import { WalletPurpose } from '../generated/prisma/client'

// ─────────────────────────────────────
// Default Policy Definitions
// ─────────────────────────────────────

interface PolicyCondition {
  readonly fieldSource: string
  readonly field: string
  readonly operator: string
  readonly value: string | readonly string[]
}

interface PolicyRule {
  readonly name: string
  readonly method: string
  readonly action: 'ALLOW' | 'DENY'
  readonly conditions: readonly PolicyCondition[]
}

export interface PolicyDefinition {
  readonly version: '1.0'
  readonly name: string
  readonly chainType: 'solana'
  readonly rules: readonly PolicyRule[]
}

export const GAS_WALLET_POLICY: PolicyDefinition = {
  version: '1.0',
  name: 'Gas wallet defaults — SOL micro-transfers only',
  chainType: 'solana',
  rules: [
    {
      name: 'Allow SOL transfers up to 0.1 SOL',
      method: 'signAndSendTransaction',
      conditions: [
        {
          fieldSource: 'solana_system_program_instruction',
          field: 'Transfer.lamports',
          operator: 'lte',
          value: '100000000',
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
} as const

export const TRADING_WALLET_POLICY: PolicyDefinition = {
  version: '1.0',
  name: 'Trading wallet defaults — capped SOL + SPL + programs',
  chainType: 'solana',
  rules: [
    {
      name: 'Allow SOL transfers up to 10 SOL',
      method: 'signAndSendTransaction',
      conditions: [
        {
          fieldSource: 'solana_system_program_instruction',
          field: 'Transfer.lamports',
          operator: 'lte',
          value: '10000000000',
        },
      ],
      action: 'ALLOW',
    },
    {
      name: 'Allow SPL token transfers',
      method: 'signAndSendTransaction',
      conditions: [
        {
          fieldSource: 'solana_token_program_instruction',
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
          fieldSource: 'solana_program_instruction',
          field: 'programId',
          operator: 'in',
          value: [
            'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
            'ComputeBudget111111111111111111111111111111',
            '11111111111111111111111111111111',
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
} as const

export const SAVINGS_WALLET_POLICY: PolicyDefinition = {
  version: '1.0',
  name: 'Savings wallet defaults — receive only, no outbound',
  chainType: 'solana',
  rules: [
    {
      name: 'Block private key export',
      method: 'exportPrivateKey',
      conditions: [],
      action: 'DENY',
    },
  ],
} as const

export const GENERAL_WALLET_POLICY: PolicyDefinition = {
  version: '1.0',
  name: 'General wallet defaults — 1 SOL cap',
  chainType: 'solana',
  rules: [
    {
      name: 'Allow SOL transfers up to 1 SOL',
      method: 'signAndSendTransaction',
      conditions: [
        {
          fieldSource: 'solana_system_program_instruction',
          field: 'Transfer.lamports',
          operator: 'lte',
          value: '1000000000',
        },
      ],
      action: 'ALLOW',
    },
    {
      name: 'Allow SPL TransferChecked',
      method: 'signAndSendTransaction',
      conditions: [
        {
          fieldSource: 'solana_token_program_instruction',
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
} as const

// ─────────────────────────────────────
// Policy lookup
// ─────────────────────────────────────

const POLICY_MAP: Record<WalletPurpose, PolicyDefinition> = {
  GAS: GAS_WALLET_POLICY,
  TRADING: TRADING_WALLET_POLICY,
  SAVINGS: SAVINGS_WALLET_POLICY,
  GENERAL: GENERAL_WALLET_POLICY,
}

export const getDefaultPolicyForPurpose = (
  purpose: WalletPurpose,
): PolicyDefinition => {
  return POLICY_MAP[purpose]
}
