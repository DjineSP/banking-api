import prisma from '../../config/prisma.js'
import { AppError } from '../../utils/apiError.js'
import { hashPassword } from '../../utils/hash.js'

const safeSelect = {
  id: true,
  login: true,
  email: true,
  fullname: true,
  role: true,
  active: true,
  created_at: true,
}

export const userService = {
  async create({ login, password, email, fullname, role }) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ login }, { email }] },
    })
    if (existing) throw new AppError('Login ou email déjà utilisé', 409)

    const hashed = await hashPassword(password)
    return prisma.user.create({
      data: { login, password: hashed, email, fullname, role },
      select: safeSelect,
    })
  },

  async findAll() {
    return prisma.user.findMany({ select: safeSelect, orderBy: { created_at: 'desc' } })
  },

  async findById(id) {
    const user = await prisma.user.findUnique({ where: { id }, select: safeSelect })
    if (!user) throw new AppError('Utilisateur introuvable', 404)
    return user
  },

  async update(id, data) {
    await userService.findById(id)

    if (data.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } })
      if (existing && existing.id !== id) throw new AppError('Email déjà utilisé', 409)
    }

    return prisma.user.update({
      where: { id },
      data,
      select: safeSelect,
    })
  },

  async toggleActive(id) {
    const user = await userService.findById(id)
    return prisma.user.update({
      where: { id },
      data: { active: !user.active },
      select: safeSelect,
    })
  },

  async delete(id) {
    await userService.findById(id)
    await prisma.user.delete({ where: { id } })
  },
}