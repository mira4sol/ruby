import { Router } from 'express'
import { policyController } from '../controllers/policy.controller'
import { privyAuth } from '../middlewares/privyAuth'
import { validate } from '../middlewares/validate'
import { updatePolicySchema } from '../types/schemas'

const router = Router({ mergeParams: true })

// All routes require Privy JWT auth
router.use(privyAuth)

router.get('/', policyController.get)
router.put('/', validate(updatePolicySchema), policyController.update)
router.delete('/', policyController.delete)

export default router
