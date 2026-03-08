import { NextFunction, Request, Response } from 'express'
import { WalletPurpose } from '../generated/prisma/client'
import { jupiterService } from '../services/jupiterService'
import { walletService } from '../services/walletService'
import type {
  CreateWalletInput,
  SendSOLInput,
  SendSPLInput,
  SwapInput,
} from '../types/schemas'

export const walletController = {
  /**
   * POST /api/agents/:agentId/wallets — Create wallet
   */
  create: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const agentId = req.params.agentId as string
      const input = req.body as CreateWalletInput
      const result = await walletService.createWalletForAgent(
        agentId,
        input.purpose as WalletPurpose,
        input.label,
      )
      if (!result.success) return next(result.error)
      res.status(201).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/agents/:agentId/wallets — List wallets
   */
  list: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const agentId = req.params.agentId as string
      const result = await walletService.listWallets(agentId)
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/agents/:agentId/wallets/:walletId/balance — Balance
   */
  getBalance: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const walletId = req.params.walletId as string
      const walletResult = await walletService.getWalletById(walletId)
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
   * GET /api/agents/:agentId/wallets/:walletId/transactions — History
   */
  getTransactionHistory: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const walletId = req.params.walletId as string
      const walletResult = await walletService.getWalletById(walletId)
      if (!walletResult.success) return next(walletResult.error)

      const result = await walletService.getTransactionHistory(
        walletResult.data.walletAddress,
      )
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * DELETE /api/agents/:agentId/wallets/:walletId — Delete wallet
   */
  delete: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const walletId = req.params.walletId as string
      const result = await walletService.deleteWallet(walletId)
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/agents/:agentId/wallets/:walletId/send — Send SOL
   */
  sendSOL: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const agentId = req.params.agentId as string
      const walletId = req.params.walletId as string
      const input = req.body as SendSOLInput
      const result = await walletService.sendSOL(
        walletId,
        input.toAddress,
        input.amount,
        agentId,
      )
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/agents/:agentId/wallets/:walletId/send-spl — Send SPL token
   */
  sendSPL: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const agentId = req.params.agentId as string
      const walletId = req.params.walletId as string
      const input = req.body as SendSPLInput
      const result = await walletService.sendSPL(
        walletId,
        input.mint,
        input.toAddress,
        input.amount,
        agentId,
      )
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/agents/:agentId/wallets/:walletId/swap — Jupiter swap
   */
  swap: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const agentId = req.params.agentId as string
      const walletId = req.params.walletId as string
      const input = req.body as SwapInput
      const result = await jupiterService.swap(walletId, input, agentId)
      if (!result.success) return next(result.error)
      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },
}
