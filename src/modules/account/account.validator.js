import { body, param } from 'express-validator'

export const accountValidator = {
  create: [
    body('currency').optional().trim().isIn(['XAF', 'USD', 'EUR']).withMessage('Devise invalide'),
    body('bank_id').isUUID().withMessage('ID banque invalide'),
    body('user_id').optional().isUUID().withMessage('ID utilisateur invalide'),
  ],
  id: [
    param('id').isUUID().withMessage('ID invalide'),
  ],
}