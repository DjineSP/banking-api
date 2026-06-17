// tests/unit/middlewares/error.middleware.test.js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { errorHandler } from '../../../src/middlewares/error.middleware.js'
import { AppError } from '../../../src/utils/apiError.js'

const mockRes = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
})

describe('errorHandler', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('log l\'erreur et inclut la stack en mode dev', () => {
    process.env.NODE_ENV = 'dev'
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = mockRes()
    const err = new AppError('Erreur test', 400)

    errorHandler(err, {}, res, vi.fn())

    expect(spy).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].stack).toBeDefined()
    spy.mockRestore()
  })

  it('masque le message et n\'inclut pas la stack pour une erreur non opérationnelle hors mode dev', () => {
    process.env.NODE_ENV = 'test'
    const res = mockRes()
    const err = new Error('Erreur interne cachée')

    errorHandler(err, {}, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json.mock.calls[0][0].message).toBe('Erreur interne du serveur')
    expect(res.json.mock.calls[0][0].stack).toBeUndefined()
  })
})
