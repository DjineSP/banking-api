import prisma from '../../config/prisma.js'
import { AppError } from '../../utils/apiError.js'

export const bankService = {
  async findAll() {
    return prisma.bank.findMany({
      orderBy: { created_at: 'desc' },
    })
  },

  async findById(id) {
    const bank = await prisma.bank.findUnique({ where: { id } })
    if (!bank) throw new AppError('Banque introuvable', 404)
    return bank
  },

  async create(data) {
    const existing = await prisma.bank.findUnique({ where: { code: data.code } })
    if (existing) throw new AppError('Code banque déjà utilisé', 409)

    if (data.min_amount >= data.max_amount) {
      throw new AppError('Le montant minimum doit être inférieur au montant maximum', 422)
    }

    return prisma.bank.create({ data })
  },

  async update(id, data) {
    const bank = await bankService.findById(id)

    if (data.min_amount && data.max_amount) {
      if (data.min_amount >= data.max_amount) {
        throw new AppError('Le montant minimum doit être inférieur au montant maximum', 422)
      }
    } else if (data.min_amount && data.min_amount >= bank.max_amount) {
      throw new AppError('Le montant minimum doit être inférieur au montant maximum actuel', 422)
    } else if (data.max_amount && data.max_amount <= bank.min_amount) {
      throw new AppError('Le montant maximum doit être supérieur au montant minimum actuel', 422)
    }

    return prisma.bank.update({ where: { id }, data })
  },

  async toggleActive(id) {
    const bank = await bankService.findById(id)
    return prisma.bank.update({
      where: { id },
      data: { active: !bank.active },
    })
  },
}