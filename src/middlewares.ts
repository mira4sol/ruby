import compression from 'compression'
import cors from 'cors'
import { Express, json } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { errorHandler } from './middlewares/errorHandler'

export const injectMiddleware = (app: Express): void => {
  app.use(helmet())
  app.use(cors())
  app.use(morgan('combined'))
  app.use(json())
  // Skip compression entirely for /api/chat so streaming isn't buffered (compression filter can still wrap res)
  app.use((req, res, next) => {
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0]
    if (path === '/api/chat') {
      return next()
    }
    compression()(req, res, next)
  })
}

/**
 * Must be called AFTER all routes are registered.
 * Express error handlers must have 4 parameters to be recognized.
 */
export const injectErrorHandler = (app: Express): void => {
  app.use(errorHandler)
}
