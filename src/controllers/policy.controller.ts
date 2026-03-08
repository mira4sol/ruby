import { NextFunction, Request, Response } from 'express'
import { prismaService } from '../services/prismaService'
import { NotFoundError } from '../types/errors'
import type { UpdatePolicyInput } from '../types/schemas'

export const policyController = {
  /**
   * GET /api/agents/:agentId/wallets/:walletId/policy — Get current policy
   */
  get: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const walletId = req.params.walletId as string
      const wallet = await prismaService.prisma.agentWallet.findUnique({
        where: { id: walletId },
        select: { privyWalletId: true },
      })
      if (!wallet) return next(new NotFoundError('Wallet', walletId))

      const policy = await prismaService.prisma.walletPolicy.findFirst({
        where: { privyWalletId: wallet.privyWalletId },
        select: {
          id: true,
          policyName: true,
          policySnapshot: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      res.status(200).json({
        success: true,
        data: policy
          ? {
              ...policy,
              policySnapshot: JSON.parse(policy.policySnapshot),
            }
          : null,
      })
    } catch (error) {
      next(error)
    }
  },

  /**
   * PUT /api/agents/:agentId/wallets/:walletId/policy — Replace policy
   */
  update: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const walletId = req.params.walletId as string
      const wallet = await prismaService.prisma.agentWallet.findUnique({
        where: { id: walletId },
        select: { privyWalletId: true },
      })
      if (!wallet) return next(new NotFoundError('Wallet', walletId))

      const input = req.body as UpdatePolicyInput
      const policyDef = {
        version: '1.0',
        name: input.name,
        chainType: 'solana',
        rules: input.rules,
      }

      // Check if policy already exists
      const existingPolicy = await prismaService.prisma.walletPolicy.findFirst({
        where: { privyWalletId: wallet.privyWalletId },
        select: { id: true },
      })

      if (existingPolicy) {
        await prismaService.prisma.walletPolicy.update({
          where: { id: existingPolicy.id },
          data: {
            policyName: input.name,
            policySnapshot: JSON.stringify(policyDef),
          },
        })
      } else {
        await prismaService.prisma.walletPolicy.create({
          data: {
            privyPolicyId: `local-${walletId}-${Date.now()}`,
            privyWalletId: wallet.privyWalletId,
            policyName: input.name,
            policySnapshot: JSON.stringify(policyDef),
          },
        })
      }

      res.status(200).json({ success: true, message: 'Policy updated' })
    } catch (error) {
      next(error)
    }
  },

  /**
   * DELETE /api/agents/:agentId/wallets/:walletId/policy — Remove policy (locks wallet)
   */
  delete: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const walletId = req.params.walletId as string
      const wallet = await prismaService.prisma.agentWallet.findUnique({
        where: { id: walletId },
        select: { privyWalletId: true },
      })
      if (!wallet) return next(new NotFoundError('Wallet', walletId))

      await prismaService.prisma.walletPolicy.deleteMany({
        where: { privyWalletId: wallet.privyWalletId },
      })

      res.status(200).json({
        success: true,
        message: 'Policy removed — wallet is now fully locked',
      })
    } catch (error) {
      next(error)
    }
  },
}
