import type { Owner } from '../generated/prisma/client'
import { Result } from '../types/result'
import { privyService } from './privyService'

/**
 * Authentication service — handles owner sync on first login.
 */
export const authService = {
  /**
   * Sync owner from Privy JWT claims.
   * Creates the owner record if it doesn't exist.
   */
  syncOwner: async (privyUserId: string): Promise<Result<Owner>> => {
    return privyService.syncOwner(privyUserId)
  },
}
