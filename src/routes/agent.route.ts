import { Router } from 'express'
import { agentController } from '../controllers/agent.controller'
import { privyAuth } from '../middlewares/privyAuth'
import { validate } from '../middlewares/validate'
import { createAgentSchema } from '../types/schemas'

const router = Router()

// All routes require Privy JWT auth
router.use(privyAuth)

router.post('/', validate(createAgentSchema), agentController.create)
router.get('/', agentController.list)
router.get('/:agentId', agentController.getById)
router.delete('/:agentId', agentController.delete)
router.post('/:agentId/regenerate-key', agentController.regenerateKey)

export default router
