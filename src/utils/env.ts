import 'dotenv/config'
import { z } from 'zod/v4'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Privy
  PRIVY_APP_ID: z.string().min(1, 'PRIVY_APP_ID is required'),
  PRIVY_APP_SECRET: z.string().min(1, 'PRIVY_APP_SECRET is required'),
  PRIVY_AUTHORIZATION_KEY: z.string().optional(),

  // Solana
  SOLANA_RPC_URL: z.string().default('https://api.devnet.solana.com'),
  SOLANA_NETWORK: z.enum(['devnet', 'mainnet-beta']).default('devnet'),

  // External APIs
  BIRDEYE_API_KEY: z.string().min(1, 'BIRDEYE_API_KEY is required'),
  JUPITER_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),

  // Security
  API_KEY_SECRET: z
    .string()
    .min(32, 'API_KEY_SECRET must be at least 32 characters'),
})

export type Env = z.infer<typeof envSchema>

export const env = envSchema.parse(process.env)

// Legacy compatibility — re-export as ENV for existing imports
export const ENV = env
