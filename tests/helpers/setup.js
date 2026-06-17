// tests/helpers/setup.js
import { beforeAll, afterAll, afterEach } from 'vitest'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.test' })

let prisma

beforeAll(async () => {
  try {
    const mod = await import('../../src/config/prisma.js')
    await mod.default.$connect()
    prisma = mod.default
  } catch {
    // Tests unitaires (prisma mocké) : rien à connecter
    prisma = null
  }
})

afterEach(async () => {
  if (!prisma) return
  try {
    await prisma.transaction.deleteMany()
    await prisma.account.deleteMany()
    await prisma.user.deleteMany()
    await prisma.bank.deleteMany()
  } catch {
    // Tests unitaires (prisma mocké, méthodes non définies) : on ignore
  }
})

afterAll(async () => {
  if (!prisma) return
  try {
    await prisma.$disconnect()
  } catch {
    // ignore
  }
})
