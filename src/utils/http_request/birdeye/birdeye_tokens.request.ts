import {
  BirdEyeTokenOverview,
  BirdEyeTrendingTokens,
} from '@/types/birdeye.interface'
import { birdEyeHeader } from '@/utils/birdeye.util'
import axios, { AxiosInstance } from 'axios'
import { apiResponse } from '@/utils/api.helpers'
import { NATIVE_SOL_MINT, WRAPPED_SOL_MINT } from '@/utils/solana.util'

const api: AxiosInstance = axios.create({
  baseURL: 'https://public-api.birdeye.so/defi',
  headers: birdEyeHeader,
})

export const birdEyeTokensRequests = {
  tokenOverview: async (tokenAddress: string) => {
    try {
      const addressToUse =
        tokenAddress === NATIVE_SOL_MINT ? WRAPPED_SOL_MINT : tokenAddress

      const res = await api.get(`/token_overview`, {
        params: {
          address: addressToUse,
        },
      })

      if (tokenAddress === NATIVE_SOL_MINT) {
        res.data.data.address = NATIVE_SOL_MINT
        res.data.data.name = 'SOL'
        res.data.data.symbol = 'SOL'
      }

      return apiResponse<BirdEyeTokenOverview>(
        true,
        'Fetched token overview',
        res.data.data,
      )
    } catch (err: any) {
      console.log('Error fetching token overview:', err?.response?.data)
      return apiResponse<BirdEyeTokenOverview>(
        false,
        err?.response?.data?.message || err?.message || 'Error occurred.',
        undefined,
      )
    }
  },

  /**
   * @description Retrieve a dynamic and up-to-date list of trending tokens based on specified sorting criteria.
   * @param sort_by - The field to sort by.
   * @param sort_type - The direction to sort.
   * @param offset - The offset of the first item to return.
   * @param limit - The number of items to return.
   */
  trendingTokens: async ({
    sort_by = 'rank',
    sort_type = 'asc',
    offset = 0,
    limit = 20,
  }: {
    sort_by?: 'rank' | 'volume24hUSD' | 'liquidity'
    sort_type?: 'asc' | 'desc'
    offset?: number
    limit?: number
  }) => {
    try {
      const res = await api.get(`/token_trending`, {
        params: {
          sort_by,
          sort_type,
          offset,
          limit,
        },
      })

      return apiResponse<BirdEyeTrendingTokens>(
        true,
        'Fetched trending tokens',
        res.data.data,
      )
    } catch (err: any) {
      console.log('Error fetching token overview:', err?.response?.data)
      return apiResponse<BirdEyeTrendingTokens>(
        false,
        err?.response?.data?.message || err?.message || 'Error occurred.',
        undefined,
      )
    }
  },
}
