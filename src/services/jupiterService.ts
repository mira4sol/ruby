import { amountInBaseUnits, normalizeSolMint } from '@/utils/solana.util'
import { TransactionStatus, TransactionType } from '../generated/prisma/client'
import { AppError } from '../types/errors'
import { Result, err, ok } from '../types/result'
import type {
  RecurringOrderInput,
  SwapInput,
  TriggerOrderInput,
} from '../types/schemas'
import {
  jupiterPrice,
  jupiterRecurring,
  jupiterTrigger,
  jupiterUltra,
  type RecurringOrder,
  type TriggerOrder,
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
      console.log('getting price')
      const price = await jupiterPrice.getPrice([
        input.inputMint,
        input.outputMint,
      ])

      // 1. Get order (quote + unsigned tx)
      const order = await jupiterUltra.getOrder({
        inputMint: normalizeSolMint(input.inputMint),
        outputMint: normalizeSolMint(input.outputMint),
        amount: amountInBaseUnits(
          input.amount,
          price[input.inputMint].decimals,
        ),
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

      console.log('order', order)

      return ok({
        txHash: executeResult.signature,
        logId,
        outAmount: executeResult.outputAmountResult ?? order.outAmount,
      })
    } catch (error: any) {
      console.error('[Jupiter] Swap failed:', error?.response || error)
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
      const price = await jupiterPrice.getPrice([
        input.inputMint,
        input.outputMint,
      ])
      input.inAmount = amountInBaseUnits(
        parseFloat(input.inAmount),
        price[input.inputMint].decimals,
      ).toString()
      // 1. Create order (unsigned tx)
      const order = await jupiterTrigger.createOrder({
        inputMint: input.inputMint,
        outputMint: input.outputMint,
        maker: wallet.walletAddress,
        payer: wallet.walletAddress,
        params: {
          makingAmount: input.inAmount,
          takingAmount: Math.floor(
            parseFloat(input.inAmount) *
              input.targetPrice *
              (10 ** price[input.outputMint].decimals /
                10 ** price[input.inputMint].decimals),
          ).toString(),
          // takingAmount: Math.floor(
          //   parseFloat(input.inAmount) * input.targetPrice,
          // ).toString(),
          expiredAt: input.expiredAt,
        },
      })
      console.log('order', order)

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
          requestId: order.requestId,
          order: order.order,
        }),
      })
      const logId = logResult.success ? logResult.data.id : ''

      // 3. Sign via Privy
      const signResult = await privyService.signTransaction(
        wallet.privyWalletId,
        order.transaction,
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
      const executeResult = await jupiterTrigger.execute({
        signedTransaction: signResult.data.signedTransaction,
        requestId: order?.requestId,
      })

      if (logId) {
        await transactionLogService.updateStatus(
          logId,
          'CONFIRMED' as TransactionStatus,
          undefined,
          executeResult.signature,
        )
      }

      return ok({ txId: executeResult.signature, logId })
    } catch (error: any) {
      console.error(
        '[Jupiter] Trigger order failed:',
        error?.response?.data || error,
      )
      console.error(
        '[Jupiter] Trigger order zod failed:',
        error?.response?.data?.error || error,
      )
      return err(
        new AppError('Trigger order failed', 'TRIGGER_FAILED', 500, error),
      )
    }
  },

  /**
   * Cancel a trigger (limit) order.
   */
  cancelTriggerOrder: async (
    walletId: string,
    orderKey: string,
    agentId: string,
  ): Promise<Result<{ txId: string; logId: string }>> => {
    const walletResult = await walletService.getWalletById(walletId)
    if (!walletResult.success) return walletResult

    const wallet = walletResult.data

    try {
      // 1. Get cancellation transaction
      const order = await jupiterTrigger.cancelOrder(
        wallet.walletAddress,
        orderKey,
      )
      console.log('order', order)

      // 2. Log intention
      const logResult = await transactionLogService.log({
        agentId,
        walletId,
        type: 'TRIGGER_ORDER' as TransactionType,
        metadata: JSON.stringify({ action: 'cancel', orderKey }),
      })
      const logId = logResult.success ? logResult.data.id : ''

      // 3. Sign via Privy
      const signResult = await privyService.signTransaction(
        wallet.privyWalletId,
        order.transaction,
      )
      if (!signResult.success) {
        if (logId) {
          await transactionLogService.updateStatus(
            logId,
            'FAILED' as TransactionStatus,
            'Failed to sign trigger cancel order',
          )
        }
        return signResult
      }

      // 4. Execute
      const executeResult = await jupiterTrigger.execute({
        requestId: order.requestId,
        signedTransaction: signResult.data.signedTransaction,
      })

      if (logId) {
        await transactionLogService.updateStatus(
          logId,
          'CONFIRMED' as TransactionStatus,
          undefined,
          executeResult.signature,
        )
      }

      return ok({ txId: executeResult.signature, logId })
    } catch (error: any) {
      console.error(
        '[Jupiter] Cancel trigger order failed:',
        error?.response || error,
      )
      return err(
        new AppError(
          'Cancel trigger order failed',
          'TRIGGER_CANCEL_FAILED',
          500,
          error,
        ),
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
    console.log('create recurring order', walletId, input, agentId)
    const walletResult = await walletService.getWalletById(walletId)
    if (!walletResult.success) return walletResult

    const wallet = walletResult.data

    try {
      const price = await jupiterPrice.getPrice([
        input.inputMint,
        input.outputMint,
      ])
      input.params.time.inAmount = amountInBaseUnits(
        parseFloat(input.params.time.inAmount.toString()),
        price[input.inputMint].decimals,
      )

      // 1. Create recurring order (unsigned tx)
      const order = await jupiterRecurring.createOrder({
        user: wallet.walletAddress,
        inputMint: input.inputMint,
        outputMint: input.outputMint,
        params: input.params,
      })
      console.log('created order')

      // 2. Log
      const logResult = await transactionLogService.log({
        agentId,
        walletId,
        type: 'RECURRING_ORDER' as TransactionType,
        amountRaw: input.params.time.inAmount.toString(),
        tokenMint: input.inputMint,
        metadata: JSON.stringify({
          outputMint: input.outputMint,
          numberOfOrders: input.params.time.numberOfOrders,
          intervalSeconds: input.params.time.interval,
        }),
      })
      const logId = logResult.success ? logResult.data.id : ''

      // 3. Sign via Privy
      const signResult = await privyService.signTransaction(
        wallet.privyWalletId,
        order.transaction,
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
      const executeResult = await jupiterRecurring.execute({
        signedTransaction: signResult.data.signedTransaction,
        requestId: order.requestId,
      })

      if (logId) {
        await transactionLogService.updateStatus(
          logId,
          'CONFIRMED' as TransactionStatus,
          undefined,
          executeResult.txId,
        )
      }

      return ok({ txId: executeResult.txId, logId })
    } catch (error: any) {
      console.error(
        '[Jupiter] Recurring order failed:',
        error?.response?.data || error?.response || error,
      )
      return err(
        new AppError(
          error?.message || 'Recurring order failed',
          'RECURRING_FAILED',
          500,
          error,
        ),
      )
    }
  },

  /**
   * Cancel a recurring (DCA) order.
   */
  cancelRecurringOrder: async (
    walletId: string,
    orderKey: string,
    agentId: string,
  ): Promise<Result<{ txId: string; logId: string }>> => {
    const walletResult = await walletService.getWalletById(walletId)
    if (!walletResult.success) return walletResult

    const wallet = walletResult.data

    try {
      // 1. Get cancellation transaction
      const order = await jupiterRecurring.cancelOrder(
        wallet.walletAddress,
        orderKey,
      )

      // 2. Log intention
      const logResult = await transactionLogService.log({
        agentId,
        walletId,
        type: 'RECURRING_ORDER' as TransactionType,
        metadata: JSON.stringify({ action: 'cancel', orderKey }),
      })
      const logId = logResult.success ? logResult.data.id : ''

      // 3. Sign via Privy
      const signResult = await privyService.signTransaction(
        wallet.privyWalletId,
        order.transaction,
      )
      if (!signResult.success) {
        if (logId) {
          await transactionLogService.updateStatus(
            logId,
            'FAILED' as TransactionStatus,
            'Failed to sign recurring cancel order',
          )
        }
        return signResult
      }

      // 4. Execute
      const executeResult = await jupiterRecurring.execute({
        signedTransaction: signResult.data.signedTransaction,
        requestId: order.requestId,
      })

      if (logId) {
        await transactionLogService.updateStatus(
          logId,
          'CONFIRMED' as TransactionStatus,
          undefined,
          executeResult.txId,
        )
      }

      return ok({ txId: executeResult.txId, logId })
    } catch (error: any) {
      console.error(
        '[Jupiter] Cancel recurring order failed:',
        error?.response || error,
      )
      console.error('[Jupiter]data:', error?.response?.data || error)

      return err(
        new AppError(
          'Cancel recurring order failed',
          'RECURRING_CANCEL_FAILED',
          500,
          error,
        ),
      )
    }
  },

  /**
   * Get all trigger + recurring orders for a wallet.
   */
  getOrders: async (
    walletAddress: string,
    orderStatus: 'active' | 'history' = 'active',
  ): Promise<
    Result<{
      trigger: TriggerOrder[]
      recurring: RecurringOrder[]
    }>
  > => {
    try {
      const [triggerResult, recurringResult] = await Promise.all([
        jupiterTrigger.getOrders(walletAddress, 1, orderStatus),
        jupiterRecurring.getOrders(walletAddress, 1, orderStatus),
      ])

      return ok({
        trigger: triggerResult.orders,
        recurring: recurringResult.orders,
      })
    } catch (error: any) {
      console.error(
        '[Jupiter] Failed to fetch orders:',
        error?.response || error,
      )
      console?.log('capture error message', error?.response?.data)
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
