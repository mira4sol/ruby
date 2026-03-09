import { NextFunction, Request, Response } from 'express'
import { jupiterService } from '../services/jupiterService'
import { walletService } from '../services/walletService'
import { RecurringOrderInput, TriggerOrderInput } from '../types/schemas'

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

      const orderStatus =
        (req.query.orderStatus as 'active' | 'history') || 'active'

      const result = await jupiterService.getOrders(
        walletResult.data.walletAddress,
        orderStatus,
      )
      if (!result.success) return next(result.error)

      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/agents/:agentId/wallets/:walletId/orders/trigger/:orderKey/cancel
   */
  cancelTriggerOrder: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const walletId = req.params.walletId as string
      const orderKey = req.params.orderKey as string

      const walletResult = await walletService.getWalletById(walletId)
      if (!walletResult.success) return next(walletResult.error)

      // Get the agentId from the wallet using the populated agent relation,
      // or from req params depending on the route structure.
      const agentId = walletResult.data.agentId

      const result = await jupiterService.cancelTriggerOrder(
        walletResult.data.id,
        orderKey,
        agentId,
      )
      if (!result.success) return next(result.error)

      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/agents/:agentId/wallets/:walletId/orders/recurring/:orderKey/cancel
   */
  cancelRecurringOrder: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const walletId = req.params.walletId as string
      const orderKey = req.params.orderKey as string

      const walletResult = await walletService.getWalletById(walletId)
      if (!walletResult.success) return next(walletResult.error)

      const agentId = walletResult.data.agentId

      const result = await jupiterService.cancelRecurringOrder(
        walletResult.data.id,
        orderKey,
        agentId,
      )
      if (!result.success) return next(result.error)

      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/agents/:agentId/wallets/:walletId/orders/trigger
   */
  createTriggerOrder: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const agentId = req.params.agentId as string
      const walletId = req.params.walletId as string
      const input = req.body as TriggerOrderInput

      const result = await jupiterService.createTriggerOrder(
        walletId,
        input,
        agentId,
      )
      if (!result.success) return next(result.error)

      res.status(201).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/agents/:agentId/wallets/:walletId/orders/recurring
   */
  createRecurringOrder: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const agentId = req.params.agentId as string
      const walletId = req.params.walletId as string
      const input = req.body as RecurringOrderInput

      const result = await jupiterService.createRecurringOrder(
        walletId,
        input,
        agentId,
      )
      if (!result.success) return next(result.error)

      res.status(201).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },
}
