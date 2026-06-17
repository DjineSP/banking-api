// tests/integration/account.test.js
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import { createUser, createBank, createAccount, getAuthToken } from '../helpers/factories.js'

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

describe('POST /api/accounts', () => {
  it('refuse sans token (401)', async () => {
    const res = await request(app).post('/api/accounts').send({})
    expect(res.status).toBe(401)
  })

  it('un CLIENT ouvre un compte pour lui-même (201)', async () => {
    const { client, token } = await asClient()
    const bank = await createBank()

    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ bank_id: bank.id })

    expect(res.status).toBe(201)
    expect(res.body.data.account_number).toMatch(/^ACC-/)
  })

  it('un CLIENT ne peut pas ouvrir un compte pour un autre user (le user_id fourni est ignoré)', async () => {
    const { client, token } = await asClient()
    const other = await createUser({ login: 'autre' })
    const bank = await createBank()

    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ bank_id: bank.id, user_id: other.id })

    expect(res.status).toBe(201)
    expect(res.body.data.user_id).toBe(client.id)
  })

  it('un ADMIN ouvre un compte pour un autre user (201)', async () => {
    const { token } = await asAdmin()
    const other = await createUser({ login: 'beneficiaire' })
    const bank = await createBank()

    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ bank_id: bank.id, user_id: other.id })

    expect(res.status).toBe(201)
  })

  it('refuse une banque inconnue (404)', async () => {
    const { token } = await asClient()

    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ bank_id: '00000000-0000-0000-0000-000000000000' })

    expect(res.status).toBe(404)
  })
})

describe('GET /api/accounts/mine', () => {
  it('retourne uniquement les comptes du user connecté', async () => {
    const { client, token } = await asClient()
    const other = await asClient('autre-client')
    const bank = await createBank()
    await createAccount({ userId: client.id, bankId: bank.id })
    await createAccount({ userId: other.client.id, bankId: bank.id })

    const res = await request(app).get('/api/accounts/mine').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].user_id).toBe(client.id)
  })
})

describe('GET /api/accounts', () => {
  it('refuse pour un CLIENT (403)', async () => {
    const { token } = await asClient()

    const res = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('liste tous les comptes pour un ADMIN (200)', async () => {
    const { token } = await asAdmin()
    const client = await asClient()
    const bank = await createBank()
    await createAccount({ userId: client.client.id, bankId: bank.id })

    const res = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /api/accounts/:id', () => {
  it('un CLIENT peut voir son propre compte (200)', async () => {
    const { client, token } = await asClient()
    const bank = await createBank()
    const account = await createAccount({ userId: client.id, bankId: bank.id })

    const res = await request(app).get(`/api/accounts/${account.id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('un CLIENT ne peut pas voir le compte d\'un autre (404)', async () => {
    const { token } = await asClient('client-a')
    const other = await asClient('client-b')
    const bank = await createBank()
    const account = await createAccount({ userId: other.client.id, bankId: bank.id })

    const res = await request(app).get(`/api/accounts/${account.id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })

  it('un ADMIN peut voir n\'importe quel compte (200)', async () => {
    const { token } = await asAdmin()
    const client = await asClient()
    const bank = await createBank()
    const account = await createAccount({ userId: client.client.id, bankId: bank.id })

    const res = await request(app).get(`/api/accounts/${account.id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })
})

describe('GET /api/accounts/:id/transactions', () => {
  it('retourne l\'historique des transactions du compte (200)', async () => {
    const { client, token } = await asClient()
    const bank = await createBank()
    const account = await createAccount({ userId: client.id, bankId: bank.id })

    const res = await request(app)
      .get(`/api/accounts/${account.id}/transactions`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

  it('retourne 404 si le compte n\'appartient pas au CLIENT', async () => {
    const { token } = await asClient('client-a')
    const other = await asClient('client-b')
    const bank = await createBank()
    const account = await createAccount({ userId: other.client.id, bankId: bank.id })

    const res = await request(app)
      .get(`/api/accounts/${account.id}/transactions`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

  it('un ADMIN peut voir l\'historique de n\'importe quel compte (200)', async () => {
    const { token } = await asAdmin()
    const client = await asClient()
    const bank = await createBank()
    const account = await createAccount({ userId: client.client.id, bankId: bank.id })

    const res = await request(app)
      .get(`/api/accounts/${account.id}/transactions`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/accounts/:id/close', () => {
  it('refuse pour un CLIENT (403, réservé ADMIN)', async () => {
    const { client, token } = await asClient()
    const bank = await createBank()
    const account = await createAccount({ userId: client.id, bankId: bank.id, balance: 0 })

    const res = await request(app).patch(`/api/accounts/${account.id}/close`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('un ADMIN ferme un compte au solde nul (204)', async () => {
    const { token } = await asAdmin()
    const client = await asClient()
    const bank = await createBank()
    const account = await createAccount({ userId: client.client.id, bankId: bank.id, balance: 0 })

    const res = await request(app).patch(`/api/accounts/${account.id}/close`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)
  })

  it('refuse de fermer un compte au solde positif (422)', async () => {
    const { token } = await asAdmin()
    const client = await asClient()
    const bank = await createBank()
    const account = await createAccount({ userId: client.client.id, bankId: bank.id, balance: 5000 })

    const res = await request(app).patch(`/api/accounts/${account.id}/close`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(422)
  })
})
