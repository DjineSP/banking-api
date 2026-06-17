import prisma from '../../config/prisma.js'
import { AppError } from '../../utils/apiError.js'

const generateAccountNumber = () => {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ACC-${timestamp}-${random}`
}

export const accountService = {
  async findAll() {
    return prisma.account.findMany({
      include: {
        user: { select: { id: true, fullname: true, email: true } },
        bank: { select: { id: true, name: true, code: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  },

  async findMine(userId) {
    return prisma.account.findMany({
      where: { user_id: userId },
      include: {
        bank: { select: { id: true, name: true, code: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  },

  async findById(id, userId = null) {
    const where = { id }
    if (userId) where.user_id = userId

    const account = await prisma.account.findUnique({
      where,
      include: {
        user: { select: { id: true, fullname: true, email: true } },
        bank: { select: { id: true, name: true, code: true } },
      },
    })
    if (!account) throw new AppError('Compte introuvable', 404)
    return account
  },

  async findTransactions(id, userId = null) {
    await accountService.findById(id, userId)

    return prisma.transaction.findMany({
      where: { account_id: id },
      include: {
        bank: { select: { id: true, name: true, code: true } },
        counterpart_bank: { select: { id: true, name: true, code: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  },

  async create(data, requesterId, requesterRole) {
    const bank = await prisma.bank.findUnique({ where: { id: data.bank_id } })
    if (!bank || !bank.active) throw new AppError('Banque introuvable ou inactive', 404)

    // Un CLIENT ne peut créer un compte que pour lui-même
    const userId = requesterRole === 'ADMIN' && data.user_id ? data.user_id : requesterId

    const account_number = generateAccountNumber()

    return prisma.account.create({
      data: {
        account_number,
        currency: data.currency || 'XAF',
        user_id: userId,
        bank_id: data.bank_id,
      },
      include: {
        bank: { select: { id: true, name: true, code: true } },
      },
    })
  },

  async close(id) {
    const account = await accountService.findById(id)

    if (parseFloat(account.balance) > 0) {
      throw new AppError('Impossible de fermer un compte avec un solde positif', 422)
    }

    return prisma.account.delete({ where: { id } })
  },
}