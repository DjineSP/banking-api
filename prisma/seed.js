import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const existing = await prisma.user.findUnique({ where: { login: 'admin' } })

  if (existing) {
    console.log('Admin déjà existant - seed ignoré')
    return
  }

  const password = await bcrypt.hash('Admin123!@#', 10)

  const admin = await prisma.user.create({
    data: {
      login: 'admin',
      password,
      email: 'admin@banking.com',
      fullname: 'Super Admin',
      role: 'ADMIN',
      active: true,
    },
  })

  console.log('Admin créé :', admin.login, '|', admin.email)
}

main()
  .catch((err) => {
    console.error('Erreur seed :', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())