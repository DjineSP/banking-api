import { body, param } from 'express-validator'

export const transactionValidator = {
  transfer: [
    body('from_account_id').isUUID().withMessage('ID compte source invalide'),
    body('to_account_number').trim().notEmpty().withMessage('Numéro de compte cible requis'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Montant invalide'),
    body('description').optional().trim().notEmpty().withMessage('Description invalide'),
  ],
  deposit: [
    body('account_id').isUUID().withMessage('ID compte invalide'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Montant invalide'),
    body('description').optional().trim().notEmpty().withMessage('Description invalide'),
  ],
  withdraw: [
    body('account_id').isUUID().withMessage('ID compte invalide'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Montant invalide'),
    body('description').optional().trim().notEmpty().withMessage('Description invalide'),
  ],
  id: [
    param('id').isUUID().withMessage('ID invalide'),
  ],
  reference: [
    param('reference').isUUID().withMessage('Référence invalide'),
  ],
}