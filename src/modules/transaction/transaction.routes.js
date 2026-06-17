import { Router } from 'express'
import { transactionController } from './transaction.controller.js'
import { transactionValidator } from './transaction.validator.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { authenticate } from '../../middlewares/auth.middleware.js'
import { requireRole } from '../../middlewares/role.middleware.js'

const router = Router()

router.use(authenticate)

router.post('/transfer',          validate(transactionValidator.transfer),     transactionController.transfer)
router.post('/deposit',           requireRole('ADMIN'), validate(transactionValidator.deposit),      transactionController.deposit)
router.post('/withdraw',          validate(transactionValidator.withdraw),     transactionController.withdraw)
router.get('/',                   requireRole('ADMIN'),                        transactionController.findAll)
router.get('/ref/:reference',     validate(transactionValidator.reference),    transactionController.findByReference)
router.get('/:id',                validate(transactionValidator.id),           transactionController.findById)

export default router