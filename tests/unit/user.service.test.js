// tests/unit/user.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/config/prisma.js', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import prisma from '../../src/config/prisma.js'
import { userService } from '../../src/modules/user/user.service.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('userService.create', () => {
  it('crée un utilisateur si login/email ne sont pas déjà utilisés', async () => {
    prisma.user.findFirst.mockResolvedValue(null)
    prisma.user.create.mockResolvedValue({ id: 'user-1', login: 'djine', role: 'CLIENT' })

    const user = await userService.create({
      login: 'djine', password: 'secret123', email: 'djine@test.com', fullname: 'Djine', role: 'CLIENT',
    })

    expect(user.id).toBe('user-1')
    const createArgs = prisma.user.create.mock.calls[0][0]
    expect(createArgs.data.password).not.toBe('secret123')
  })

  it('lève une AppError 409 si le login ou l\'email existe déjà', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'existing' })

    await expect(userService.create({
      login: 'djine', password: 'secret123', email: 'djine@test.com', fullname: 'Djine',
    })).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('userService.findAll', () => {
  it('retourne la liste des utilisateurs', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }])

    const users = await userService.findAll()
    expect(users).toHaveLength(2)
  })
})

describe('userService.findById', () => {
  it('retourne un utilisateur existant', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })

    const user = await userService.findById('user-1')
    expect(user.id).toBe('user-1')
  })

  it('lève une AppError 404 si l\'utilisateur n\'existe pas', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(userService.findById('inconnu')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('userService.update', () => {
  it('met à jour un utilisateur existant', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'user-1', email: 'old@test.com' })
      .mockResolvedValueOnce(null)
    prisma.user.update.mockResolvedValue({ id: 'user-1', email: 'new@test.com' })

    const user = await userService.update('user-1', { email: 'new@test.com' })
    expect(user.email).toBe('new@test.com')
  })

  it('lève une AppError 409 si le nouvel email appartient déjà à un autre utilisateur', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 'user-1', email: 'old@test.com' })
      .mockResolvedValueOnce({ id: 'user-2', email: 'new@test.com' })

    await expect(userService.update('user-1', { email: 'new@test.com' }))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it('lève une AppError 404 si l\'utilisateur à modifier n\'existe pas', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(userService.update('inconnu', { fullname: 'X' })).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('userService.toggleActive', () => {
  it('inverse le statut actif d\'un utilisateur', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', active: true })
    prisma.user.update.mockResolvedValue({ id: 'user-1', active: false })

    const user = await userService.toggleActive('user-1')
    expect(user.active).toBe(false)
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ active: false })
  })

  it('lève une AppError 404 si l\'utilisateur n\'existe pas', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(userService.toggleActive('inconnu')).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('userService.delete', () => {
  it('supprime un utilisateur existant', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
    prisma.user.delete.mockResolvedValue({})

    await userService.delete('user-1')
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } })
  })

  it('lève une AppError 404 si l\'utilisateur n\'existe pas', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(userService.delete('inconnu')).rejects.toMatchObject({ statusCode: 404 })
  })
})
