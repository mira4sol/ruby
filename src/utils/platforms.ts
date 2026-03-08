import { PrivyClient } from '@privy-io/node'
import { ENV } from './constants/app.constant'

export const privy = new PrivyClient({
  appId: ENV.PRIVY_APP_ID,
  appSecret: ENV.PRIVY_APP_SECRET,
})
