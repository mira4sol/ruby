import { TransactionStatus, TransactionType } from '../generated/prisma/client'
import { NotFoundError } from '../types/errors'
import { Result, err, ok } from '../types/result'
import { prismaService } from './prismaService'

/**
 * Logs every agent action to the transaction_logs table.
 */
export const transactionLogService = {
  /**
   * Create a new transaction log entry.
   */
  log: async (params: {
    agentId: string
    walletId: string
    type: TransactionType
    txHash?: string
    amountRaw?: string
    tokenMint?: string
    toAddress?: string
    metadata?: any
    status?: TransactionStatus
  }): Promise<Result<{ id: string }>> => {
    try {
      const log = await prismaService.prisma.transactionLog.create({
        data: {
          agentId: params.agentId,
          walletId: params.walletId,
          type: params.type,
          txHash: params.txHash ?? null,
          amountRaw: params.amountRaw ?? null,
          tokenMint: params.tokenMint ?? null,
          toAddress: params.toAddress ?? null,
          ...(params.metadata !== undefined
            ? { metadata: params.metadata }
            : {}),
          status: params.status ?? 'PENDING',
        },
        select: { id: true },
      })
      return ok(log)
    } catch (error) {
      console.error('[TransactionLog] Failed to create log:', error)
      return err(new NotFoundError('TransactionLog', 'create'))
    }
  },

  /**
   * Update the status of a transaction log.
   */
  updateStatus: async (
    logId: string,
    status: TransactionStatus,
    errorMsg?: string,
    txHash?: string,
  ): Promise<void> => {
    await prismaService.prisma.transactionLog.update({
      where: { id: logId },
      data: {
        status,
        ...(errorMsg ? { errorMsg } : {}),
        ...(txHash ? { txHash } : {}),
      },
    })
  },

  /**
   * Get paginated transaction history.
   */
  getHistory: async (
    agentId: string,
    walletId?: string,
    page = 1,
    limit = 20,
  ): Promise<
    Result<{
      transactions: Array<{
        id: string
        txHash: string | null
        type: TransactionType
        status: TransactionStatus
        amountRaw: string | null
        tokenMint: string | null
        toAddress: string | null
        metadata: any
        createdAt: Date
      }>
      total: number
    }>
  > => {
    const where = {
      agentId,
      ...(walletId ? { walletId } : {}),
    }

    const [transactions, total] = await Promise.all([
      prismaService.prisma.transactionLog.findMany({
        where,
        select: {
          id: true,
          txHash: true,
          type: true,
          status: true,
          amountRaw: true,
          tokenMint: true,
          toAddress: true,
          metadata: true,
          createdAt: true,
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaService.prisma.transactionLog.count({ where }),
    ])

    return ok({ transactions, total })
  },
}
