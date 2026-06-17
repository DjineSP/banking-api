import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

import { swaggerServe, swaggerSetup } from './config/swagger.js'
import { errorHandler } from './middlewares/error.middleware.js'

import authRoutes from './modules/auth/auth.routes.js'
import userRoutes from './modules/user/user.routes.js'
import bankRoutes from './modules/bank/bank.routes.js'
import accountRoutes from './modules/account/account.routes.js'
import transactionRoutes from './modules/transaction/transaction.routes.js'

const app = express()

// Sécurité & parsing
app.use(helmet())
app.use(cors())
app.use(express.json())

// Documentation
app.use('/api/docs', swaggerServe, swaggerSetup)

// Routes
app.use('/api/auth',         authRoutes)
app.use('/api/users',        userRoutes)
app.use('/api/banks',        bankRoutes)
app.use('/api/accounts',     accountRoutes)
app.use('/api/transactions', transactionRoutes)

// Route inconnue
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} introuvable` })
})

// Handler global d'erreurs — toujours en dernier
app.use(errorHandler)

export default app