// tests/unit/controllers.test.js
// Couvre les branches catch(err) -> next(err) des contrôleurs de listing pur
// (findAll/findMine), qui ne lèvent jamais d'erreur métier et ne sont donc
// jamais atteintes via les tests d'intégration HTTP.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/modules/account/account.service.js', () => ({
  accountService: { findAll: vi.fn(), findMine: vi.fn() },
}))
vi.mock('../../src/modules/bank/bank.service.js', () => ({
  bankService: { findAll: vi.fn() },
}))
vi.mock('../../src/modules/transaction/transaction.service.js', () => ({
  transactionService: { findAll: vi.fn() },
}))
vi.mock('../../src/modules/user/user.service.js', () => ({
  userService: { findAll: vi.fn() },
}))

import { accountController } from '../../src/modules/account/account.controller.js'
import { accountService } from '../../src/modules/account/account.service.js'
import { bankController } from '../../src/modules/bank/bank.controller.js'
import { bankService } from '../../src/modules/bank/bank.service.js'
import { transactionController } from '../../src/modules/transaction/transaction.controller.js'
import { transactionService } from '../../src/modules/transaction/transaction.service.js'
import { userController } from '../../src/modules/user/user.controller.js'
import { userService } from '../../src/modules/user/user.service.js'

const mockRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Catch génériques (erreur inattendue du service)', () => {
  it('accountController.findAll appelle next(err) si le service échoue', async () => {
    const error = new Error('boom')
    accountService.findAll.mockRejectedValue(error)
    const next = vi.fn()

    await accountController.findAll({}, mockRes(), next)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('accountController.findMine appelle next(err) si le service échoue', async () => {
    const error = new Error('boom')
    accountService.findMine.mockRejectedValue(error)
    const next = vi.fn()

    await accountController.findMine({ user: { id: 'u1' } }, mockRes(), next)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('bankController.findAll appelle next(err) si le service échoue', async () => {
    const error = new Error('boom')
    bankService.findAll.mockRejectedValue(error)
    const next = vi.fn()

    await bankController.findAll({}, mockRes(), next)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('transactionController.findAll appelle next(err) si le service échoue', async () => {
    const error = new Error('boom')
    transactionService.findAll.mockRejectedValue(error)
    const next = vi.fn()

    await transactionController.findAll({}, mockRes(), next)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('userController.findAll appelle next(err) si le service échoue', async () => {
    const error = new Error('boom')
    userService.findAll.mockRejectedValue(error)
    const next = vi.fn()

    await userController.findAll({}, mockRes(), next)
    expect(next).toHaveBeenCalledWith(error)
  })
})
