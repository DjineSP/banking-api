// tests/integration/auth.test.js
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import { createUser } from '../helpers/factories.js'

describe('POST /api/auth/login', () => {
  it('connecte un utilisateur actif avec les bons identifiants', async () => {
    const user = await createUser({ login: 'djine', password: 'secret123' })

    const res = await request(app).post('/api/auth/login').send({ login: 'djine', password: 'secret123' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(typeof res.body.data.token).toBe('string')
    expect(res.body.data.user.id).toBe(user.id)
    expect(res.body.data.user.password).toBeUndefined()
  })

  it('refuse un mauvais mot de passe (401)', async () => {
    await createUser({ login: 'djine', password: 'secret123' })

    const res = await request(app).post('/api/auth/login').send({ login: 'djine', password: 'mauvais-mdp' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('refuse un utilisateur inactif (401)', async () => {
    await createUser({ login: 'djine', password: 'secret123', active: false })

    const res = await request(app).post('/api/auth/login').send({ login: 'djine', password: 'secret123' })

    expect(res.status).toBe(401)
  })

  it('refuse un login inconnu (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({ login: 'inconnu', password: 'secret123' })

    expect(res.status).toBe(401)
  })

  it('rejette un corps invalide (422)', async () => {
    const res = await request(app).post('/api/auth/login').send({ login: '' })

    expect(res.status).toBe(422)
  })
})

describe('PATCH /api/auth/me/password', () => {
  it('refuse une requête sans token (401)', async () => {
    const res = await request(app).patch('/api/auth/me/password').send({ oldPassword: 'a', newPassword: 'b' })

    expect(res.status).toBe(401)
  })

  it('change le mot de passe avec l\'ancien mot de passe correct', async () => {
    const user = await createUser({ login: 'djine', password: 'secret123' })
    const login = await request(app).post('/api/auth/login').send({ login: 'djine', password: 'secret123' })
    const token = login.body.data.token

    const res = await request(app)
      .patch('/api/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'secret123', newPassword: 'nouveau-mdp-123' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const newLogin = await request(app).post('/api/auth/login').send({ login: user.login, password: 'nouveau-mdp-123' })
    expect(newLogin.status).toBe(200)
  })

  it('refuse si l\'ancien mot de passe est incorrect (401)', async () => {
    await createUser({ login: 'djine', password: 'secret123' })
    const login = await request(app).post('/api/auth/login').send({ login: 'djine', password: 'secret123' })
    const token = login.body.data.token

    const res = await request(app)
      .patch('/api/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'faux-mdp', newPassword: 'nouveau-mdp-123' })

    expect(res.status).toBe(401)
  })
})
