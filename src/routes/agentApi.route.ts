import { Router } from 'express'
import { agentApiController } from '../controllers/agentApi.controller'
import { apiKeyAuth } from '../middlewares/apiKeyAuth'
import { validate } from '../middlewares/validate'
import {
  recurringOrderSchema,
  sendSOLSchema,
  sendSPLSchema,
  swapSchema,
  triggerOrderSchema,
} from '../types/schemas'

const router = Router()

// All agent routes require API key auth
router.use(apiKeyAuth)

// Wallet operations
router.get('/wallets', agentApiController.listWallets)
router.get('/wallets/:label/balance', agentApiController.getBalance)
router.post(
  '/wallets/:label/send',
  validate(sendSOLSchema),
  agentApiController.sendSOL,
)
router.post(
  '/wallets/:label/send-spl',
  validate(sendSPLSchema),
  agentApiController.sendSPL,
)
router.post(
  '/wallets/:label/swap',
  validate(swapSchema),
  agentApiController.swap,
)
router.post(
  '/wallets/:label/trigger',
  validate(triggerOrderSchema),
  agentApiController.createTriggerOrder,
)
router.post(
  '/wallets/:label/recurring',
  validate(recurringOrderSchema),
  agentApiController.createRecurringOrder,
)
router.get('/wallets/:label/history', agentApiController.getHistory)
router.get('/wallets/:label/orders', agentApiController.getOrders)

export default router
