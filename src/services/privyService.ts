import type { Owner } from '../generated/prisma/client'
import { AppError, NotFoundError } from '../types/errors'
import { Result, err, ok } from '../types/result'
import { privy } from '../utils/privy'
import { prismaService } from './prismaService'

// CAIP-2 identifiers for Solana chains
const SOLANA_CAIP2_DEVNET = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
const SOLANA_CAIP2_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'

/**
 * Wraps all Privy SDK interactions.
 * Uses @privy-io/node with privy.wallets().solana() convenience methods.
 */
export const privyService = {
  /**
   * Create a Privy server wallet (Solana).
   */
  createServerWallet: async (): Promise<
    Result<{ id: string; address: string }>
  > => {
    try {
      const wallet = await privy.wallets().create({ chain_type: 'solana' })
      return ok({ id: wallet.id, address: wallet.address })
    } catch (error) {
      console.error('[Privy] Failed to create server wallet:', error)
      return err(
        new AppError(
          'Privy wallet creation failed',
          'PRIVY_WALLET_CREATE_FAILED',
          500,
          error,
        ),
      )
    }
  },

  /**
   * Sign and send a Solana transaction via Privy.
   * The transaction must be base64-encoded and unsigned.
   */
  signAndSendTransaction: async (
    walletId: string,
    transaction: string,
    caip2 = SOLANA_CAIP2_DEVNET,
  ): Promise<Result<{ hash: string }>> => {
    try {
      const data = await privy
        .wallets()
        .solana()
        .signAndSendTransaction(walletId, {
          transaction,
          caip2,
        })
      return ok({ hash: data.hash })
    } catch (error) {
      console.error('[Privy] Failed to sign and send transaction:', error)
      return err(
        new AppError(
          'Transaction signing failed',
          'PRIVY_SIGN_FAILED',
          500,
          error,
        ),
      )
    }
  },

  /**
   * Sign a transaction without broadcasting (for multi-step flows like Jupiter).
   */
  signTransaction: async (
    walletId: string,
    transaction: string,
  ): Promise<Result<{ signedTransaction: string }>> => {
    try {
      const data = await privy.wallets().solana().signTransaction(walletId, {
        transaction,
      })
      return ok({ signedTransaction: data.signed_transaction })
    } catch (error) {
      console.error('[Privy] Failed to sign transaction:', error)
      return err(
        new AppError(
          'Transaction signing failed',
          'PRIVY_SIGN_FAILED',
          500,
          error,
        ),
      )
    }
  },

  /**
   * Sync owner record from Privy user ID.
   * Creates the owner if they don't exist yet.
   */
  syncOwner: async (privyUserId: string): Promise<Result<Owner>> => {
    try {
      const existing = await prismaService.prisma.owner.findUnique({
        where: { privyUserId },
      })
      if (existing) return ok(existing)

      // Fetch user details from Privy
      const privyUser = await privy.users()._get(privyUserId)

      // Extract email from linked_accounts
      const email =
        privyUser.linked_accounts.find((a) => a.type === 'email')?.address ||
        privyUser.linked_accounts.find((a) => a.type === 'google_oauth')?.email

      // console.log('privyUser.linked_accounts', emailAccount)
      // console.log('emailAccount', emailAccount)
      // const email =
      //   emailAccount && 'address' in emailAccount
      //     ? (emailAccount as { address: string }).address
      //     : null

      const owner = await prismaService.prisma.owner.create({
        data: {
          privyUserId,
          email,
        },
      })

      return ok(owner)
    } catch (error) {
      console.error('[Privy] Failed to sync owner:', error)
      return err(new NotFoundError('Owner sync', privyUserId))
    }
  },
}
