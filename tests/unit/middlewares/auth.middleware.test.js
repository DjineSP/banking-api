// tests/unit/middlewares/auth.middleware.test.js
import { describe, it, expect, vi } from 'vitest'
import { authenticate } from '../../../src/middlewares/auth.middleware.js'
import { signToken } from '../../../src/utils/jwt.js'

describe('authenticate', () => {
  it('attache req.user et appelle next() sans argument pour un token valide', () => {
    const token = signToken({ id: 'user-1', role: 'ADMIN' })
    const req = { headers: { authorization: `Bearer ${token}` } }
    const next = vi.fn()

    authenticate(req, {}, next)

    expect(req.user.id).toBe('user-1')
    expect(next).toHaveBeenCalledWith()
  })

  it('appelle next(AppError 401) si le header Authorization est absent', () => {
    const req = { headers: {} }
    const next = vi.fn()

    authenticate(req, {}, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, message: 'Token manquant' }))
  })

  it('appelle next(AppError "Token invalide ou expiré") pour un token mal formé (erreur non opérationnelle)', () => {
    const req = { headers: { authorization: 'Bearer token.invalide.faux' } }
    const next = vi.fn()

    authenticate(req, {}, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401, message: 'Token invalide ou expiré' }))
  })
})
