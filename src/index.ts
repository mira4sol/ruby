import express from 'express'
import { injectErrorHandler, injectMiddleware } from './middlewares'
import { injectRoutes } from './routes'
import { env } from './utils/env'

const app = express()

// Register middleware (before routes)
injectMiddleware(app)

// Register routes
injectRoutes(app)

// Register error handler (MUST be after routes)
injectErrorHandler(app)

app.listen(env.PORT, env.HOST, () => {
  // console.log(`Ruby is running on http://${env.HOST}:${env.PORT}`)
  // console.log(`Environment: ${env.NODE_ENV}`)
  console.log(`Solana: ${env.SOLANA_NETWORK}`)
})
