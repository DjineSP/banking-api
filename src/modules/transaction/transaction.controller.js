import { transactionService } from './transaction.service.js'

export const transactionController = {
  async transfer(req, res, next) {
    try {
      const transactions = await transactionService.transfer(req.body, req.user.id, req.user.role)
      res.status(201).json({ success: true, data: transactions })
    } catch (err) {
      next(err)
    }
  },

  async deposit(req, res, next) {
    try {
      const transaction = await transactionService.deposit(req.body)
      res.status(201).json({ success: true, data: transaction })
    } catch (err) {
      next(err)
    }
  },

  async withdraw(req, res, next) {
    try {
      const transaction = await transactionService.withdraw(req.body, req.user.id, req.user.role)
      res.status(201).json({ success: true, data: transaction })
    } catch (err) {
      next(err)
    }
  },

  async findAll(req, res, next) {
    try {
      const transactions = await transactionService.findAll()
      res.status(200).json({ success: true, data: transactions })
    } catch (err) {
      next(err)
    }
  },

  async findById(req, res, next) {
    try {
      const transaction = await transactionService.findById(req.params.id)
      res.status(200).json({ success: true, data: transaction })
    } catch (err) {
      next(err)
    }
  },

  async findByReference(req, res, next) {
    try {
      const transactions = await transactionService.findByReference(req.params.reference)
      res.status(200).json({ success: true, data: transactions })
    } catch (err) {
      next(err)
    }
  },
}