import { PolicyCreateParams } from '@privy-io/node/resources'
import { WalletPurpose } from '../generated/prisma/client'

// ─────────────────────────────────────
// Default Policy Definitions
// ─────────────────────────────────────

export const GAS_WALLET_POLICY: PolicyCreateParams = {
  version: '1.0',
  name: 'Gas wallet defaults — SOL micro-transfers only',
  chain_type: 'solana',
  rules: [
    {
      name: 'Allow SOL transfers up to 0.1 SOL',
      method: 'signAndSendTransaction',
      conditions: [
        {
          field_source: 'solana_system_program_instruction',
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

export const TRADING_WALLET_POLICY: PolicyCreateParams = {
  version: '1.0',
  name: 'Trading wallet defaults — capped SOL + SPL + programs',
  chain_type: 'solana',
  rules: [
    {
      name: 'Allow SOL transfers up to 10 SOL',
      method: 'signAndSendTransaction',
      conditions: [
        {
          field_source: 'solana_system_program_instruction',
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

export const SAVINGS_WALLET_POLICY: PolicyCreateParams = {
  version: '1.0',
  name: 'Savings wallet defaults — receive only, no outbound',
  chain_type: 'solana',
  rules: [
    {
      name: 'Block private key export',
      method: 'exportPrivateKey',
      conditions: [],
      action: 'DENY',
    },
  ],
} as const

export const GENERAL_WALLET_POLICY: PolicyCreateParams = {
  version: '1.0',
  name: 'General wallet defaults — 1 SOL cap',
  chain_type: 'solana',
  rules: [
    {
      name: 'Allow SOL transfers up to 1 SOL',
      method: 'signAndSendTransaction',
      conditions: [
        {
          field_source: 'solana_system_program_instruction',
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
} as const

// ─────────────────────────────────────
// Policy lookup
// ─────────────────────────────────────

const POLICY_MAP: Record<WalletPurpose, PolicyCreateParams> = {
  GAS: GAS_WALLET_POLICY,
  TRADING: TRADING_WALLET_POLICY,
  SAVINGS: SAVINGS_WALLET_POLICY,
  GENERAL: GENERAL_WALLET_POLICY,
}

export const getDefaultPolicyForPurpose = (
  purpose: WalletPurpose,
): PolicyCreateParams => {
  return POLICY_MAP[purpose]
}
