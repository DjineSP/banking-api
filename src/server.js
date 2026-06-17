import 'dotenv/config'
import app from './app.js'
import prisma from './config/prisma.js'

const PORT = process.env.PORT || 3000

const start = async () => {
  try {
    await prisma.$connect()
    console.log('Base de données connectée')

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`)
      console.log(`Documentation sur http://localhost:${PORT}/api/docs`)
    })
  } catch (err) {
    console.error('Erreur au démarrage :', err)
    await prisma.$disconnect()
    process.exit(1)
  }
}

start()