import { TransactionStatus, TransactionType } from '../generated/prisma/client'
import { AppError } from '../types/errors'
import { Result, err, ok } from '../types/result'
import type {
  RecurringOrderInput,
  SwapInput,
  TriggerOrderInput,
} from '../types/schemas'
import {
  jupiterRecurring,
  jupiterTrigger,
  jupiterUltra,
} from '../utils/jupiter.util'
import { privyService } from './privyService'
import { transactionLogService } from './transactionLogService'
import { walletService } from './walletService'

/**
 * Jupiter service — high-level swap, trigger, and recurring operations
 * that integrate with the wallet engine + transaction logging.
 */
export const jupiterService = {
  /**
   * Swap via Jupiter Ultra.
   * Flow: getOrder → sign via Privy → execute → log
   */
  swap: async (
    walletId: string,
    input: SwapInput,
    agentId: string,
  ): Promise<Result<{ txHash: string; logId: string; outAmount: string }>> => {
    const walletResult = await walletService.getWalletById(walletId)
    if (!walletResult.success) return walletResult

    const wallet = walletResult.data

    try {
      // 1. Get order (quote + unsigned tx)
      const order = await jupiterUltra.getOrder({
        inputMint: input.inputMint,
        outputMint: input.outputMint,
        amount: input.amount,
        taker: wallet.walletAddress,
      })

      if (order.errorCode) {
        return err(
          new AppError(
            order.errorMessage ?? 'Jupiter order failed',
            'JUPITER_ORDER_FAILED',
            400,
          ),
        )
      }

      // 2. Log the swap attempt
      const logResult = await transactionLogService.log({
        agentId,
        walletId,
        type: 'SWAP' as TransactionType,
        amountRaw: order.inAmount,
        tokenMint: input.inputMint,
        metadata: JSON.stringify({
          outputMint: input.outputMint,
          expectedOutAmount: order.outAmount,
          requestId: order.requestId,
        }),
      })
      const logId = logResult.success ? logResult.data.id : ''

      // 3. Sign the transaction via Privy
      const signResult = await privyService.signTransaction(
        wallet.privyWalletId,
        order.transaction,
      )

      if (!signResult.success) {
        if (logId) {
          await transactionLogService.updateStatus(
            logId,
            'FAILED' as TransactionStatus,
            'Failed to sign swap tx',
          )
        }
        return signResult
      }

      // 4. Execute the signed transaction via Jupiter
      const executeResult = await jupiterUltra.execute(
        signResult.data.signedTransaction,
        order.requestId,
      )

      if (logId) {
        await transactionLogService.updateStatus(
          logId,
          'CONFIRMED' as TransactionStatus,
          undefined,
          executeResult.signature,
        )
      }

      return ok({
        txHash: executeResult.signature,
        logId,
        outAmount: executeResult.outputAmountResult ?? order.outAmount,
      })
    } catch (error) {
      console.error('[Jupiter] Swap failed:', error)
      return err(new AppError('Swap failed', 'SWAP_FAILED', 500, error))
    }
  },

  /**
   * Create a trigger (limit) order.
   * Flow: createOrder → sign via Privy → execute → log
   */
  createTriggerOrder: async (
    walletId: string,
    input: TriggerOrderInput,
    agentId: string,
  ): Promise<Result<{ txId: string; logId: string }>> => {
    const walletResult = await walletService.getWalletById(walletId)
    if (!walletResult.success) return walletResult

    const wallet = walletResult.data

    try {
      // 1. Create order (unsigned tx)
      const order = await jupiterTrigger.createOrder({
        inputMint: input.inputMint,
        outputMint: input.outputMint,
        maker: wallet.walletAddress,
        payer: wallet.walletAddress,
        inAmount: input.inAmount,
        outAmount: Math.floor(
          parseFloat(input.inAmount) * input.targetPrice,
        ).toString(),
        expiredAt: input.expiredAt,
      })

      // 2. Log
      const logResult = await transactionLogService.log({
        agentId,
        walletId,
        type: 'TRIGGER_ORDER' as TransactionType,
        amountRaw: input.inAmount,
        tokenMint: input.inputMint,
        metadata: JSON.stringify({
          outputMint: input.outputMint,
          targetPrice: input.targetPrice,
        }),
      })
      const logId = logResult.success ? logResult.data.id : ''

      // 3. Sign via Privy
      const signResult = await privyService.signTransaction(
        wallet.privyWalletId,
        order.order,
      )
      if (!signResult.success) {
        if (logId) {
          await transactionLogService.updateStatus(
            logId,
            'FAILED' as TransactionStatus,
            'Failed to sign trigger order',
          )
        }
        return signResult
      }

      // 4. Execute
      const executeResult = await jupiterTrigger.execute(
        signResult.data.signedTransaction,
      )

      if (logId) {
        await transactionLogService.updateStatus(
          logId,
          'CONFIRMED' as TransactionStatus,
          undefined,
          executeResult.txId,
        )
      }

      return ok({ txId: executeResult.txId, logId })
    } catch (error) {
      console.error('[Jupiter] Trigger order failed:', error)
      return err(
        new AppError('Trigger order failed', 'TRIGGER_FAILED', 500, error),
      )
    }
  },

  /**
   * Create a recurring (DCA) order.
   * Flow: createOrder → sign via Privy → execute → log
   */
  createRecurringOrder: async (
    walletId: string,
    input: RecurringOrderInput,
    agentId: string,
  ): Promise<Result<{ txId: string; logId: string }>> => {
    const walletResult = await walletService.getWalletById(walletId)
    if (!walletResult.success) return walletResult

    const wallet = walletResult.data

    try {
      // 1. Create recurring order (unsigned tx)
      const order = await jupiterRecurring.createOrder({
        inputMint: input.inputMint,
        outputMint: input.outputMint,
        maker: wallet.walletAddress,
        payer: wallet.walletAddress,
        inAmount: input.inAmount,
        params: {
          time: {
            numberOfOrders: input.numberOfOrders,
            interval: input.intervalSeconds,
          },
        },
      })

      // 2. Log
      const logResult = await transactionLogService.log({
        agentId,
        walletId,
        type: 'RECURRING_ORDER' as TransactionType,
        amountRaw: input.inAmount,
        tokenMint: input.inputMint,
        metadata: JSON.stringify({
          outputMint: input.outputMint,
          numberOfOrders: input.numberOfOrders,
          intervalSeconds: input.intervalSeconds,
        }),
      })
      const logId = logResult.success ? logResult.data.id : ''

      // 3. Sign via Privy
      const signResult = await privyService.signTransaction(
        wallet.privyWalletId,
        order.order,
      )
      if (!signResult.success) {
        if (logId) {
          await transactionLogService.updateStatus(
            logId,
            'FAILED' as TransactionStatus,
            'Failed to sign recurring order',
          )
        }
        return signResult
      }

      // 4. Execute
      const executeResult = await jupiterRecurring.execute(
        signResult.data.signedTransaction,
      )

      if (logId) {
        await transactionLogService.updateStatus(
          logId,
          'CONFIRMED' as TransactionStatus,
          undefined,
          executeResult.txId,
        )
      }

      return ok({ txId: executeResult.txId, logId })
    } catch (error) {
      console.error('[Jupiter] Recurring order failed:', error)
      return err(
        new AppError('Recurring order failed', 'RECURRING_FAILED', 500, error),
      )
    }
  },

  /**
   * Get all trigger + recurring orders for a wallet.
   */
  getOrders: async (
    walletAddress: string,
  ): Promise<
    Result<{
      trigger: unknown[]
      recurring: unknown[]
    }>
  > => {
    try {
      const [triggerResult, recurringResult] = await Promise.all([
        jupiterTrigger.getOrders(walletAddress),
        jupiterRecurring.getOrders(walletAddress),
      ])

      return ok({
        trigger: triggerResult.orders,
        recurring: recurringResult.orders,
      })
    } catch (error) {
      console.error('[Jupiter] Failed to fetch orders:', error)
      return err(
        new AppError(
          'Failed to fetch orders',
          'ORDERS_FETCH_FAILED',
          500,
          error,
        ),
      )
    }
  },
}
