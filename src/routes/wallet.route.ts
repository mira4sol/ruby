import { Router } from 'express'
import { walletController } from '../controllers/wallet.controller'
import { privyAuth } from '../middlewares/privyAuth'
import { validate } from '../middlewares/validate'
import {
  createWalletSchema,
  sendSOLSchema,
  sendSPLSchema,
  swapSchema,
} from '../types/schemas'

const router = Router({ mergeParams: true })

// All routes require Privy JWT auth
router.use(privyAuth)

router.post('/', validate(createWalletSchema), walletController.create)
router.get('/', walletController.list)
router.get('/:walletId/balance', walletController.getBalance)
router.delete('/:walletId', walletController.delete)
router.post(
  '/:walletId/send',
  validate(sendSOLSchema),
  walletController.sendSOL,
)
router.post(
  '/:walletId/send-spl',
  validate(sendSPLSchema),
  walletController.sendSPL,
)
router.post('/:walletId/swap', validate(swapSchema), walletController.swap)

export default router
