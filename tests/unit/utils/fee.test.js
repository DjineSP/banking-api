// tests/unit/utils/fee.test.js
import { describe, it, expect } from 'vitest'
import { calculateFee, resolveFeeType } from '../../../src/utils/fee.js'

const bank = {
  internal_fee_tx: 0.005,
  interbank_fee_tx: 0.01,
  withdraw_fee: 0.008,
}

describe('calculateFee', () => {
  it('calcule le frais et le montant net pour un virement interne', () => {
    const { fee, netAmount } = calculateFee('internal', 1000, bank)
    expect(fee).toBe(5)
    expect(netAmount).toBe(1005)
  })

  it('calcule le frais et le montant net pour un virement interbancaire', () => {
    const { fee, netAmount } = calculateFee('interbank', 1000, bank)
    expect(fee).toBe(10)
    expect(netAmount).toBe(1010)
  })

  it('calcule le frais et le montant net pour un retrait', () => {
    const { fee, netAmount } = calculateFee('withdraw', 1000, bank)
    expect(fee).toBe(8)
    expect(netAmount).toBe(1008)
  })

  it('arrondit le frais à 2 décimales', () => {
    const { fee } = calculateFee('internal', 333.33, bank)
    expect(fee).toBe(1.67)
  })

  it('lève une erreur si le type de frais est inconnu', () => {
    expect(() => calculateFee('inconnu', 1000, bank)).toThrow('Type de frais inconnu : inconnu')
  })
})

describe('resolveFeeType', () => {
  it('retourne "internal" si les deux banques sont identiques', () => {
    expect(resolveFeeType('bank-1', 'bank-1')).toBe('internal')
  })

  it('retourne "interbank" si les banques sont différentes', () => {
    expect(resolveFeeType('bank-1', 'bank-2')).toBe('interbank')
  })
})
