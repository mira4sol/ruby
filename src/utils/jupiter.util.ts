import axios, { AxiosInstance } from 'axios'
import type {
  JupiterExecuteOrderResponse,
  JupiterOrderRequest,
  JupiterPriceResponse,
  JupiterQuoteOrderResponse,
} from '../types/jupiter.interface'

// ─────────────────────────────────────
// Jupiter API Client
// ─────────────────────────────────────

const BASE_URL = 'https://lite-api.jup.ag'
// const BASE_URL = 'https://api.jup.ag'

const createJupiterApi = (): AxiosInstance => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  // if (env.JUPITER_API_KEY) {
  // headers['x-api-key'] = env.JUPITER_API_KEY
  // }
  return axios.create({ baseURL: BASE_URL, headers })
}

const api = createJupiterApi()

/**
 * Retry helper with exponential backoff for rate limits.
 */
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const isAxiosError = axios.isAxiosError(error)
      if (
        isAxiosError &&
        error.response?.status === 429 &&
        attempt < maxRetries
      ) {
        const jitter = Math.random() * 500
        const delay = Math.min(baseDelay * 2 ** attempt + jitter, 30000)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

// ─────────────────────────────────────
// Ultra Swap
// ─────────────────────────────────────

export const jupiterUltra = {
  /**
   * Get an order (quote + unsigned transaction).
   */
  getOrder: async (
    params: JupiterOrderRequest,
  ): Promise<JupiterQuoteOrderResponse> => {
    return withRetry(async () => {
      const res = await api.get<JupiterQuoteOrderResponse>('/ultra/v1/order', {
        params: {
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          amount: params.amount,
          taker: params.taker,
          // referralAccount: params.referralAccount,
          // referralFee: params.referralFee,
        },
      })
      return res.data
    })
  },

  /**
   * Execute a signed order.
   */
  execute: async (
    signedTransaction: string,
    requestId: string,
  ): Promise<JupiterExecuteOrderResponse> => {
    return withRetry(async () => {
      const res = await api.post<JupiterExecuteOrderResponse>(
        '/ultra/v1/execute',
        { signedTransaction, requestId },
      )
      return res.data
    })
  },
}

// ─────────────────────────────────────
// Trigger (Limit Orders)
// ─────────────────────────────────────

export interface TriggerCreateOrderParams {
  inputMint: string
  outputMint: string
  maker: string
  payer: string
  inAmount: string
  outAmount: string
  expiredAt?: string
}

export interface TriggerOrderResponse {
  order: string // base64 unsigned tx
}

export interface TriggerOrder {
  userPubkey: string
  orderKey: string
  inputMint: string
  outputMint: string
  makingAmount: string
  takingAmount: string
  remainingMakingAmount: string
  remainingTakingAmount: string
  rawMakingAmount: string
  rawTakingAmount: string
  rawRemainingMakingAmount: string
  rawRemainingTakingAmount: string
  slippageBps: string
  expiredAt: string | null
  createdAt: string
  updatedAt: string
  status: string
  openTx: string
  closeTx: string | null
  programVersion: string
  trades: any[]
}

export const jupiterTrigger = {
  /**
   * Create a trigger (limit) order.
   * Returns an unsigned transaction to be signed.
   */
  createOrder: async (
    params: TriggerCreateOrderParams,
  ): Promise<TriggerOrderResponse> => {
    return withRetry(async () => {
      const res = await api.post<TriggerOrderResponse>(
        '/trigger/v1/createOrder',
        params,
      )
      return res.data
    })
  },

  /**
   * Cancel a trigger order.
   */
  cancelOrder: async (
    maker: string,
    orderId: string,
  ): Promise<{ order: string }> => {
    return withRetry(async () => {
      const res = await api.post<{ order: string }>('/trigger/v1/cancelOrder', {
        maker,
        orderId,
      })
      return res.data
    })
  },

  /**
   * Execute a signed trigger order transaction.
   */
  execute: async (signedTransaction: string): Promise<{ txId: string }> => {
    return withRetry(async () => {
      const res = await api.post<{ txId: string }>('/trigger/v1/execute', {
        signedTransaction,
      })
      return res.data
    })
  },

  /**
   * Get trigger orders for a wallet.
   */
  getOrders: async (
    wallet: string,
    page = 1,
    orderStatus: 'active' | 'history' = 'active',
  ): Promise<{ orders: TriggerOrder[]; totalPages: number }> => {
    return withRetry(async () => {
      const res = await api.get<{ orders: TriggerOrder[]; totalPages: number }>(
        '/trigger/v1/getTriggerOrders',
        { params: { user: wallet, page, orderStatus, includeFailedTx: false } },
      )
      return { orders: res.data.orders, totalPages: res.data.totalPages }
    })
  },
}

// ─────────────────────────────────────
// Recurring (DCA)
// ─────────────────────────────────────

export interface RecurringCreateOrderParams {
  inputMint: string
  outputMint: string
  maker: string
  payer: string
  inAmount: string
  params: {
    time: {
      numberOfOrders: number
      interval: number // seconds
    }
  }
}

export interface RecurringOrder {
  userPubkey: string
  orderKey: string
  inputMint: string
  outputMint: string
  inDeposited: string
  inWithdrawn: string
  rawInDeposited: string
  rawInWithdrawn: string
  cycleFrequency: number
  outWithdrawn: string
  inAmountPerCycle: string
  minOutAmount: string
  maxOutAmount: string
  inUsed: string
  outReceived: string
  rawOutWithdrawn: string
  rawInAmountPerCycle: string
  rawMinOutAmount: string
  rawMaxOutAmount: string
  rawInUsed: string
  rawOutReceived: string
  openTx: string
  closeTx: string | null
  userClosed: boolean
  createdAt: string
  updatedAt: string
  trades: Array<{
    orderKey: string
    keeper: string
    inputMint: string
    outputMint: string
    inputAmount: string
    outputAmount: string
    rawInputAmount: string
    rawOutputAmount: string
    feeMint: string
    feeAmount: string
    rawFeeAmount: string
    txId: string
    confirmedAt: string
    action: string
    productMeta: any | null
  }>
}

export const jupiterRecurring = {
  /**
   * Create a recurring (DCA) order.
   * Returns an unsigned transaction to be signed.
   */
  createOrder: async (
    params: RecurringCreateOrderParams,
  ): Promise<{ order: string }> => {
    return withRetry(async () => {
      const res = await api.post<{ order: string }>(
        '/recurring/v1/createOrder',
        params,
      )
      return res.data
    })
  },

  /**
   * Cancel a recurring order.
   */
  cancelOrder: async (
    maker: string,
    orderId: string,
  ): Promise<{ order: string }> => {
    return withRetry(async () => {
      const res = await api.post<{ order: string }>(
        '/recurring/v1/cancelOrder',
        { maker, orderId },
      )
      return res.data
    })
  },

  /**
   * Execute a signed recurring order transaction.
   */
  execute: async (signedTransaction: string): Promise<{ txId: string }> => {
    return withRetry(async () => {
      const res = await api.post<{ txId: string }>('/recurring/v1/execute', {
        signedTransaction,
      })
      return res.data
    })
  },

  /**
   * Get recurring orders for a wallet.
   */
  getOrders: async (
    wallet: string,
    page = 1,
    orderStatus: 'active' | 'history' = 'active',
  ): Promise<{ orders: RecurringOrder[]; totalPages: number }> => {
    return withRetry(async () => {
      const res = await api.get<{ time: RecurringOrder[]; totalPages: number }>(
        '/recurring/v1/getRecurringOrders',
        {
          params: {
            user: wallet,
            page,
            recurringType: 'time',
            orderStatus,
            mint: null,
            includeFailedTx: false,
          },
        },
      )
      return { orders: res.data.time, totalPages: res.data.totalPages }
    })
  },
}

// ─────────────────────────────────────
// Price (v3)
// ─────────────────────────────────────

export const jupiterPrice = {
  /**
   * Get price for token mints.
   * @param ids - A single token mint address or an array of them.
   */
  getPrice: async (ids: string | string[]): Promise<JupiterPriceResponse> => {
    return withRetry(async () => {
      const idsStr = Array.isArray(ids) ? ids.join(',') : ids
      const res = await api.get<JupiterPriceResponse>('/price/v3', {
        params: { ids: idsStr },
      })
      return res.data
    })
  },
}
