import {
  TransactionStatus,
  TransactionType,
  WalletPurpose,
} from '../generated/prisma/client'
import { ConflictError, NotFoundError } from '../types/errors'
import { Result, err, ok } from '../types/result'
import {
  buildSOLTransfer,
  getConnection,
  getSOLBalance,
} from '../utils/solana.util'
import { buildSPLTransfer, getSPLBalances } from '../utils/spl.util'
import { getDefaultPolicyForPurpose } from './policyService'
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
    // 1. Create Privy server wallet
    const privyResult = await privyService.createServerWallet()
    if (!privyResult.success) return privyResult

    const walletLabel = label ?? purpose.toLowerCase()

    // 2. Persist to DB
    const wallet = await prismaService.prisma.agentWallet.create({
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

    // 3. Attach default policy (best-effort — log but don't fail wallet creation)
    try {
      const policyDef = getDefaultPolicyForPurpose(purpose)
      // NOTE: Policy creation via Privy API is available but depends on Privy plan.
      // For now, store the policy snapshot locally for reference.
      await prismaService.prisma.walletPolicy.create({
        data: {
          privyPolicyId: `local-${wallet.id}`,
          privyWalletId: privyResult.data.id,
          policyName: policyDef.name,
          policySnapshot: JSON.stringify(policyDef),
        },
      })
    } catch (policyError) {
      console.error('[Wallet] Failed to attach default policy:', policyError)
    }

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
    const wallets = await prismaService.prisma.agentWallet.findMany({
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
    const wallet = await prismaService.prisma.agentWallet.findFirst({
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
    const wallet = await prismaService.prisma.agentWallet.findUnique({
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
   * Get SOL + SPL balances for a wallet.
   */
  getBalance: async (
    walletAddress: string,
  ): Promise<
    Result<{
      sol: number
      tokens: Array<{
        mint: string
        amount: string
        decimals: number
        uiAmount: number
      }>
    }>
  > => {
    const connection = getConnection()

    const [solBalance, splBalances] = await Promise.all([
      getSOLBalance(connection, walletAddress),
      getSPLBalances(connection, walletAddress),
    ])

    return ok({
      sol: solBalance / 1e9, // Convert lamports to SOL
      tokens: splBalances,
    })
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
      const { sol, tokens } = balanceResult.data
      if (sol > 0.001 || tokens.some((t) => parseFloat(t.amount) > 0)) {
        return err(
          new ConflictError(
            'Cannot delete wallet with non-zero balance. Transfer all assets first.',
          ),
        )
      }
    }

    // Soft delete
    await prismaService.prisma.agentWallet.update({
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
      await tx.agentWallet.updateMany({
        where: { agentId },
        data: { isDefault: false },
      })
      // Set the new default
      await tx.agentWallet.update({
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
