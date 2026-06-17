import { Router } from 'express'
import { userController } from './user.controller.js'
import { userValidator } from './user.validator.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { requireRole } from '../../middlewares/role.middleware.js'

const router = Router()

router.use(authenticate, requireRole('ADMIN'))

router.post('/',               validate(userValidator.create),       userController.create)
router.get('/',               userController.findAll)
router.get('/:id',            validate(userValidator.delete),       userController.findById)
router.patch('/:id',          validate(userValidator.update),       userController.update)
router.patch('/:id/toggle',   validate(userValidator.toggleActive), userController.toggleActive)
router.delete('/:id',         validate(userValidator.delete),       userController.delete)

export default router