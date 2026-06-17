import { randomUUID } from 'crypto'
import prisma from '../../config/prisma.js'
import { AppError } from '../../utils/apiError.js'
import { calculateFee, resolveFeeType } from '../../utils/fee.js'

export const transactionService = {
  async transfer({ from_account_id, to_account_number, amount, description }, requesterId, requesterRole) {
    const sourceAccount = await prisma.account.findUnique({
      where: { id: from_account_id },
      include: { bank: true },
    })
    if (!sourceAccount) throw new AppError('Compte source introuvable', 404)

    // Un CLIENT ne peut transférer que depuis ses propres comptes
    if (requesterRole === 'CLIENT' && sourceAccount.user_id !== requesterId) {
      throw new AppError('Accès refusé', 403)
    }

    const targetAccount = await prisma.account.findUnique({
      where: { account_number: to_account_number },
      include: { bank: true },
    })
    if (!targetAccount) throw new AppError('Compte cible introuvable', 404)
    if (sourceAccount.id === targetAccount.id) throw new AppError('Impossible de transférer vers le même compte', 422)

    const bank = sourceAccount.bank
    if (amount < parseFloat(bank.min_amount)) throw new AppError(`Montant minimum : ${bank.min_amount}`, 422)
    if (amount > parseFloat(bank.max_amount)) throw new AppError(`Montant maximum : ${bank.max_amount}`, 422)

    const feeType = resolveFeeType(sourceAccount.bank_id, targetAccount.bank_id)
    const { fee, netAmount } = calculateFee(feeType, amount, bank)

    if (parseFloat(sourceAccount.balance) < netAmount) {
      throw new AppError('Solde insuffisant', 422)
    }

    const reference = randomUUID()

    const [debit, credit] = await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: sourceAccount.id },
        data: { balance: { decrement: netAmount } },
      })

      await tx.account.update({
        where: { id: targetAccount.id },
        data: { balance: { increment: amount } },
      })

      const debitTx = await tx.transaction.create({
        data: {
          reference,
          account_id: sourceAccount.id,
          bank_id: sourceAccount.bank_id,
          counterpart_bank_id: targetAccount.bank_id,
          counterpart_account_number: to_account_number,
          amount,
          fee,
          net_amount: netAmount,
          type: 'DEBIT',
          status: 'SUCCESS',
          description: description || null,
          processed_at: new Date(),
        },
      })

      const creditTx = await tx.transaction.create({
        data: {
          reference,
          account_id: targetAccount.id,
          bank_id: targetAccount.bank_id,
          counterpart_bank_id: sourceAccount.bank_id,
          counterpart_account_number: sourceAccount.account_number,
          amount,
          fee: 0,
          net_amount: amount,
          type: 'CREDIT',
          status: 'SUCCESS',
          description: description || null,
          processed_at: new Date(),
        },
      })

      return [debitTx, creditTx]
    })

    return [debit, credit]
  },

  async deposit({ account_id, amount, description }) {
    const account = await prisma.account.findUnique({ where: { id: account_id } })
    if (!account) throw new AppError('Compte introuvable', 404)

    const reference = randomUUID()

    return prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: account_id },
        data: { balance: { increment: amount } },
      })

      return tx.transaction.create({
        data: {
          reference,
          account_id,
          bank_id: account.bank_id,
          counterpart_bank_id: account.bank_id,
          counterpart_account_number: 'CAISSE',
          amount,
          fee: 0,
          net_amount: amount,
          type: 'CREDIT',
          status: 'SUCCESS',
          description: description || 'Dépôt',
          processed_at: new Date(),
        },
      })
    })
  },

  async withdraw({ account_id, amount, description }, requesterId, requesterRole) {
    const account = await prisma.account.findUnique({
      where: { id: account_id },
      include: { bank: true },
    })
    if (!account) throw new AppError('Compte introuvable', 404)

    if (requesterRole === 'CLIENT' && account.user_id !== requesterId) {
      throw new AppError('Accès refusé', 403)
    }

    const bank = account.bank
    if (amount < parseFloat(bank.min_amount)) throw new AppError(`Montant minimum : ${bank.min_amount}`, 422)
    if (amount > parseFloat(bank.max_amount)) throw new AppError(`Montant maximum : ${bank.max_amount}`, 422)

    const { fee, netAmount } = calculateFee('withdraw', amount, bank)

    if (parseFloat(account.balance) < netAmount) {
      throw new AppError('Solde insuffisant', 422)
    }

    const reference = randomUUID()

    return prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: account_id },
        data: { balance: { decrement: netAmount } },
      })

      return tx.transaction.create({
        data: {
          reference,
          account_id,
          bank_id: account.bank_id,
          counterpart_bank_id: account.bank_id,
          counterpart_account_number: 'CAISSE',
          amount,
          fee,
          net_amount: netAmount,
          type: 'DEBIT',
          status: 'SUCCESS',
          description: description || 'Retrait',
          processed_at: new Date(),
        },
      })
    })
  },

  async findAll() {
    return prisma.transaction.findMany({
      include: {
        account: { select: { id: true, account_number: true } },
        bank: { select: { id: true, name: true, code: true } },
        counterpart_bank: { select: { id: true, name: true, code: true } },
      },
      orderBy: { created_at: 'desc' },
    })
  },

  async findById(id) {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        account: { select: { id: true, account_number: true } },
        bank: { select: { id: true, name: true, code: true } },
        counterpart_bank: { select: { id: true, name: true, code: true } },
      },
    })
    if (!transaction) throw new AppError('Transaction introuvable', 404)
    return transaction
  },

  async findByReference(reference) {
    const transactions = await prisma.transaction.findMany({
      where: { reference },
      include: {
        account: { select: { id: true, account_number: true } },
        bank: { select: { id: true, name: true, code: true } },
        counterpart_bank: { select: { id: true, name: true, code: true } },
      },
      orderBy: { type: 'asc' },
    })
    if (!transactions.length) throw new AppError('Référence introuvable', 404)
    return transactions
  },
}