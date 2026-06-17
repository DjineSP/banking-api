// tests/integration/user.test.js
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import { createUser, getAuthToken } from '../helpers/factories.js'

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

describe('POST /api/users', () => {
  it('refuse sans token (401)', async () => {
    const res = await request(app).post('/api/users').send({ login: 'x', password: 'secret123', email: 'x@test.com', fullname: 'X' })
    expect(res.status).toBe(401)
  })

  it('refuse pour un CLIENT (403)', async () => {
    const { token } = await asClient()

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ login: 'nouveau', password: 'secret123', email: 'nouveau@test.com', fullname: 'Nouveau' })

    expect(res.status).toBe(403)
  })

  it('crée un utilisateur pour un ADMIN (201) sans exposer le mot de passe', async () => {
    const { token } = await asAdmin()

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ login: 'nouveau', password: 'secret123', email: 'nouveau@test.com', fullname: 'Nouveau' })

    expect(res.status).toBe(201)
    expect(res.body.data.login).toBe('nouveau')
    expect(res.body.data.password).toBeUndefined()
  })

  it('refuse un login/email déjà utilisé (409)', async () => {
    const { admin, token } = await asAdmin()

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ login: admin.login, password: 'secret123', email: 'autre@test.com', fullname: 'X' })

    expect(res.status).toBe(409)
  })

  it('rejette un corps invalide (422)', async () => {
    const { token } = await asAdmin()

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ login: '', password: '123', email: 'pas-un-email', fullname: '' })

    expect(res.status).toBe(422)
  })
})

describe('GET /api/users', () => {
  it('refuse pour un CLIENT (403)', async () => {
    const { token } = await asClient()

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('liste les utilisateurs pour un ADMIN (200)', async () => {
    const { token } = await asAdmin()
    await createUser({ login: 'autre' })

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2)
  })
})

describe('GET /api/users/:id', () => {
  it('retourne un utilisateur existant (200)', async () => {
    const { token } = await asAdmin()
    const client = await createUser({ login: 'client-cible' })

    const res = await request(app).get(`/api/users/${client.id}`).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(client.id)
  })

  it('retourne 404 pour un id inconnu', async () => {
    const { token } = await asAdmin()

    const res = await request(app)
      .get('/api/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/users/:id', () => {
  it('met à jour un utilisateur (200)', async () => {
    const { token } = await asAdmin()
    const client = await createUser({ login: 'client-cible' })

    const res = await request(app)
      .patch(`/api/users/${client.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fullname: 'Nouveau Nom' })

    expect(res.status).toBe(200)
    expect(res.body.data.fullname).toBe('Nouveau Nom')
  })

  it('refuse un email déjà utilisé par un autre utilisateur (409)', async () => {
    const { token } = await asAdmin()
    const other = await createUser({ login: 'autre', email: 'autre@test.com' })
    const client = await createUser({ login: 'client-cible' })

    const res = await request(app)
      .patch(`/api/users/${client.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ email: other.email })

    expect(res.status).toBe(409)
  })
})

describe('PATCH /api/users/:id/toggle', () => {
  it('active/désactive un utilisateur', async () => {
    const { token } = await asAdmin()
    const client = await createUser({ login: 'client-cible', active: true })

    const res = await request(app).patch(`/api/users/${client.id}/toggle`).set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.active).toBe(false)
  })

  it('retourne 404 pour un id inconnu', async () => {
    const { token } = await asAdmin()

    const res = await request(app)
      .patch('/api/users/00000000-0000-0000-0000-000000000000/toggle')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/users/:id', () => {
  it('supprime un utilisateur (204) puis renvoie 404 sur ce même id', async () => {
    const { token } = await asAdmin()
    const client = await createUser({ login: 'client-cible' })

    const del = await request(app).delete(`/api/users/${client.id}`).set('Authorization', `Bearer ${token}`)
    expect(del.status).toBe(204)

    const get = await request(app).get(`/api/users/${client.id}`).set('Authorization', `Bearer ${token}`)
    expect(get.status).toBe(404)
  })

  it('retourne 404 pour un id inconnu', async () => {
    const { token } = await asAdmin()

    const res = await request(app)
      .delete('/api/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})
