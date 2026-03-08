import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'

/**
 * Get or create an Associated Token Account for a mint + owner.
 * Returns the ATA address and whether it already existed.
 */
export const getOrCreateATA = async (
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  payer: PublicKey,
): Promise<{
  ata: PublicKey
  instruction?: ReturnType<typeof createAssociatedTokenAccountInstruction>
}> => {
  const ata = await getAssociatedTokenAddress(mint, owner)

  const account = await connection.getAccountInfo(ata)
  if (account) {
    return { ata }
  }

  // ATA doesn't exist — return the instruction to create it
  const instruction = createAssociatedTokenAccountInstruction(
    payer,
    ata,
    owner,
    mint,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )

  return { ata, instruction }
}

/**
 * Build an unsigned SPL token transfer (TransferChecked) transaction.
 * Returns a base64-encoded serialized transaction.
 *
 * @param amount - Human-readable amount (will be multiplied by 10^decimals)
 */
export const buildSPLTransfer = async (
  connection: Connection,
  fromAddress: string,
  toAddress: string,
  mintAddress: string,
  amount: number,
): Promise<string> => {
  const fromPubkey = new PublicKey(fromAddress)
  const toPubkey = new PublicKey(toAddress)
  const mintPubkey = new PublicKey(mintAddress)

  // Fetch mint info for decimals
  const mintInfo = await getMint(connection, mintPubkey)
  const decimals = mintInfo.decimals
  const rawAmount = BigInt(Math.floor(amount * 10 ** decimals))

  // Get source ATA
  const sourceATA = await getAssociatedTokenAddress(mintPubkey, fromPubkey)

  // Get or create destination ATA
  const { ata: destATA, instruction: createATAIx } = await getOrCreateATA(
    connection,
    mintPubkey,
    toPubkey,
    fromPubkey, // payer
  )

  const tx = new Transaction()

  // Add ATA creation instruction if needed
  if (createATAIx) {
    tx.add(createATAIx)
  }

  // Add transfer checked instruction
  tx.add(
    createTransferCheckedInstruction(
      sourceATA,
      mintPubkey,
      destATA,
      fromPubkey, // authority (Privy will sign)
      rawAmount,
      decimals,
    ),
  )

  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = fromPubkey

  // Serialize unsigned (Privy signs via server wallet)
  const serialized = tx
    .serialize({ requireAllSignatures: false })
    .toString('base64')

  return serialized
}

/**
 * Get all SPL token balances for a wallet address.
 */
export const getSPLBalances = async (
  connection: Connection,
  ownerAddress: string,
): Promise<
  Array<{
    mint: string
    amount: string
    decimals: number
    uiAmount: number
  }>
> => {
  const owner = new PublicKey(ownerAddress)

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  })

  return tokenAccounts.value
    .map((account) => {
      const info = account.account.data.parsed.info
      return {
        mint: info.mint as string,
        amount: info.tokenAmount.amount as string,
        decimals: info.tokenAmount.decimals as number,
        uiAmount: info.tokenAmount.uiAmount as number,
      }
    })
    .filter((t) => parseFloat(t.amount) > 0) // Only non-zero balances
}

/**
 * Get the number of decimals for a token mint.
 */
export const getTokenDecimals = async (
  connection: Connection,
  mintAddress: string,
): Promise<number> => {
  const mintPubkey = new PublicKey(mintAddress)
  const mintInfo = await getMint(connection, mintPubkey)
  return mintInfo.decimals
}
