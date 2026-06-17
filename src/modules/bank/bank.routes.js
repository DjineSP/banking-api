import { Router } from 'express'
import { bankController } from './bank.controller.js'
import { bankValidator } from './bank.validator.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { requireRole } from '../../middlewares/role.middleware.js'

const router = Router()

router.get('/',           authenticate, bankController.findAll)
router.get('/:id',        authenticate, validate(bankValidator.id),     bankController.findById)
router.post('/',          authenticate, requireRole('ADMIN'), validate(bankValidator.create),  bankController.create)
router.patch('/:id',      authenticate, requireRole('ADMIN'), validate(bankValidator.update),  bankController.update)
router.patch('/:id/toggle', authenticate, requireRole('ADMIN'), validate(bankValidator.id),    bankController.toggleActive)

export default router