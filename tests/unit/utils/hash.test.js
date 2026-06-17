// tests/unit/utils/hash.test.js
import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword } from '../../../src/utils/hash.js'

describe('hashPassword / comparePassword', () => {
  it('hash un mot de passe et le retrouve valide via comparePassword', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).not.toBe('secret123')

    const valid = await comparePassword('secret123', hash)
    expect(valid).toBe(true)
  })

  it('retourne false si le mot de passe ne correspond pas au hash', async () => {
    const hash = await hashPassword('secret123')
    const valid = await comparePassword('mauvais-mdp', hash)
    expect(valid).toBe(false)
  })

  it('génère des hash différents pour un même mot de passe (sel aléatoire)', async () => {
    const hash1 = await hashPassword('secret123')
    const hash2 = await hashPassword('secret123')
    expect(hash1).not.toBe(hash2)
  })
})
