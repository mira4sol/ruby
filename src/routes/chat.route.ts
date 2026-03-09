import { Router } from 'express'
import { agentChatController } from '../controllers/agentChat.controller'

const router = Router()

// The chat route intentionally doesn't use apiKeyAuth so it can gracefully ask for the key via LLM if missing
router.post('/', agentChatController.chat)

export default router
