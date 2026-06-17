import prisma from '../../config/prisma.js'
import { hashPassword, comparePassword } from '../../utils/hash.js'
import { signToken } from '../../utils/jwt.js'
import { AppError } from '../../utils/apiError.js'

export const authService = {
  async login({ login, password }) {
    const user = await prisma.user.findUnique({ where: { login } })
    if (!user || !user.active) throw new AppError('Identifiants invalides', 401)

    const valid = await comparePassword(password, user.password)
    if (!valid) throw new AppError('Identifiants invalides', 401)

    const token = signToken({ id: user.id, role: user.role })
    return {
      token,
      user: {
        id: user.id,
        login: user.login,
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        active: user.active,
        created_at: user.created_at,
      },
    }
  },

  async changePassword(userId, { oldPassword, newPassword }) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new AppError('Utilisateur introuvable', 404)

    const valid = await comparePassword(oldPassword, user.password)
    if (!valid) throw new AppError('Ancien mot de passe incorrect', 401)

    const hashed = await hashPassword(newPassword)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  },
}