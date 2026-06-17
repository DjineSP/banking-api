/**
 * Calcule les frais selon le type d'opération
 * @param {'internal'|'interbank'|'withdraw'} type
 * @param {number} amount
 * @param {object} bank  — objet Bank complet depuis Prisma
 * @returns {{ fee: number, netAmount: number }}
 */
export const calculateFee = (type, amount, bank) => {
  const rates = {
    internal: bank.internal_fee_tx,
    interbank: bank.interbank_fee_tx,
    withdraw: bank.withdraw_fee,
  }

  const rate = rates[type]
  if (rate === undefined) throw new Error(`Type de frais inconnu : ${type}`)

  const fee = parseFloat((amount * parseFloat(rate)).toFixed(2))
  const netAmount = parseFloat((amount + fee).toFixed(2))

  return { fee, netAmount }
}

/**
 * Détermine le type de frais selon les banques impliquées
 * @param {string} sourceBankId
 * @param {string} targetBankId
 * @returns {'internal'|'interbank'}
 */
export const resolveFeeType = (sourceBankId, targetBankId) =>
  sourceBankId === targetBankId ? 'internal' : 'interbank'