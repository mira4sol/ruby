import { NextFunction, Request, Response } from 'express'
import { agentService } from '../services/agentService'
import type { CreateAgentInput } from '../types/schemas'

export const agentController = {
  /**
   * POST /api/agents — Create agent with wallets
   */
  create: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.privyUser) {
        res.status(401).json({ success: false, message: 'Not authenticated' })
        return
      }

      const input = req.body as CreateAgentInput
      const result = await agentService.create(req.privyUser.id, input)
      if (!result.success) return next(result.error)

      res.status(201).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * GET /api/agents — List agents for the authenticated owner
   */
  list: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.privyUser) {
        res.status(401).json({ success: false, message: 'Not authenticated' })
        return
      }

      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const result = await agentService.listByOwner(
        req.privyUser.id,
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
   * GET /api/agents/:agentId — Get single agent
   */
  getById: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.privyUser) {
        res.status(401).json({ success: false, message: 'Not authenticated' })
        return
      }

      const agentId = req.params.agentId as string
      const result = await agentService.getById(agentId, req.privyUser.id)
      if (!result.success) return next(result.error)

      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * DELETE /api/agents/:agentId — Soft delete agent
   */
  delete: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.privyUser) {
        res.status(401).json({ success: false, message: 'Not authenticated' })
        return
      }

      const agentId = req.params.agentId as string
      const result = await agentService.delete(agentId, req.privyUser.id)
      if (!result.success) return next(result.error)

      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },

  /**
   * POST /api/agents/:agentId/regenerate-key — Rotate API key
   */
  regenerateKey: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.privyUser) {
        res.status(401).json({ success: false, message: 'Not authenticated' })
        return
      }

      const agentId = req.params.agentId as string
      const result = await agentService.regenerateApiKey(
        agentId,
        req.privyUser.id,
      )
      if (!result.success) return next(result.error)

      res.status(200).json({ success: true, data: result.data })
    } catch (error) {
      next(error)
    }
  },
}
