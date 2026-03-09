import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import { env } from './env'

export const NATIVE_SOL_ADDRESS = '11111111111111111111111111111111'
export const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111111'
export const WRAPPED_SOL_MINT = 'So11111111111111111111111111111111111111112'

export const getConnection = (): Connection =>
  new Connection(env.SOLANA_RPC_URL)

export const isMintAddress = (address: string): boolean => {
  const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  return solanaAddressRegex.test(address)
}

export const isValidSolanaAddress = (address: string): boolean => {
  try {
    if (!address) return false
    const pubKey = new PublicKey(address)
    return PublicKey.isOnCurve(pubKey.toBytes())
  } catch {
    return false
  }
}

export const STABLECOIN_MINTS = [
  'EPjFWdd5AufqSSqeM2q8j6Q4p9DW4nAbB6w6kTptF7gS', // USDC
  'Es9vMFrzaCERk6Ls4L6U4cKkFGr2PzY9nwyDS4V8QG9Z', // USDT
] as const

export const isStablecoin = (mint: string): boolean => {
  return STABLECOIN_MINTS.includes(mint as (typeof STABLECOIN_MINTS)[number])
}

/**
 * Get SOL balance in lamports for an address.
 */
export const getSOLBalance = async (
  connection: Connection,
  address: string,
): Promise<number> => {
  const pubkey = new PublicKey(address)
  return connection.getBalance(pubkey)
}

/**
 * Build an unsigned SOL transfer transaction.
 * Returns a base64-encoded serialized transaction.
 */
export const buildSOLTransfer = async (
  connection: Connection,
  fromAddress: string,
  toAddress: string,
  lamports: number,
): Promise<string> => {
  const fromPubkey = new PublicKey(fromAddress)
  const toPubkey = new PublicKey(toAddress)

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports,
    }),
  )

  // Privy's API automatically fills the recentBlockhash when this dummy value is used
  tx.recentBlockhash = '11111111111111111111111111111111'
  tx.feePayer = fromPubkey

  // Serialize without requiring signatures (Privy will sign)
  const serialized = tx
    .serialize({ requireAllSignatures: false })
    .toString('base64')

  return serialized
}

/**
 * Confirm a transaction on-chain.
 */
export const confirmTransaction = async (
  connection: Connection,
  txHash: string,
): Promise<{ confirmed: boolean; error?: string }> => {
  try {
    const result = await connection.confirmTransaction(txHash, 'confirmed')
    if (result.value.err) {
      return { confirmed: false, error: JSON.stringify(result.value.err) }
    }
    return { confirmed: true }
  } catch (error) {
    return { confirmed: false, error: String(error) }
  }
}

/**
 * Helper function to normalize SOL mint addresses
 * Jupiter expects wrapped SOL mint, not native SOL addresses
 */
export const normalizeSolMint = (mint: string): string => {
  if (mint === NATIVE_SOL_ADDRESS || mint === NATIVE_SOL_MINT) {
    return WRAPPED_SOL_MINT
  }
  return mint
}

export const amountInBaseUnits = (amount: number, decimals: number) =>
  Math.floor(amount * Math.pow(10, decimals))
