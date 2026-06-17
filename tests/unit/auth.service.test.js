// tests/unit/auth.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import prisma from '../../src/config/prisma.js'
import { authService } from '../../src/modules/auth/auth.service.js'
import { hashPassword } from '../../src/utils/hash.js'

describe('authService.login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('connecte un utilisateur actif avec les bons identifiants', async () => {
    const hashed = await hashPassword('secret123')
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      login: 'djine',
      email: 'djine@test.com',
      fullname: 'Djine Test',
      role: 'CLIENT',
      active: true,
      created_at: new Date(),
      password: hashed,
    })

    const result = await authService.login({ login: 'djine', password: 'secret123' })

    expect(typeof result.token).toBe('string')
    expect(result.user.password).toBeUndefined()
    expect(result.user.login).toBe('djine')
  })

  it("lève une AppError 401 si l'utilisateur n'existe pas", async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(authService.login({ login: 'inconnu', password: 'secret123' }))
      .rejects.toMatchObject({ statusCode: 401, message: 'Identifiants invalides' })
  })

  it("lève une AppError 401 si l'utilisateur est inactif", async () => {
    const hashed = await hashPassword('secret123')
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', active: false, password: hashed })

    await expect(authService.login({ login: 'djine', password: 'secret123' }))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('lève une AppError 401 si le mot de passe est incorrect', async () => {
    const hashed = await hashPassword('secret123')
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', active: true, password: hashed })

    await expect(authService.login({ login: 'djine', password: 'mauvais-mdp' }))
      .rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('authService.changePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('met à jour le mot de passe si l\'ancien est correct', async () => {
    const oldHashed = await hashPassword('ancien-mdp')
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: oldHashed })
    prisma.user.update.mockResolvedValue({})

    await authService.changePassword('user-1', { oldPassword: 'ancien-mdp', newPassword: 'nouveau-mdp' })

    expect(prisma.user.update).toHaveBeenCalledTimes(1)
    const callArgs = prisma.user.update.mock.calls[0][0]
    expect(callArgs.where).toEqual({ id: 'user-1' })
    expect(callArgs.data.password).not.toBe('nouveau-mdp')
  })

  it("lève une AppError 404 si l'utilisateur n'existe pas", async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(authService.changePassword('user-1', { oldPassword: 'x', newPassword: 'y' }))
      .rejects.toMatchObject({ statusCode: 404 })
  })

  it("lève une AppError 401 si l'ancien mot de passe est incorrect", async () => {
    const oldHashed = await hashPassword('ancien-mdp')
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: oldHashed })

    await expect(authService.changePassword('user-1', { oldPassword: 'faux', newPassword: 'nouveau-mdp' }))
      .rejects.toMatchObject({ statusCode: 401 })
  })
})
