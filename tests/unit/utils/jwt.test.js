// tests/unit/utils/jwt.test.js
import { describe, it, expect, vi } from 'vitest'
import jsonwebtoken from 'jsonwebtoken'
import { signToken, verifyToken } from '../../../src/utils/jwt.js'

describe('signToken / verifyToken', () => {
  it('signe puis vérifie un token valide', () => {
    const token = signToken({ id: 'user-1', role: 'ADMIN' })
    expect(typeof token).toBe('string')

    const decoded = verifyToken(token)
    expect(decoded.id).toBe('user-1')
    expect(decoded.role).toBe('ADMIN')
  })

  it('lève une erreur si le token est invalide', () => {
    expect(() => verifyToken('token.invalide.faux')).toThrow()
  })

  it('lève une erreur si le token a expiré', () => {
    const expiredToken = jsonwebtoken.sign({ id: 'user-1' }, process.env.JWT_SECRET, { expiresIn: -10 })
    expect(() => verifyToken(expiredToken)).toThrow()
  })

  it('utilise "7d" par défaut si JWT_EXPIRES_IN n\'est pas défini', async () => {
    const original = process.env.JWT_EXPIRES_IN
    delete process.env.JWT_EXPIRES_IN
    vi.resetModules()

    const { signToken: signWithDefault } = await import('../../../src/utils/jwt.js')
    const token = signWithDefault({ id: 'user-1' })
    const decoded = jsonwebtoken.decode(token)
    const sevenDaysInSeconds = 7 * 24 * 60 * 60

    expect(decoded.exp - decoded.iat).toBe(sevenDaysInSeconds)

    process.env.JWT_EXPIRES_IN = original
    vi.resetModules()
  })
})
