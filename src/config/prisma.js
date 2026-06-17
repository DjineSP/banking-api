import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'dev' ? ['query', 'warn', 'error'] : ['error'],
})

export default prisma