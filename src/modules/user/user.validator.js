import { body, param } from 'express-validator'

export const userValidator = {
  create: [
    body('login').trim().notEmpty().withMessage('Login requis'),
    body('password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caractères'),
    body('email').isEmail().withMessage('Email invalide'),
    body('fullname').trim().notEmpty().withMessage('Nom complet requis'),
    body('role').optional().isIn(['ADMIN', 'CLIENT']).withMessage('Rôle invalide'),
  ],
  update: [
    param('id').isUUID().withMessage('ID invalide'),
    body('email').optional().isEmail().withMessage('Email invalide'),
    body('fullname').optional().trim().notEmpty().withMessage('Nom complet invalide'),
  ],
  toggleActive: [
    param('id').isUUID().withMessage('ID invalide'),
  ],
  delete: [
    param('id').isUUID().withMessage('ID invalide'),
  ],
}