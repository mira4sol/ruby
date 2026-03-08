import { BirdEyeSearchResponse } from '@/types/birdeye.interface'
import { apiResponse } from '@/utils/api.helpers'
import { birdEyeHeader } from '@/utils/birdeye.util'
import axios, { AxiosInstance } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: 'https://public-api.birdeye.so/defi/v3',
  headers: birdEyeHeader,
})

export const birdEyeUtilsRequests = {
  search: async ({
    keyword,
    target = 'token',
    search_mode = 'fuzzy',
    search_by = 'combination',
    sort_by = 'volume_24h_usd',
    sort_type = 'desc',
    offset = 0,
    limit = 20,
  }: {
    keyword: string
    target?: 'token' | 'market'
    search_mode?: 'fuzzy' | 'exact' | 'all'
    search_by?: 'combination' | 'name' | 'symbol' | 'address'
    sort_by?: 'volume_24h_usd' | 'liquidity_usd' | 'price_change_24h'
    sort_type?: 'desc' | 'asc'
    offset?: number
    limit?: number
  }) => {
    try {
      const res = await api.get(`/search`, {
        params: {
          chain: 'solana',
          keyword,
          target,
          search_mode,
          search_by,
          sort_by,
          sort_type,
          offset,
          limit,
        },
      })

      return apiResponse<BirdEyeSearchResponse>(
        true,
        'Fetched search results',
        res.data.data,
      )
    } catch (err: any) {
      console.log('Error fetching token report:', err?.response?.data)
      return apiResponse<BirdEyeSearchResponse>(
        false,
        err?.response?.data?.message || err?.message || 'Error occurred.',
        undefined,
      )
    }
  },
}
