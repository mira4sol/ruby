import { Express } from 'express'
import agentRoutes from './routes/agent.route'
import agentApiRoutes from './routes/agentApi.route'
import authRoutes from './routes/auth.route'
import chatRoutes from './routes/chat.route'
import policyRoutes from './routes/policy.route'
import walletRoutes from './routes/wallet.route'

export const injectRoutes = (app: Express): void => {
  // Health check
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'ruby-agent-wallet' })
  })

  // Human-facing routes (Privy JWT auth)
  app.use('/api/auth', authRoutes)
  app.use('/api/agents', agentRoutes)
  app.use('/api/agents/:agentId/wallets', walletRoutes)
  app.use('/api/agents/:agentId/wallets/:walletId/policy', policyRoutes)

  // LLM Chat Route - gracefully handles missing API keys
  app.use('/api/chat', chatRoutes)

  // Agent-facing routes (API key auth)
  app.use('/agent', agentApiRoutes)
}
