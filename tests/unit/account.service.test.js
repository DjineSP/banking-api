// tests/unit/account.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/config/prisma.js', () => ({
  default: {
    account: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    bank: {
      findUnique: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
    },
  },
}))

import prisma from '../../src/config/prisma.js'
import { accountService } from '../../src/modules/account/account.service.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('accountService.findAll', () => {
  it('retourne tous les comptes', async () => {
    prisma.account.findMany.mockResolvedValue([{ id: 'acc-1' }, { id: 'acc-2' }])

    const accounts = await accountService.findAll()
    expect(accounts).toHaveLength(2)
  })
})

describe('accountService.findMine', () => {
  it('retourne uniquement les comptes du user connecté', async () => {
    prisma.account.findMany.mockResolvedValue([{ id: 'acc-1', user_id: 'user-1' }])

    const accounts = await accountService.findMine('user-1')
    expect(accounts).toHaveLength(1)
    expect(prisma.account.findMany.mock.calls[0][0].where).toEqual({ user_id: 'user-1' })
  })
})

describe('accountService.findById', () => {
  it('retourne un compte existant', async () => {
    prisma.account.findUnique.mockResolvedValue({ id: 'acc-1' })

    const account = await accountService.findById('acc-1')
    expect(account.id).toBe('acc-1')
  })

  it('filtre par user_id quand un userId est fourni (ownership)', async () => {
    prisma.account.findUnique.mockResolvedValue({ id: 'acc-1', user_id: 'user-1' })

    await accountService.findById('acc-1', 'user-1')
    expect(prisma.account.findUnique.mock.calls[0][0].where).toEqual({ id: 'acc-1', user_id: 'user-1' })
  })

  it('lève une AppError 404 si le compte n\'existe pas', async () => {
    prisma.account.findUnique.mockResolvedValue(null)

    await expect(accountService.findById('inconnu')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('accountService.findTransactions', () => {
  it('retourne les transactions d\'un compte existant', async () => {
    prisma.account.findUnique.mockResolvedValue({ id: 'acc-1' })
    prisma.transaction.findMany.mockResolvedValue([{ id: 'tx-1' }])

    const transactions = await accountService.findTransactions('acc-1')
    expect(transactions).toHaveLength(1)
  })

  it('lève une AppError 404 si le compte n\'existe pas', async () => {
    prisma.account.findUnique.mockResolvedValue(null)

    await expect(accountService.findTransactions('inconnu')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('accountService.create', () => {
  const bank = { id: 'bank-1', active: true }

  it('crée un compte pour le requester quand il est CLIENT', async () => {
    prisma.bank.findUnique.mockResolvedValue(bank)
    prisma.account.create.mockResolvedValue({ id: 'acc-1', user_id: 'client-1' })

    await accountService.create({ bank_id: 'bank-1' }, 'client-1', 'CLIENT')

    const createArgs = prisma.account.create.mock.calls[0][0]
    expect(createArgs.data.user_id).toBe('client-1')
    expect(createArgs.data.account_number).toMatch(/^ACC-/)
  })

  it('ignore user_id fourni par un CLIENT (force son propre id)', async () => {
    prisma.bank.findUnique.mockResolvedValue(bank)
    prisma.account.create.mockResolvedValue({ id: 'acc-1' })

    await accountService.create({ bank_id: 'bank-1', user_id: 'autre-user' }, 'client-1', 'CLIENT')

    expect(prisma.account.create.mock.calls[0][0].data.user_id).toBe('client-1')
  })

  it('crée un compte pour un autre user quand le requester est ADMIN', async () => {
    prisma.bank.findUnique.mockResolvedValue(bank)
    prisma.account.create.mockResolvedValue({ id: 'acc-1' })

    await accountService.create({ bank_id: 'bank-1', user_id: 'autre-user' }, 'admin-1', 'ADMIN')

    expect(prisma.account.create.mock.calls[0][0].data.user_id).toBe('autre-user')
  })

  it('lève une AppError 404 si la banque n\'existe pas ou est inactive', async () => {
    prisma.bank.findUnique.mockResolvedValue(null)

    await expect(accountService.create({ bank_id: 'inconnu' }, 'client-1', 'CLIENT'))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('accountService.close', () => {
  it('ferme un compte au solde nul', async () => {
    prisma.account.findUnique.mockResolvedValue({ id: 'acc-1', balance: 0 })
    prisma.account.delete.mockResolvedValue({})

    await accountService.close('acc-1')
    expect(prisma.account.delete).toHaveBeenCalledWith({ where: { id: 'acc-1' } })
  })

  it('lève une AppError 422 si le solde est positif', async () => {
    prisma.account.findUnique.mockResolvedValue({ id: 'acc-1', balance: 5000 })

    await expect(accountService.close('acc-1')).rejects.toMatchObject({ statusCode: 422 })
  })

  it('lève une AppError 404 si le compte n\'existe pas', async () => {
    prisma.account.findUnique.mockResolvedValue(null)

    await expect(accountService.close('inconnu')).rejects.toMatchObject({ statusCode: 404 })
  })
})
