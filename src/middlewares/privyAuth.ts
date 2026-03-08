import { privy } from '@/utils/privy'
import { NextFunction, Request, Response } from 'express'
import { createRemoteJWKSet } from 'jose'
import { UnauthorizedError } from '../types/errors'
import { env } from '../utils/env'

const verificationKey = createRemoteJWKSet(
  new URL(
    `https://auth.privy.io/api/v1/apps/${env.PRIVY_APP_ID}/.well-known/jwks.json`,
  ),
)

export const privyAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return next(new UnauthorizedError('Missing authorization token'))
  console.log('token', token)

  try {
    const claims = await privy.utils().auth().verifyIdentityToken(token)
    // const claims = await verifyAccessToken({
    //   access_token: token,
    //   app_id: env.PRIVY_APP_ID,
    //   verification_key: verificationKey,
    // })
    console.log('claims', claims)
    req.privyUser = claims
    next()
  } catch (error) {
    console.log('jwt error', error)
    next(new UnauthorizedError('Invalid or expired token'))
  }
}
