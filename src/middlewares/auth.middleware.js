import { verifyToken } from '../utils/jwt.js'
import { AppError } from '../utils/apiError.js'

export const authenticate = (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) throw new AppError('Token manquant', 401)

    const token = header.split(' ')[1]
    const payload = verifyToken(token)
    req.user = payload
    next()
  } catch (err) {
    if (err.isOperational) return next(err)
    next(new AppError('Token invalide ou expiré', 401))
  }
}