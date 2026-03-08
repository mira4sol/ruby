import {
  JupiterExecuteOrderResponse,
  JupiterOrderRequest,
  JupiterQuoteOrderResponse,
} from '@/types'
import { Keypair, VersionedTransaction } from '@solana/web3.js'
import axios, { AxiosInstance } from 'axios'
import { apiResponse } from '../api.helpers'

const api: AxiosInstance = axios.create({
  baseURL: 'https://lite-api.jup.ag/ultra/v1',
})

export const jupiterRequests = {
  getOrder: async (params: JupiterOrderRequest) => {
    try {
      const res = await api.get<JupiterQuoteOrderResponse>('/order', {
        params: {
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          amount: params.amount,
          taker: params.taker,
          referralAccount: params.referralAccount,
          referralFee: params.referralFee,
        },
      })

      return apiResponse(true, 'Fetched Jupiter order quote', res.data)
    } catch (err: any) {
      console.log('Error fetching Jupiter order quote:', err?.response?.data)
      return apiResponse(
        false,
        err?.response?.data?.message || err?.message || 'Error occurred.',
        err,
      )
    }
  },

  executeOrder: async (
    orderResponse: JupiterQuoteOrderResponse,
    wallet: Keypair,
  ) => {
    try {
      // Deserialize the transaction
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(orderResponse.transaction, 'base64'),
      )

      // Sign the transaction
      transaction.sign([wallet])

      // Serialize the transaction to base64 format
      const signedTransaction = Buffer.from(transaction.serialize()).toString(
        'base64',
      )

      const res = await api.post<JupiterExecuteOrderResponse>('/execute', {
        signedTransaction,
        requestId: orderResponse.requestId,
      })

      return apiResponse(true, 'Order executed successfully', res.data)
    } catch (err: any) {
      console.log('Error executing Jupiter order:', err?.response?.data)
      return apiResponse(
        false,
        err?.response?.data?.message || err?.message || 'Error occurred.',
        err,
      )
    }
  },
}
