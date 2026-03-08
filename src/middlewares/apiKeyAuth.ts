import { createHash } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { prismaService } from '../services/prismaService'
import { UnauthorizedError } from '../types/errors'

export const apiKeyAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const rawKey = req.headers['x-api-key'] as string
  if (!rawKey) return next(new UnauthorizedError('Missing API key'))

  const hash = createHash('sha256').update(rawKey).digest('hex')

  const agent = await prismaService.prisma.agent.findUnique({
    where: { apiKeyHash: hash },
  })

  if (!agent || !agent.isActive || agent.deletedAt !== null) {
    return next(new UnauthorizedError('Invalid or inactive API key'))
  }

  req.agent = agent
  next()
}
