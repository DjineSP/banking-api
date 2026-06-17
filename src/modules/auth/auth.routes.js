import { Router } from 'express'
import { authController } from './auth.controller.js'
import { authValidator } from './auth.validator.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { authenticate } from '../../middlewares/auth.middleware.js'

const router = Router()

router.post('/login',    validate(authValidator.login),    authController.login)
router.patch('/me/password', authenticate, validate(authValidator.changePassword), authController.changePassword)

export default router