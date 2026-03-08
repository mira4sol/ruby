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
  app.use(compression())
}

/**
 * Must be called AFTER all routes are registered.
 * Express error handlers must have 4 parameters to be recognized.
 */
export const injectErrorHandler = (app: Express): void => {
  app.use(errorHandler)
}
