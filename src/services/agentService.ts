import { WalletPurpose } from '../generated/prisma/client'
import { NotFoundError } from '../types/errors'
import { Result, err, ok } from '../types/result'
import type { CreateAgentInput } from '../types/schemas'
import { generateApiKey, hashApiKey } from '../utils/apiKeys'
import { prismaService } from './prismaService'
import { walletService } from './walletService'

/**
 * Agent CRUD and lifecycle management.
 */
export const agentService = {
  /**
   * Create an agent with wallets. Returns the raw API key ONCE.
   */
  create: async (
    ownerId: string,
    input: CreateAgentInput,
  ): Promise<
    Result<{
      id: string
      name: string
      apiKey: string
      wallets: Array<{
        id: string
        walletAddress: string
        purpose: WalletPurpose
        label: string
      }>
    }>
  > => {
    const rawApiKey = generateApiKey()
    const apiKeyHash = hashApiKey(rawApiKey)

    // Create agent record
    const agent = await prismaService.prisma.agent.create({
      data: {
        ownerId,
        name: input.name,
        apiKeyHash,
      },
      select: { id: true, name: true },
    })

    // Create wallets for each requested purpose
    const wallets: Array<{
      id: string
      walletAddress: string
      purpose: WalletPurpose
      label: string
    }> = []

    for (const purpose of input.wallets) {
      const walletResult = await walletService.createWalletForAgent(
        agent.id,
        purpose as WalletPurpose,
      )
      if (walletResult.success) {
        wallets.push(walletResult.data)
      }
    }

    // Set first wallet as default if any were created
    if (wallets.length > 0) {
      await walletService.setDefaultWallet(agent.id, wallets[0].id)
    }

    return ok({
      id: agent.id,
      name: agent.name,
      apiKey: rawApiKey, // Returned ONCE — never stored
      wallets,
    })
  },

  /**
   * List all active agents for an owner.
   */
  listByOwner: async (
    ownerId: string,
    page = 1,
    limit = 20,
  ): Promise<
    Result<{
      agents: Array<{
        id: string
        name: string
        isActive: boolean
        createdAt: Date
        _count: { wallets: number }
      }>
      total: number
    }>
  > => {
    const where = { ownerId, deletedAt: null }

    const [agents, total] = await Promise.all([
      prismaService.prisma.agent.findMany({
        where,
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
          _count: { select: { wallets: true } },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
      }),
      prismaService.prisma.agent.count({ where }),
    ])

    return ok({ agents, total })
  },

  /**
   * Get a single agent with its wallets.
   */
  getById: async (
    agentId: string,
    ownerId: string,
  ): Promise<
    Result<{
      id: string
      name: string
      isActive: boolean
      createdAt: Date
      wallets: Array<{
        id: string
        walletAddress: string
        label: string
        purpose: WalletPurpose
        isDefault: boolean
      }>
    }>
  > => {
    const agent = await prismaService.prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        isActive: true,
        ownerId: true,
        createdAt: true,
        wallets: {
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            walletAddress: true,
            label: true,
            purpose: true,
            isDefault: true,
          },
        },
      },
    })

    if (!agent || agent.ownerId !== ownerId) {
      return err(new NotFoundError('Agent', agentId))
    }

    return ok({
      id: agent.id,
      name: agent.name,
      isActive: agent.isActive,
      createdAt: agent.createdAt,
      wallets: agent.wallets,
    })
  },

  /**
   * Soft delete an agent.
   */
  delete: async (
    agentId: string,
    ownerId: string,
  ): Promise<Result<{ deleted: boolean }>> => {
    const agent = await prismaService.prisma.agent.findUnique({
      where: { id: agentId },
      select: { ownerId: true },
    })

    if (!agent || agent.ownerId !== ownerId) {
      return err(new NotFoundError('Agent', agentId))
    }

    await prismaService.prisma.agent.update({
      where: { id: agentId },
      data: { isActive: false, deletedAt: new Date() },
    })

    return ok({ deleted: true })
  },

  /**
   * Regenerate API key for an agent. Returns the new raw key ONCE.
   */
  regenerateApiKey: async (
    agentId: string,
    ownerId: string,
  ): Promise<Result<{ apiKey: string }>> => {
    const agent = await prismaService.prisma.agent.findUnique({
      where: { id: agentId },
      select: { ownerId: true },
    })

    if (!agent || agent.ownerId !== ownerId) {
      return err(new NotFoundError('Agent', agentId))
    }

    const rawApiKey = generateApiKey()
    const apiKeyHash = hashApiKey(rawApiKey)

    await prismaService.prisma.agent.update({
      where: { id: agentId },
      data: { apiKeyHash },
    })

    return ok({ apiKey: rawApiKey })
  },
}
