import axios, { AxiosInstance } from 'axios'
import type {
  JupiterExecuteOrderResponse,
  JupiterOrderRequest,
  JupiterQuoteOrderResponse,
} from '../types/jupiter.interface'
import { env } from './env'

// ─────────────────────────────────────
// Jupiter API Client
// ─────────────────────────────────────

const BASE_URL = 'https://api.jup.ag'

const createJupiterApi = (): AxiosInstance => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (env.JUPITER_API_KEY) {
    headers['x-api-key'] = env.JUPITER_API_KEY
  }
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
          referralAccount: params.referralAccount,
          referralFee: params.referralFee,
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
  orderId: string
  maker: string
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  expiredAt: string | null
  status: string
  createdAt: string
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
  ): Promise<{ orders: TriggerOrder[]; total: number }> => {
    return withRetry(async () => {
      const res = await api.get<{ orders: TriggerOrder[]; total: number }>(
        '/trigger/v1/getTriggerOrders',
        { params: { wallet, page } },
      )
      return res.data
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
  orderId: string
  maker: string
  inputMint: string
  outputMint: string
  inAmount: string
  remainingAmount: string
  numberOfOrders: number
  completedOrders: number
  interval: number
  status: string
  createdAt: string
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
  ): Promise<{ orders: RecurringOrder[]; total: number }> => {
    return withRetry(async () => {
      const res = await api.get<{ orders: RecurringOrder[]; total: number }>(
        '/recurring/v1/getRecurringOrders',
        { params: { wallet, page } },
      )
      return res.data
    })
  },
}
