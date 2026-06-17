// tests/helpers/factories.js
import { randomUUID } from 'crypto'
import prisma from '../../src/config/prisma.js'
import { hashPassword } from '../../src/utils/hash.js'
import { authService } from '../../src/modules/auth/auth.service.js'

const DEFAULT_PASSWORD = 'Password123!'

export const createUser = async ({
  role = 'CLIENT',
  login,
  email,
  fullname,
  password = DEFAULT_PASSWORD,
  active = true,
} = {}) => {
  const suffix = randomUUID().slice(0, 8)
  const hashed = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      login: login || `user_${suffix}`,
      email: email || `user_${suffix}@test.com`,
      fullname: fullname || 'Utilisateur Test',
      password: hashed,
      role,
      active,
    },
  })

  return { ...user, plainPassword: password }
}

export const createBank = async (overrides = {}) => {
  const suffix = randomUUID().slice(0, 8)

  return prisma.bank.create({
    data: {
      code: overrides.code || `BK${suffix}`,
      name: overrides.name || 'Banque Test',
      min_amount: overrides.min_amount ?? 100,
      max_amount: overrides.max_amount ?? 1000000,
      internal_fee_tx: overrides.internal_fee_tx ?? 0.005,
      interbank_fee_tx: overrides.interbank_fee_tx ?? 0.01,
      withdraw_fee: overrides.withdraw_fee ?? 0.008,
      active: overrides.active ?? true,
    },
  })
}

export const createAccount = async ({ userId, bankId, balance = 0, currency = 'XAF' }) => {
  const suffix = Date.now().toString().slice(-8)

  return prisma.account.create({
    data: {
      account_number: `ACC-${suffix}-${Math.floor(Math.random() * 10000)}`,
      balance,
      currency,
      user_id: userId,
      bank_id: bankId,
    },
  })
}

export const createTransaction = async ({ accountId, bankId, counterpartBankId, ...overrides }) => {
  return prisma.transaction.create({
    data: {
      reference: overrides.reference || randomUUID(),
      account_id: accountId,
      bank_id: bankId,
      counterpart_bank_id: counterpartBankId || bankId,
      counterpart_account_number: overrides.counterpart_account_number || 'CAISSE',
      amount: overrides.amount ?? 1000,
      fee: overrides.fee ?? 0,
      net_amount: overrides.net_amount ?? overrides.amount ?? 1000,
      type: overrides.type || 'CREDIT',
      status: overrides.status || 'SUCCESS',
      description: overrides.description || null,
      processed_at: overrides.processed_at || new Date(),
    },
  })
}

export const getAuthToken = async ({ login, password }) => {
  const { token } = await authService.login({ login, password })
  return token
}
