// tests/integration/bank.test.js
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import { createUser, createBank, getAuthToken } from '../helpers/factories.js'

const asAdmin = async () => {
  const admin = await createUser({ role: 'ADMIN', login: 'admin', password: 'secret123' })
  const token = await getAuthToken({ login: admin.login, password: 'secret123' })
  return { admin, token }
}

const asClient = async () => {
  const client = await createUser({ role: 'CLIENT', login: 'client', password: 'secret123' })
  const token = await getAuthToken({ login: client.login, password: 'secret123' })
  return { client, token }
}

const validBankPayload = {
  code: 'SG', name: 'Société Générale', min_amount: 100, max_amount: 1000000,
  internal_fee_tx: 0.005, interbank_fee_tx: 0.01, withdraw_fee: 0.008,
}

describe('GET /api/banks', () => {
  it('refuse sans token (401)', async () => {
    const res = await request(app).get('/api/banks')
    expect(res.status).toBe(401)
  })

  it('liste toutes les banques, actives et inactives, pour un CLIENT ou un ADMIN (200)', async () => {
    const { token } = await asClient()
    await createBank({ active: true })
    await createBank({ active: false })

    const res = await request(app).get('/api/banks').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.some((b) => b.active)).toBe(true)
    expect(res.body.data.some((b) => !b.active)).toBe(true)
  })
})

describe('POST /api/banks', () => {
  it('refuse pour un CLIENT (403)', async () => {
    const { token } = await asClient()

    const res = await request(app).post('/api/banks').set('Authorization', `Bearer ${token}`).send(validBankPayload)
    expect(res.status).toBe(403)
  })

  it('crée une banque pour un ADMIN (201)', async () => {
    const { token } = await asAdmin()

    const res = await request(app).post('/api/banks').set('Authorization', `Bearer ${token}`).send(validBankPayload)

    expect(res.status).toBe(201)
    expect(res.body.data.code).toBe('SG')
  })

  it('refuse un code déjà utilisé (409)', async () => {
    const { token } = await asAdmin()
    await createBank({ code: 'SG' })

    const res = await request(app).post('/api/banks').set('Authorization', `Bearer ${token}`).send(validBankPayload)
    expect(res.status).toBe(409)
  })

  it('refuse min_amount >= max_amount (422)', async () => {
    const { token } = await asAdmin()

    const res = await request(app)
      .post('/api/banks')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validBankPayload, min_amount: 5000, max_amount: 1000 })

    expect(res.status).toBe(422)
  })
})

describe('GET /api/banks/:id', () => {
  it('retourne une banque existante (200)', async () => {
    const { token } = await asClient()
    const bank = await createBank()

    const res = await request(app).get(`/api/banks/${bank.id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })

  it('retourne 404 pour une banque inconnue', async () => {
    const { token } = await asClient()

    const res = await request(app)
      .get('/api/banks/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/banks/:id', () => {
  it('refuse pour un CLIENT (403)', async () => {
    const { token } = await asClient()
    const bank = await createBank()

    const res = await request(app)
      .patch(`/api/banks/${bank.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nouveau nom' })

    expect(res.status).toBe(403)
  })

  it('met à jour une banque pour un ADMIN (200)', async () => {
    const { token } = await asAdmin()
    const bank = await createBank()

    const res = await request(app)
      .patch(`/api/banks/${bank.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nouveau nom' })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Nouveau nom')
  })

  it('retourne 404 pour une banque inconnue', async () => {
    const { token } = await asAdmin()

    const res = await request(app)
      .patch('/api/banks/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' })

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/banks/:id/toggle', () => {
  it('active/désactive une banque pour un ADMIN', async () => {
    const { token } = await asAdmin()
    const bank = await createBank({ active: true })

    const res = await request(app).patch(`/api/banks/${bank.id}/toggle`).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.active).toBe(false)
  })

  it('retourne 404 pour une banque inconnue', async () => {
    const { token } = await asAdmin()

    const res = await request(app)
      .patch('/api/banks/00000000-0000-0000-0000-000000000000/toggle')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})
