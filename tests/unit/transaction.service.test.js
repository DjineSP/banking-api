// tests/unit/transaction.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/config/prisma.js', () => {
  const prismaMock = {
    account: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  }
  prismaMock.$transaction = vi.fn((callback) => callback(prismaMock))
  return { default: prismaMock }
})

import prisma from '../../src/config/prisma.js'
import { transactionService } from '../../src/modules/transaction/transaction.service.js'

const bankA = { id: 'bank-a', min_amount: 100, max_amount: 1000000, internal_fee_tx: 0.005, interbank_fee_tx: 0.01, withdraw_fee: 0.008 }
const bankB = { id: 'bank-b', min_amount: 100, max_amount: 1000000, internal_fee_tx: 0.005, interbank_fee_tx: 0.01, withdraw_fee: 0.008 }

beforeEach(() => {
  vi.clearAllMocks()
  prisma.transaction.create.mockImplementation(({ data }) => Promise.resolve({ id: `tx-${Math.random()}`, ...data }))
})

describe('transactionService.transfer', () => {
  const sourceAccount = { id: 'acc-source', user_id: 'client-1', account_number: 'ACC-SRC', balance: 10000, bank_id: 'bank-a', bank: bankA }
  const targetAccount = { id: 'acc-target', user_id: 'client-2', account_number: 'ACC-TGT', balance: 0, bank_id: 'bank-a', bank: bankA }

  const mockAccounts = (source = sourceAccount, target = targetAccount) => {
    prisma.account.findUnique.mockImplementation(({ where }) => {
      if (where.id) return Promise.resolve(where.id === source.id ? source : null)
      if (where.account_number) return Promise.resolve(where.account_number === target.account_number ? target : null)
      return Promise.resolve(null)
    })
  }

  it('crée 2 transactions liées par la même référence (DEBIT + CREDIT)', async () => {
    mockAccounts()

    const [debit, credit] = await transactionService.transfer(
      { from_account_id: 'acc-source', to_account_number: 'ACC-TGT', amount: 1000 },
      'client-1', 'CLIENT',
    )

    expect(debit.reference).toBe(credit.reference)
    expect(debit.type).toBe('DEBIT')
    expect(credit.type).toBe('CREDIT')
    expect(debit.fee).toBeGreaterThan(0)
    expect(credit.fee).toBe(0)
  })

  it('calcule le frais interne quand les comptes partagent la même banque', async () => {
    mockAccounts()

    const [debit] = await transactionService.transfer(
      { from_account_id: 'acc-source', to_account_number: 'ACC-TGT', amount: 1000 },
      'client-1', 'CLIENT',
    )

    expect(debit.fee).toBe(5)
  })

  it('calcule le frais interbancaire quand les banques diffèrent', async () => {
    const target = { ...targetAccount, bank_id: 'bank-b', bank: bankB }
    mockAccounts(sourceAccount, target)

    const [debit] = await transactionService.transfer(
      { from_account_id: 'acc-source', to_account_number: 'ACC-TGT', amount: 1000 },
      'client-1', 'CLIENT',
    )

    expect(debit.fee).toBe(10)
  })

  it('lève une AppError 404 si le compte source est introuvable', async () => {
    prisma.account.findUnique.mockResolvedValue(null)

    await expect(transactionService.transfer(
      { from_account_id: 'inconnu', to_account_number: 'ACC-TGT', amount: 1000 },
      'client-1', 'CLIENT',
    )).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lève une AppError 404 si le compte cible est introuvable', async () => {
    prisma.account.findUnique.mockImplementation(({ where }) => {
      if (where.id) return Promise.resolve(sourceAccount)
      return Promise.resolve(null)
    })

    await expect(transactionService.transfer(
      { from_account_id: 'acc-source', to_account_number: 'INCONNU', amount: 1000 },
      'client-1', 'CLIENT',
    )).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lève une AppError 403 si un CLIENT transfère depuis un compte qui ne lui appartient pas', async () => {
    mockAccounts()

    await expect(transactionService.transfer(
      { from_account_id: 'acc-source', to_account_number: 'ACC-TGT', amount: 1000 },
      'autre-client', 'CLIENT',
    )).rejects.toMatchObject({ statusCode: 403 })
  })

  it('lève une AppError 422 si la source et la cible sont le même compte', async () => {
    const sameAccount = { ...sourceAccount, account_number: 'ACC-SRC' }
    mockAccounts(sameAccount, sameAccount)

    await expect(transactionService.transfer(
      { from_account_id: 'acc-source', to_account_number: 'ACC-SRC', amount: 1000 },
      'client-1', 'CLIENT',
    )).rejects.toMatchObject({ statusCode: 422 })
  })

  it('lève une AppError 422 si le montant est inférieur au minimum de la banque', async () => {
    mockAccounts()

    await expect(transactionService.transfer(
      { from_account_id: 'acc-source', to_account_number: 'ACC-TGT', amount: 10 },
      'client-1', 'CLIENT',
    )).rejects.toMatchObject({ statusCode: 422 })
  })

  it('lève une AppError 422 si le montant dépasse le maximum de la banque', async () => {
    mockAccounts()

    await expect(transactionService.transfer(
      { from_account_id: 'acc-source', to_account_number: 'ACC-TGT', amount: 9999999 },
      'client-1', 'CLIENT',
    )).rejects.toMatchObject({ statusCode: 422 })
  })

  it('lève une AppError 422 si le solde est insuffisant (frais compris)', async () => {
    const poorSource = { ...sourceAccount, balance: 500 }
    mockAccounts(poorSource)

    await expect(transactionService.transfer(
      { from_account_id: 'acc-source', to_account_number: 'ACC-TGT', amount: 500 },
      'client-1', 'CLIENT',
    )).rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('transactionService.deposit', () => {
  it('crée une transaction CREDIT sans frais', async () => {
    prisma.account.findUnique.mockResolvedValue({ id: 'acc-1', bank_id: 'bank-a' })

    const transaction = await transactionService.deposit({ account_id: 'acc-1', amount: 5000 })

    expect(transaction.type).toBe('CREDIT')
    expect(transaction.fee).toBe(0)
    expect(transaction.net_amount).toBe(5000)
    expect(prisma.account.update.mock.calls[0][0].data).toEqual({ balance: { increment: 5000 } })
  })

  it('lève une AppError 404 si le compte n\'existe pas', async () => {
    prisma.account.findUnique.mockResolvedValue(null)

    await expect(transactionService.deposit({ account_id: 'inconnu', amount: 5000 }))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('transactionService.withdraw', () => {
  const account = { id: 'acc-1', user_id: 'client-1', balance: 10000, bank_id: 'bank-a', bank: bankA }

  it('crée une transaction DEBIT avec le frais de retrait', async () => {
    prisma.account.findUnique.mockResolvedValue(account)

    const transaction = await transactionService.withdraw({ account_id: 'acc-1', amount: 1000 }, 'client-1', 'CLIENT')

    expect(transaction.type).toBe('DEBIT')
    expect(transaction.fee).toBe(8)
    expect(transaction.net_amount).toBe(1008)
  })

  it('lève une AppError 404 si le compte n\'existe pas', async () => {
    prisma.account.findUnique.mockResolvedValue(null)

    await expect(transactionService.withdraw({ account_id: 'inconnu', amount: 1000 }, 'client-1', 'CLIENT'))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it('lève une AppError 403 si un CLIENT retire d\'un compte qui ne lui appartient pas', async () => {
    prisma.account.findUnique.mockResolvedValue(account)

    await expect(transactionService.withdraw({ account_id: 'acc-1', amount: 1000 }, 'autre-client', 'CLIENT'))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  it('lève une AppError 422 si le solde est insuffisant après le frais', async () => {
    prisma.account.findUnique.mockResolvedValue({ ...account, balance: 500 })

    await expect(transactionService.withdraw({ account_id: 'acc-1', amount: 500 }, 'client-1', 'CLIENT'))
      .rejects.toMatchObject({ statusCode: 422 })
  })

  it('lève une AppError 422 si le montant est inférieur au minimum de la banque', async () => {
    prisma.account.findUnique.mockResolvedValue(account)

    await expect(transactionService.withdraw({ account_id: 'acc-1', amount: 10 }, 'client-1', 'CLIENT'))
      .rejects.toMatchObject({ statusCode: 422 })
  })

  it('lève une AppError 422 si le montant dépasse le maximum de la banque', async () => {
    prisma.account.findUnique.mockResolvedValue(account)

    await expect(transactionService.withdraw({ account_id: 'acc-1', amount: 9999999 }, 'client-1', 'CLIENT'))
      .rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('transactionService.findAll', () => {
  it('retourne toutes les transactions', async () => {
    prisma.transaction.findMany.mockResolvedValue([{ id: 'tx-1' }])

    const transactions = await transactionService.findAll()
    expect(transactions).toHaveLength(1)
  })
})

describe('transactionService.findById', () => {
  it('retourne une transaction existante', async () => {
    prisma.transaction.findUnique.mockResolvedValue({ id: 'tx-1' })

    const transaction = await transactionService.findById('tx-1')
    expect(transaction.id).toBe('tx-1')
  })

  it('lève une AppError 404 si la transaction n\'existe pas', async () => {
    prisma.transaction.findUnique.mockResolvedValue(null)

    await expect(transactionService.findById('inconnu')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('transactionService.findByReference', () => {
  it('retourne les 2 transactions liées à une référence', async () => {
    prisma.transaction.findMany.mockResolvedValue([{ id: 'tx-1' }, { id: 'tx-2' }])

    const transactions = await transactionService.findByReference('ref-1')
    expect(transactions).toHaveLength(2)
  })

  it('lève une AppError 404 si la référence est introuvable', async () => {
    prisma.transaction.findMany.mockResolvedValue([])

    await expect(transactionService.findByReference('inconnue')).rejects.toMatchObject({ statusCode: 404 })
  })
})
