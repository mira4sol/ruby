import { NextFunction, Request, Response } from 'express'
import { jupiterService } from '../services/jupiterService'
import { walletService } from '../services/walletService'

export const jupiterController = {
  /**
   * GET /api/agents/:agentId/wallets/:walletId/orders — Get Jupiter orders
   */
  getOrders: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const walletId = req.params.walletId as string

      const walletResult = await walletService.getWalletById(walletId)
      if (!walletResult.success) return next(walletResult.error)

      const result = await jupiterService.getOrders(
        walletResult.data.walletAddress,
      )
      if (!result.success) return next(result.error)

      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },
}
