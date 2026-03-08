import { BirdEyeTimePeriod } from '../types/birdeye.interface'
import { env } from './env'
import { birdEyeRequests } from './http_request/birdeye.request'

export const birdEyeHeader = {
  accept: 'application/json',
  'x-chain': 'solana',
  'X-API-KEY': env.BIRDEYE_API_KEY,
}

export const getBirdeyeTimeParams = (
  timeframe: BirdEyeTimePeriod,
): { type: BirdEyeTimePeriod; time_from: number; time_to: number } => {
  const now = Math.floor(Date.now() / 1000)
  let type: BirdEyeTimePeriod = '15m'
  let time_from = now - 60 * 60

  switch (timeframe) {
    case '1H':
      type = '15m'
      time_from = now - 60 * 60 * 24
      break
    case '1D':
      type = '15m'
      time_from = now - 24 * 7 * 60 * 60
      break
    case '1W':
      type = '4H'
      time_from = now - 7 * 4 * 60 * 60 * 24
      break
    case '1M':
      type = '1D'
      time_from = now - 30 * 24 * 60 * 60
      break
    case '1Y':
      type = '1Y'
      time_from = now - 365 * 24 * 60 * 60
      break
    default:
      type = '15m'
      time_from = now - 60 * 60
      break
  }
  return { type, time_from, time_to: now }
}

/**
 * BirdEye facade — re-exports the organized HTTP request modules.
 * Existing modules in http_request/birdeye/ handle the actual API calls.
 */
export const birdeye = {
  tokens: birdEyeRequests.tokens,
  defi: birdEyeRequests.defi,
  wallet: birdEyeRequests.wallet,
  utils: birdEyeRequests.utils,
}
