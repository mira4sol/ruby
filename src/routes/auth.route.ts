import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { privyAuth } from '../middlewares/privyAuth'

const router = Router()

router.post('/sync', privyAuth, authController.sync)

export default router
