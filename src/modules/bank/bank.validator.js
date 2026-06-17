import { body, param } from 'express-validator'

export const bankValidator = {
  create: [
    body('code').trim().notEmpty().withMessage('Code banque requis'),
    body('name').trim().notEmpty().withMessage('Nom banque requis'),
    body('min_amount').isFloat({ min: 0 }).withMessage('Montant minimum invalide'),
    body('max_amount').isFloat({ min: 0 }).withMessage('Montant maximum invalide'),
    body('internal_fee_tx').isFloat({ min: 0, max: 1 }).withMessage('Frais interne invalide (0-1)'),
    body('interbank_fee_tx').isFloat({ min: 0, max: 1 }).withMessage('Frais interbanque invalide (0-1)'),
    body('withdraw_fee').isFloat({ min: 0, max: 1 }).withMessage('Frais retrait invalide (0-1)'),
  ],
  update: [
    param('id').isUUID().withMessage('ID invalide'),
    body('name').optional().trim().notEmpty().withMessage('Nom invalide'),
    body('min_amount').optional().isFloat({ min: 0 }).withMessage('Montant minimum invalide'),
    body('max_amount').optional().isFloat({ min: 0 }).withMessage('Montant maximum invalide'),
    body('internal_fee_tx').optional().isFloat({ min: 0, max: 1 }).withMessage('Frais interne invalide (0-1)'),
    body('interbank_fee_tx').optional().isFloat({ min: 0, max: 1 }).withMessage('Frais interbanque invalide (0-1)'),
    body('withdraw_fee').optional().isFloat({ min: 0, max: 1 }).withMessage('Frais retrait invalide (0-1)'),
  ],
  id: [
    param('id').isUUID().withMessage('ID invalide'),
  ],
}