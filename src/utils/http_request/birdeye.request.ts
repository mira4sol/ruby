import { birdEyeDefiRequests } from './birdeye/birdeye_defi.request'
import { birdEyeTokensRequests } from './birdeye/birdeye_tokens.request'
import { birdEyeUtilsRequests } from './birdeye/birdeye_utils.request'
import { birdEyeWalletRequests } from './birdeye/birdeye_wallet.request'

export const birdEyeRequests = {
  tokens: birdEyeTokensRequests,
  defi: birdEyeDefiRequests,
  wallet: birdEyeWalletRequests,
  utils: birdEyeUtilsRequests,
}
