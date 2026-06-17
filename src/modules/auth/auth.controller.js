import { authService } from './auth.service.js'

export const authController = {
  async login(req, res, next) {
    try {
      const result = await authService.login(req.body)
      res.status(200).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async changePassword(req, res, next) {
    try {
      await authService.changePassword(req.user.id, req.body)
      res.status(200).json({ success: true, message: 'Mot de passe mis à jour' })
    } catch (err) {
      next(err)
    }
  },
}