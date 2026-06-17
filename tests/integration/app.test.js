// tests/integration/app.test.js
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'

describe('Route inconnue', () => {
  it('retourne 404 avec un message explicite', async () => {
    const res = await request(app).get('/api/route-inexistante')

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toContain('introuvable')
  })
})
