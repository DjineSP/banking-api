// tests/integration/transaction.test.js
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'crypto'
import request from 'supertest'
import app from '../../src/app.js'
import { createUser, createBank, createAccount, createTransaction, getAuthToken } from '../helpers/factories.js'

const asAdmin = async () => {
  const admin = await createUser({ role: 'ADMIN', login: 'admin', password: 'secret123' })
  const token = await getAuthToken({ login: admin.login, password: 'secret123' })
  return { admin, token }
}

const asClient = async (login = 'client') => {
  const client = await createUser({ role: 'CLIENT', login, password: 'secret123' })
  const token = await getAuthToken({ login: client.login, password: 'secret123' })
  return { client, token }
}

describe('POST /api/transactions/transfer', () => {
  it('refuse sans token (401)', async () => {
    const res = await request(app).post('/api/transactions/transfer').send({})
    expect(res.status).toBe(401)
  })

  it('effectue un virement et crée 2 transactions avec la même référence (201)', async () => {
    const { client, token } = await asClient('source')
    const target = await asClient('cible')
    const bank = await createBank({ min_amount: 100, max_amount: 1000000, internal_fee_tx: 0.005 })
    const sourceAccount = await createAccount({ userId: client.id, bankId: bank.id, balance: 10000 })
    const targetAccount = await createAccount({ userId: target.client.id, bankId: bank.id, balance: 0 })

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({ from_account_id: sourceAccount.id, to_account_number: targetAccount.account_number, amount: 1000 })

    expect(res.status).toBe(201)
    expect(res.body.data).toHaveLength(2)
    const [debit, credit] = res.body.data
    expect(debit.reference).toBe(credit.reference)
    expect(debit.type).toBe('DEBIT')
    expect(credit.type).toBe('CREDIT')
  })

  it('refuse si un CLIENT transfère depuis un compte qui ne lui appartient pas (403)', async () => {
    const { token } = await asClient('attaquant')
    const owner = await asClient('proprietaire')
    const bank = await createBank()
    const sourceAccount = await createAccount({ userId: owner.client.id, bankId: bank.id, balance: 10000 })
    const targetAccount = await createAccount({ userId: owner.client.id, bankId: bank.id, balance: 0 })

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({ from_account_id: sourceAccount.id, to_account_number: targetAccount.account_number, amount: 1000 })

    expect(res.status).toBe(403)
  })

  it('refuse un solde insuffisant (422)', async () => {
    const { client, token } = await asClient('source')
    const target = await asClient('cible')
    const bank = await createBank()
    const sourceAccount = await createAccount({ userId: client.id, bankId: bank.id, balance: 100 })
    const targetAccount = await createAccount({ userId: target.client.id, bankId: bank.id, balance: 0 })

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({ from_account_id: sourceAccount.id, to_account_number: targetAccount.account_number, amount: 100 })

    expect(res.status).toBe(422)
  })

  it('refuse un montant hors limites de la banque (422)', async () => {
    const { client, token } = await asClient('source')
    const target = await asClient('cible')
    const bank = await createBank({ min_amount: 500, max_amount: 1000 })
    const sourceAccount = await createAccount({ userId: client.id, bankId: bank.id, balance: 10000 })
    const targetAccount = await createAccount({ userId: target.client.id, bankId: bank.id, balance: 0 })

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({ from_account_id: sourceAccount.id, to_account_number: targetAccount.account_number, amount: 5000 })

    expect(res.status).toBe(422)
  })

  it('refuse un transfert vers le même compte (422)', async () => {
    const { client, token } = await asClient('source')
    const bank = await createBank()
    const account = await createAccount({ userId: client.id, bankId: bank.id, balance: 10000 })

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({ from_account_id: account.id, to_account_number: account.account_number, amount: 1000 })

    expect(res.status).toBe(422)
  })
})

describe('POST /api/transactions/deposit', () => {
  it('refuse pour un CLIENT (403, réservé ADMIN)', async () => {
    const { client, token } = await asClient()
    const bank = await createBank()
    const account = await createAccount({ userId: client.id, bankId: bank.id })

    const res = await request(app)
      .post('/api/transactions/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ account_id: account.id, amount: 5000 })

    expect(res.status).toBe(403)
  })

  it('un ADMIN dépose sur un compte (201) et le solde augmente', async () => {
    const { token } = await asAdmin()
    const client = await asClient()
    const bank = await createBank()
    const account = await createAccount({ userId: client.client.id, bankId: bank.id, balance: 0 })

    const res = await request(app)
      .post('/api/transactions/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ account_id: account.id, amount: 5000 })

    expect(res.status).toBe(201)
    expect(res.body.data.type).toBe('CREDIT')

    const check = await request(app)
      .get(`/api/accounts/${account.id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(parseFloat(check.body.data.balance)).toBe(5000)
  })

  it('retourne 404 si le compte est inconnu', async () => {
    const { token } = await asAdmin()

    const res = await request(app)
      .post('/api/transactions/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ account_id: '00000000-0000-0000-0000-000000000000', amount: 5000 })

    expect(res.status).toBe(404)
  })
})

describe('POST /api/transactions/withdraw', () => {
  it('un CLIENT retire de son propre compte (201)', async () => {
    const { client, token } = await asClient()
    const bank = await createBank({ withdraw_fee: 0.01 })
    const account = await createAccount({ userId: client.id, bankId: bank.id, balance: 10000 })

    const res = await request(app)
      .post('/api/transactions/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ account_id: account.id, amount: 1000 })

    expect(res.status).toBe(201)
    expect(res.body.data.type).toBe('DEBIT')
  })

  it('refuse si le CLIENT n\'est pas propriétaire du compte (403)', async () => {
    const { token } = await asClient('attaquant')
    const owner = await asClient('proprietaire')
    const bank = await createBank()
    const account = await createAccount({ userId: owner.client.id, bankId: bank.id, balance: 10000 })

    const res = await request(app)
      .post('/api/transactions/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ account_id: account.id, amount: 1000 })

    expect(res.status).toBe(403)
  })

  it('refuse un solde insuffisant après le frais (422)', async () => {
    const { client, token } = await asClient()
    const bank = await createBank()
    const account = await createAccount({ userId: client.id, bankId: bank.id, balance: 500 })

    const res = await request(app)
      .post('/api/transactions/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ account_id: account.id, amount: 500 })

    expect(res.status).toBe(422)
  })
})

describe('GET /api/transactions', () => {
  it('refuse pour un CLIENT (403)', async () => {
    const { token } = await asClient()

    const res = await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('liste toutes les transactions pour un ADMIN (200)', async () => {
    const { token } = await asAdmin()
    const client = await asClient()
    const bank = await createBank()
    const account = await createAccount({ userId: client.client.id, bankId: bank.id })
    await createTransaction({ accountId: account.id, bankId: bank.id })

    const res = await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /api/transactions/:id', () => {
  it('retourne une transaction existante (200)', async () => {
    const { token } = await asClient()
    const client = await asClient('proprietaire')
    const bank = await createBank()
    const account = await createAccount({ userId: client.client.id, bankId: bank.id })
    const transaction = await createTransaction({ accountId: account.id, bankId: bank.id })

    const res = await request(app).get(`/api/transactions/${transaction.id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('retourne 404 pour une transaction inconnue', async () => {
    const { token } = await asClient()

    const res = await request(app)
      .get('/api/transactions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})

describe('GET /api/transactions/ref/:reference', () => {
  it('retourne les 2 transactions liées à une référence (200)', async () => {
    const { token } = await asClient()
    const client = await asClient('proprietaire')
    const bank = await createBank()
    const account = await createAccount({ userId: client.client.id, bankId: bank.id })
    const reference = randomUUID()
    await createTransaction({ accountId: account.id, bankId: bank.id, reference, type: 'DEBIT' })
    await createTransaction({ accountId: account.id, bankId: bank.id, reference, type: 'CREDIT' })

    const res = await request(app)
      .get(`/api/transactions/ref/${reference}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
  })

  it('retourne 404 pour une référence inconnue', async () => {
    const { token } = await asClient()

    const res = await request(app)
      .get(`/api/transactions/ref/${randomUUID()}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})
