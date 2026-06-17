import { AppError } from '../utils/apiError.js'

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return next(new AppError('Accès refusé', 403))
  }
  next()
}