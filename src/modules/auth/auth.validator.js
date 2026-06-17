import { body } from 'express-validator'

export const authValidator = {
  login: [
    body('login').trim().notEmpty().withMessage('Login requis'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
  ],
  changePassword: [
    body('oldPassword').notEmpty().withMessage('Ancien mot de passe requis'),
    body('newPassword').isLength({ min: 6 }).withMessage('Nouveau mot de passe minimum 6 caractères'),
  ],
}