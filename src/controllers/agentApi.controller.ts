import { NextFunction, Request, Response } from 'express'
import { jupiterService } from '../services/jupiterService'
import { transactionLogService } from '../services/transactionLogService'
import { walletService } from '../services/walletService'
import type {
  CreateWalletInput,
  RecurringOrderInput,
  SendSOLInput,
  SendSPLInput,
  SwapInput,
  TriggerOrderInput,
} from '../types/schemas'

/**
 * Agent-facing API controller.
 * All routes use apiKeyAuth middleware — agent is on req.agent.
 */
export const agentApiController = {
  /**
   * POST /agent/wallets
   */
  createWallet: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const input = req.body as CreateWalletInput
      const result = await walletService.createWalletForAgent(
        req.agent!.id,
        input.purpose,
        input.label,
      )
      if (!result.success) return next(result.error)
      res.status(201).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /agent/wallets — List all wallets for this agent
   */
  listWallets: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await walletService.listWallets(req.agent!.id)
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /agent/tokens/:address/overview
   */
  getTokenOverview: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const address = req.params.address as string
      if (!address) {
        res.status(400).json({ success: false, message: 'Address is required' })
        return
      }

      const result = await walletService.getTokenOverview(address)
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /agent/tokens/trending
   */
  getTrendingTokens: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const sort_by = req.query.sort_by as
        | 'rank'
        | 'volume24hUSD'
        | 'liquidity'
        | undefined
      const sort_type = req.query.sort_type as 'asc' | 'desc' | undefined
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : undefined
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined

      const result = await walletService.getTrendingTokens({
        sort_by,
        sort_type,
        offset,
        limit,
      })
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /agent/wallets/:label/balance — Get balance
   */
  getBalance: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const label = req.params.label as string
      const walletResult = await walletService.getWalletByLabel(
        req.agent!.id,
        label,
      )
      if (!walletResult.success) return next(walletResult.error)

      const result = await walletService.getBalance(
        walletResult.data.walletAddress,
      )
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /agent/wallets/:label/send — Send native SOL
   */
  sendSOL: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const label = req.params.label as string
      const input = req.body as SendSOLInput
      const walletResult = await walletService.getWalletByLabel(
        req.agent!.id,
        label,
      )
      if (!walletResult.success) return next(walletResult.error)

      const result = await walletService.sendSOL(
        walletResult.data.id,
        input.toAddress,
        input.amount,
        req.agent!.id,
      )
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /agent/wallets/:label/send-spl — Send SPL token
   */
  sendSPL: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const label = req.params.label as string
      const input = req.body as SendSPLInput
      const walletResult = await walletService.getWalletByLabel(
        req.agent!.id,
        label,
      )
      if (!walletResult.success) return next(walletResult.error)

      const result = await walletService.sendSPL(
        walletResult.data.id,
        input.mint,
        input.toAddress,
        input.amount,
        req.agent!.id,
      )
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /agent/wallets/:label/swap — Swap via Jupiter Ultra
   */
  swap: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const label = req.params.label as string
      const input = req.body as SwapInput
      const walletResult = await walletService.getWalletByLabel(
        req.agent!.id,
        label,
      )
      if (!walletResult.success) return next(walletResult.error)

      const result = await jupiterService.swap(
        walletResult.data.id,
        input,
        req.agent!.id,
      )
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /agent/wallets/:label/trigger — Create limit order
   */
  createTriggerOrder: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const label = req.params.label as string
      const input = req.body as TriggerOrderInput
      const walletResult = await walletService.getWalletByLabel(
        req.agent!.id,
        label,
      )
      if (!walletResult.success) return next(walletResult.error)

      const result = await jupiterService.createTriggerOrder(
        walletResult.data.id,
        input,
        req.agent!.id,
      )
      if (!result.success) return next(result.error)
      res.status(201).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /agent/wallets/:label/recurring — Create DCA order
   */
  createRecurringOrder: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const label = req.params.label as string
      const input = req.body as RecurringOrderInput
      const walletResult = await walletService.getWalletByLabel(
        req.agent!.id,
        label,
      )
      if (!walletResult.success) return next(walletResult.error)

      const result = await jupiterService.createRecurringOrder(
        walletResult.data.id,
        input,
        req.agent!.id,
      )
      if (!result.success) return next(result.error)
      res.status(201).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /agent/wallets/:label/history — Transaction history
   */
  getHistory: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const label = req.params.label as string
      const walletResult = await walletService.getWalletByLabel(
        req.agent!.id,
        label,
      )
      if (!walletResult.success) return next(walletResult.error)

      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20

      const result = await transactionLogService.getHistory(
        req.agent!.id,
        walletResult.data.id,
        page,
        limit,
      )
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /agent/wallets/:label/orders — List trigger + recurring orders
   */
  getOrders: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const label = req.params.label as string
      const walletResult = await walletService.getWalletByLabel(
        req.agent!.id,
        label,
      )
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
   * POST /agent/wallets/:label/trigger/:orderKey/cancel — Cancel trigger order
   */
  cancelTriggerOrder: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const label = req.params.label as string
      const orderKey = req.params.orderKey as string

      const walletResult = await walletService.getWalletByLabel(
        req.agent!.id,
        label,
      )
      if (!walletResult.success) return next(walletResult.error)

      const result = await jupiterService.cancelTriggerOrder(
        walletResult.data.id,
        orderKey,
        req.agent!.id,
      )
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /agent/wallets/:label/recurring/:orderKey/cancel — Cancel recurring order
   */
  cancelRecurringOrder: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const label = req.params.label as string
      const orderKey = req.params.orderKey as string

      const walletResult = await walletService.getWalletByLabel(
        req.agent!.id,
        label,
      )
      if (!walletResult.success) return next(walletResult.error)

      const result = await jupiterService.cancelRecurringOrder(
        walletResult.data.id,
        orderKey,
        req.agent!.id,
      )
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },
}
