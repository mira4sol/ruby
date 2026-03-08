import { NextFunction, Request, Response } from 'express'
import { authService } from '../services/auth.service'

export const authController = {
  /**
   * POST /api/auth/sync
   * Sync owner record from Privy JWT on first login.
   */
  sync: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.privyUser) {
        res.status(401).json({ success: false, message: 'Not authenticated' })
        return
      }

      const result = await authService.syncOwner(req.privyUser.id)
      if (!result.success) return next(result.error)

      res.status(200).json({
        success: true,
        data: {
          id: result.data.id,
          email: result.data.email,
        },
      })
    } catch (error) {
      next(error)
    }
  },
}
