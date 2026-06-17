import { Router } from 'express'
import { accountController } from './account.controller.js'
import { accountValidator } from './account.validator.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { requireRole } from '../../middlewares/role.middleware.js'

const router = Router()

router.use(authenticate)

router.post('/',                    validate(accountValidator.create),  accountController.create)
router.get('/mine',                                                     accountController.findMine)
router.get('/',                     requireRole('ADMIN'),               accountController.findAll)
router.get('/:id',                  validate(accountValidator.id),      accountController.findById)
router.get('/:id/transactions',     validate(accountValidator.id),      accountController.findTransactions)
router.patch('/:id/close',          requireRole('ADMIN'), validate(accountValidator.id), accountController.close)

export default router