import { User } from '@privy-io/node'
import type { Agent } from '../generated/prisma/client'

declare global {
  namespace Express {
    interface Request {
      /** Decoded Privy access token claims — set by privyAuth middleware */
      privyUser?: User
      /** Agent record from DB — set by apiKeyAuth middleware */
      agent?: Agent
    }
  }
}
