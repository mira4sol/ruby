import {
  BirdEyeHistoricalPriceResponse,
  BirdEyeMultiplePrice,
  BirdEyeTimePeriod,
  BirdEyeTokenOHLCV,
  BirdEyeTokenPrice,
} from '@/types/birdeye.interface'
import { apiResponse } from '@/utils/api.helpers'
import { birdEyeHeader } from '@/utils/birdeye.util'
import { NATIVE_SOL_MINT, WRAPPED_SOL_MINT } from '@/utils/solana.util'
import axios, { AxiosInstance } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: 'https://public-api.birdeye.so/defi',
  headers: birdEyeHeader,
})

export const birdEyeDefiRequests = {
  /**
   *
   * @description Retrieve the latest price information for multiple tokens. Maximum 100 tokens
   */
  getMultiPrice: async (list_address: string | string[]) => {
    try {
      // Convert to array for easier manipulation
      let addressArray: string[]
      if (typeof list_address === 'string') {
        addressArray = list_address.split(',').map((addr) => addr.trim())
      } else {
        addressArray = [...list_address]
      }

      // Check if native SOL mint is present and replace with wrapped SOL
      const hasNativeSol = addressArray.includes(NATIVE_SOL_MINT)
      if (hasNativeSol) {
        const nativeIndex = addressArray.indexOf(NATIVE_SOL_MINT)
        addressArray[nativeIndex] = WRAPPED_SOL_MINT
      }

      // Convert back to comma-separated string for API
      const processedAddressList = addressArray.join(',')

      const res = await api.get(`/multi_price`, {
        params: {
          include_liquidity: true,
          list_address: processedAddressList,
        },
      })

      let responseData = res.data.data

      // If we replaced native SOL with wrapped SOL, map the response back
      if (hasNativeSol && responseData[WRAPPED_SOL_MINT]) {
        responseData[NATIVE_SOL_MINT] = responseData[WRAPPED_SOL_MINT]
        delete responseData[WRAPPED_SOL_MINT]
      }

      return apiResponse<BirdEyeMultiplePrice>(
        true,
        'Fetched search results',
        responseData,
      )
    } catch (err: any) {
      console.log('Error fetching token report:', err?.response?.data)
      return apiResponse<BirdEyeMultiplePrice>(
        false,
        err?.response?.data?.message || err?.message || 'Error occurred.',
        undefined,
      )
    }
  },

  /**
   *
   * @description Retrieve historical price line chart of a specified token.
   */
  historicalPrice: async ({
    tokenAddress,
    type = '1H',
    time_from,
    time_to,
    address_type = 'token',
  }: {
    tokenAddress: string
    type: BirdEyeTimePeriod
    time_from: number
    time_to: number
    address_type: 'token' | 'pair'
  }) => {
    try {
      const addressToUse =
        tokenAddress === NATIVE_SOL_MINT ? WRAPPED_SOL_MINT : tokenAddress

      const res = await api.get(`/history_price`, {
        params: {
          address: addressToUse,
          type,
          time_from,
          time_to,
          address_type,
        },
      })

      return apiResponse<BirdEyeHistoricalPriceResponse>(
        true,
        'Fetched token historical price data',
        res.data.data,
      )
    } catch (err: any) {
      console.log('Error fetching token historical price:', err?.response?.data)
      return apiResponse<BirdEyeHistoricalPriceResponse>(
        false,
        err?.response?.data?.message || err?.message || 'Error occurred.',
        undefined,
      )
    }
  },

  /**
   *
   * @description Retrieve candlestick data in OHLCV format of a specified token. Maximum 1000 records.
   */
  tokenOHLCV: async ({
    tokenAddress,
    type = '1m',
    currency = 'usd',
    time_from,
    time_to,
  }: {
    tokenAddress: string
    type: BirdEyeTimePeriod
    currency: 'usd' | 'native'
    time_from: number
    time_to: number
  }) => {
    try {
      const addressToUse =
        tokenAddress === NATIVE_SOL_MINT ? WRAPPED_SOL_MINT : tokenAddress

      const res = await api.get(`/ohlcv`, {
        params: {
          address: addressToUse,
          type,
          currency,
          time_from,
          time_to,
        },
      })

      return apiResponse<BirdEyeTokenOHLCV>(
        true,
        'Fetched token OHLCV data',
        res.data.data,
      )
    } catch (err: any) {
      console.log('Error fetching token OHLCV:', err?.response?.data)
      return apiResponse<BirdEyeTokenOHLCV>(
        false,
        err?.response?.data?.message || err?.message || 'Error occurred.',
        undefined,
      )
    }
  },

  /**
   * @description Retrieve Token Price
   * @param token_address
   */
  /**
   * @description Retrieve Token Price
   * @param token_address
   */
  tokenPrice: async (token_address: string) => {
    try {
      const res = await api.get(`/price`, {
        params: {
          address: token_address,
        },
      })

      return apiResponse<BirdEyeTokenPrice>(
        true,
        'Fetched token price data',
        res.data.data,
      )
    } catch (err: any) {
      console.log('Error fetching token price:', err?.response?.data)
      return apiResponse<BirdEyeTokenPrice>(
        false,
        err?.response?.data?.message || err?.message || 'Error occurred.',
        undefined,
      )
    }
  },
}
