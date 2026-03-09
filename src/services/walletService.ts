import {
  TransactionStatus,
  TransactionType,
  WalletPurpose,
} from '../generated/prisma/client'
import { getDefaultPolicyForPurpose } from '../templates/policyTemplates'
import type {
  BirdEyeWalletPortfolio,
  BirdEyeWalletTransactionHistory,
} from '../types/birdeye.interface'
import { AppError, ConflictError, NotFoundError } from '../types/errors'
import { Result, err, ok } from '../types/result'
import { birdEyeWalletRequests } from '../utils/http_request/birdeye/birdeye_wallet.request'
import { buildSOLTransfer, getConnection } from '../utils/solana.util'
import { buildSPLTransfer } from '../utils/spl.util'
import { policyService } from './policyService'
import { prismaService } from './prismaService'
import { privyService } from './privyService'
import { transactionLogService } from './transactionLogService'

/**
 * Wallet lifecycle and operation service.
 */
export const walletService = {
  /**
   * Create a new Privy server wallet for an agent.
   */
  createWalletForAgent: async (
    agentId: string,
    purpose: WalletPurpose,
    label?: string,
  ): Promise<
    Result<{
      id: string
      walletAddress: string
      purpose: WalletPurpose
      label: string
    }>
  > => {
    // 1. Create policy explicitly via Privy Policy API
    const policyParams = getDefaultPolicyForPurpose(purpose)
    const policyResult = await policyService.createPolicy(policyParams)

    // We strictly enforce policies, so fail if policy creation fails
    if (!policyResult.success) {
      console.error(
        '[Wallet] Failed to construct default policy:',
        policyResult.error,
      )
      return err(policyResult.error)
    }

    const policyId = policyResult.data.id

    // 2. Create Privy server wallet with the policy attached
    const privyResult = await privyService.createServerWallet([policyId])
    if (!privyResult.success) return privyResult

    const walletLabel = label ?? purpose.toLowerCase()

    // 2. Persist to DB
    const wallet = await prismaService.prisma.wallet.create({
      data: {
        agentId,
        privyWalletId: privyResult.data.id,
        walletAddress: privyResult.data.address,
        label: walletLabel,
        purpose,
        isActive: true,
        isDefault: false,
      },
      select: {
        id: true,
        walletAddress: true,
        purpose: true,
        label: true,
      },
    })

    return ok(wallet)
  },

  /**
   * List all active wallets for an agent.
   */
  listWallets: async (
    agentId: string,
  ): Promise<
    Result<
      Array<{
        id: string
        walletAddress: string
        label: string
        purpose: WalletPurpose
        isDefault: boolean
        createdAt: Date
      }>
    >
  > => {
    const wallets = await prismaService.prisma.wallet.findMany({
      where: { agentId, isActive: true, deletedAt: null },
      select: {
        id: true,
        walletAddress: true,
        label: true,
        purpose: true,
        isDefault: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })
    return ok(wallets)
  },

  /**
   * Get wallet by label for a given agent.
   */
  getWalletByLabel: async (
    agentId: string,
    label: string,
  ): Promise<
    Result<{
      id: string
      privyWalletId: string
      walletAddress: string
      label: string
      purpose: WalletPurpose
      agentId: string
    }>
  > => {
    if (!label)
      return err(new NotFoundError('Wallet', 'unspecified (label is required)'))

    const wallet = await prismaService.prisma.wallet.findFirst({
      where: {
        agentId,
        label: label.toLowerCase(),
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        privyWalletId: true,
        walletAddress: true,
        label: true,
        purpose: true,
        agentId: true,
      },
    })
    if (!wallet) return err(new NotFoundError('Wallet', label))
    return ok(wallet)
  },

  /**
   * Get wallet by ID.
   */
  getWalletById: async (
    walletId: string,
  ): Promise<
    Result<{
      id: string
      privyWalletId: string
      walletAddress: string
      label: string
      purpose: WalletPurpose
      agentId: string
    }>
  > => {
    const wallet = await prismaService.prisma.wallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        privyWalletId: true,
        walletAddress: true,
        label: true,
        purpose: true,
        agentId: true,
      },
    })
    if (!wallet || !wallet) return err(new NotFoundError('Wallet', walletId))
    return ok(wallet)
  },

  /**
   * Get total portfolio for a wallet via BirdEye.
   */
  getBalance: async (
    walletAddress: string,
  ): Promise<Result<BirdEyeWalletPortfolio>> => {
    const portfolioRes =
      await birdEyeWalletRequests.getWalletPortfolio(walletAddress)

    if (!portfolioRes.success || !portfolioRes.data) {
      return err(
        new AppError(
          portfolioRes.message || 'Failed to fetch BirdEye portfolio',
          'BIRDEYE_API_ERROR',
          500,
        ),
      )
    }

    return ok(portfolioRes.data)
  },

  /**
   * Get transaction history for a wallet via BirdEye.
   */
  getTransactionHistory: async (
    walletAddress: string,
  ): Promise<Result<BirdEyeWalletTransactionHistory>> => {
    const historyRes =
      await birdEyeWalletRequests.getWalletTransactionHistory(walletAddress)

    if (!historyRes.success || !historyRes.data) {
      return err(
        new AppError(
          historyRes.message || 'Failed to fetch BirdEye transaction history',
          'BIRDEYE_API_ERROR',
          500,
        ),
      )
    }

    return ok(historyRes.data)
  },

  /**
   * Delete a wallet. BLOCKS if wallet has any non-zero balance.
   */
  deleteWallet: async (
    walletId: string,
  ): Promise<Result<{ deleted: boolean }>> => {
    const walletResult = await walletService.getWalletById(walletId)
    if (!walletResult.success) return walletResult

    const wallet = walletResult.data

    // Check for assets
    const balanceResult = await walletService.getBalance(wallet.walletAddress)
    if (balanceResult.success) {
      const portfolio = balanceResult.data
      const hasBalance =
        portfolio.items && portfolio.items.some((t) => t.uiAmount > 0)

      if (hasBalance) {
        return err(
          new ConflictError(
            'Cannot delete wallet with non-zero balance. Transfer all assets first.',
          ),
        )
      }
    }

    // Soft delete
    await prismaService.prisma.wallet.update({
      where: { id: walletId },
      data: { isActive: false, deletedAt: new Date() },
    })

    return ok({ deleted: true })
  },

  /**
   * Set a wallet as the default for its agent.
   */
  setDefaultWallet: async (
    agentId: string,
    walletId: string,
  ): Promise<Result<{ success: boolean }>> => {
    await prismaService.prisma.$transaction(async (tx) => {
      // Unset all defaults for this agent
      await tx.wallet.updateMany({
        where: { agentId },
        data: { isDefault: false },
      })
      // Set the new default
      await tx.wallet.update({
        where: { id: walletId },
        data: { isDefault: true },
      })
    })

    return ok({ success: true })
  },

  /**
   * Send native SOL from a wallet.
   */
  sendSOL: async (
    walletId: string,
    toAddress: string,
    amountSOL: number,
    agentId: string,
  ): Promise<Result<{ txHash: string; logId: string }>> => {
    const walletResult = await walletService.getWalletById(walletId)
    if (!walletResult.success) return walletResult

    const wallet = walletResult.data
    const lamports = Math.floor(amountSOL * 1e9)

    // Build unsigned transaction
    const connection = getConnection()
    const serializedTx = await buildSOLTransfer(
      connection,
      wallet.walletAddress,
      toAddress,
      lamports,
    )

    // Log the transaction attempt
    const logResult = await transactionLogService.log({
      agentId,
      walletId,
      type: 'SEND_SOL' as TransactionType,
      amountRaw: lamports.toString(),
      toAddress,
    })
    const logId = logResult.success ? logResult.data.id : ''

    // Sign and send via Privy
    const signResult = await privyService.signAndSendTransaction(
      wallet.privyWalletId,
      serializedTx,
    )

    console.log('signResult', signResult)

    if (!signResult.success) {
      if (logId) {
        await transactionLogService.updateStatus(
          logId,
          'FAILED' as TransactionStatus,
          'Sign and send failed',
        )
      }
      return signResult
    }

    // Update log with tx hash
    if (logId) {
      await transactionLogService.updateStatus(
        logId,
        'CONFIRMED' as TransactionStatus,
        undefined,
        signResult.data.hash,
      )
    }

    return ok({ txHash: signResult.data.hash, logId })
  },

  /**
   * Send an SPL token from a wallet.
   */
  sendSPL: async (
    walletId: string,
    mint: string,
    toAddress: string,
    amount: number,
    agentId: string,
  ): Promise<Result<{ txHash: string; logId: string }>> => {
    const walletResult = await walletService.getWalletById(walletId)
    if (!walletResult.success) return walletResult

    const wallet = walletResult.data
    const connection = getConnection()

    // Build unsigned SPL transfer
    const serializedTx = await buildSPLTransfer(
      connection,
      wallet.walletAddress,
      toAddress,
      mint,
      amount,
    )

    // Log the transaction attempt
    const logResult = await transactionLogService.log({
      agentId,
      walletId,
      type: 'SEND_SPL' as TransactionType,
      amountRaw: amount.toString(),
      tokenMint: mint,
      toAddress,
    })
    const logId = logResult.success ? logResult.data.id : ''

    // Sign and send via Privy
    const signResult = await privyService.signAndSendTransaction(
      wallet.privyWalletId,
      serializedTx,
    )

    if (!signResult.success) {
      console.log('signResult.error.message', signResult.error.details)
      if (logId) {
        await transactionLogService.updateStatus(
          logId,
          'FAILED' as TransactionStatus,
          'Sign and send failed',
        )
      }
      return signResult
    }

    if (logId) {
      await transactionLogService.updateStatus(
        logId,
        'CONFIRMED' as TransactionStatus,
        undefined,
        signResult.data.hash,
      )
    }

    return ok({ txHash: signResult.data.hash, logId })
  },
}
