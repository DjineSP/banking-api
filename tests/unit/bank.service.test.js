// tests/unit/bank.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/config/prisma.js', () => ({
  default: {
    bank: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import prisma from '../../src/config/prisma.js'
import { bankService } from '../../src/modules/bank/bank.service.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('bankService.findAll', () => {
  it('retourne toutes les banques, actives et inactives', async () => {
    prisma.bank.findMany.mockResolvedValue([
      { id: 'bank-1', active: true },
      { id: 'bank-2', active: false },
    ])

    const banks = await bankService.findAll()
    expect(banks).toHaveLength(2)
    expect(prisma.bank.findMany.mock.calls[0][0].where).toBeUndefined()
  })
})

describe('bankService.findById', () => {
  it('retourne une banque existante', async () => {
    prisma.bank.findUnique.mockResolvedValue({ id: 'bank-1' })

    const bank = await bankService.findById('bank-1')
    expect(bank.id).toBe('bank-1')
  })

  it('lève une AppError 404 si la banque n\'existe pas', async () => {
    prisma.bank.findUnique.mockResolvedValue(null)

    await expect(bankService.findById('inconnu')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('bankService.create', () => {
  const validData = {
    code: 'SG', name: 'Société Générale', min_amount: 100, max_amount: 1000000,
    internal_fee_tx: 0.005, interbank_fee_tx: 0.01, withdraw_fee: 0.008,
  }

  it('crée une banque si le code n\'existe pas encore', async () => {
    prisma.bank.findUnique.mockResolvedValue(null)
    prisma.bank.create.mockResolvedValue({ id: 'bank-1', ...validData })

    const bank = await bankService.create(validData)
    expect(bank.id).toBe('bank-1')
  })

  it('lève une AppError 409 si le code banque existe déjà', async () => {
    prisma.bank.findUnique.mockResolvedValue({ id: 'existing' })

    await expect(bankService.create(validData)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('lève une AppError 422 si min_amount >= max_amount', async () => {
    prisma.bank.findUnique.mockResolvedValue(null)

    await expect(bankService.create({ ...validData, min_amount: 5000, max_amount: 1000 }))
      .rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('bankService.update', () => {
  it('met à jour une banque existante', async () => {
    prisma.bank.findUnique.mockResolvedValue({ id: 'bank-1', min_amount: 100, max_amount: 1000000 })
    prisma.bank.update.mockResolvedValue({ id: 'bank-1', name: 'Nouveau nom' })

    const bank = await bankService.update('bank-1', { name: 'Nouveau nom' })
    expect(bank.name).toBe('Nouveau nom')
  })

  it('accepte min_amount et max_amount fournis ensemble quand min < max', async () => {
    prisma.bank.findUnique.mockResolvedValue({ id: 'bank-1', min_amount: 100, max_amount: 1000000 })
    prisma.bank.update.mockResolvedValue({ id: 'bank-1', min_amount: 200, max_amount: 2000 })

    const bank = await bankService.update('bank-1', { min_amount: 200, max_amount: 2000 })
    expect(bank.min_amount).toBe(200)
  })

  it('lève une AppError 422 si min_amount >= max_amount fournis ensemble', async () => {
    prisma.bank.findUnique.mockResolvedValue({ id: 'bank-1', min_amount: 100, max_amount: 1000000 })

    await expect(bankService.update('bank-1', { min_amount: 5000, max_amount: 1000 }))
      .rejects.toMatchObject({ statusCode: 422 })
  })

  it('lève une AppError 404 si la banque n\'existe pas', async () => {
    prisma.bank.findUnique.mockResolvedValue(null)

    await expect(bankService.update('inconnu', { name: 'X' })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lève une AppError 422 si seul min_amount est fourni et dépasse le max_amount actuel', async () => {
    prisma.bank.findUnique.mockResolvedValue({ id: 'bank-1', min_amount: 100, max_amount: 1000 })

    await expect(bankService.update('bank-1', { min_amount: 5000 }))
      .rejects.toMatchObject({ statusCode: 422 })
  })

  it('lève une AppError 422 si seul max_amount est fourni et est sous le min_amount actuel', async () => {
    prisma.bank.findUnique.mockResolvedValue({ id: 'bank-1', min_amount: 1000, max_amount: 1000000 })

    await expect(bankService.update('bank-1', { max_amount: 500 }))
      .rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('bankService.toggleActive', () => {
  it('inverse le statut actif d\'une banque', async () => {
    prisma.bank.findUnique.mockResolvedValue({ id: 'bank-1', active: true })
    prisma.bank.update.mockResolvedValue({ id: 'bank-1', active: false })

    const bank = await bankService.toggleActive('bank-1')
    expect(bank.active).toBe(false)
  })

  it('lève une AppError 404 si la banque n\'existe pas', async () => {
    prisma.bank.findUnique.mockResolvedValue(null)

    await expect(bankService.toggleActive('inconnu')).rejects.toMatchObject({ statusCode: 404 })
  })
})
