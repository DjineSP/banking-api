import { accountService } from './account.service.js'

export const accountController = {
  async findAll(req, res, next) {
    try {
      const accounts = await accountService.findAll()
      res.status(200).json({ success: true, data: accounts })
    } catch (err) {
      next(err)
    }
  },

  async findMine(req, res, next) {
    try {
      const accounts = await accountService.findMine(req.user.id)
      res.status(200).json({ success: true, data: accounts })
    } catch (err) {
      next(err)
    }
  },

  async findById(req, res, next) {
    try {
      // Un CLIENT ne peut voir que ses propres comptes
      const userId = req.user.role === 'CLIENT' ? req.user.id : null
      const account = await accountService.findById(req.params.id, userId)
      res.status(200).json({ success: true, data: account })
    } catch (err) {
      next(err)
    }
  },

  async findTransactions(req, res, next) {
    try {
      const userId = req.user.role === 'CLIENT' ? req.user.id : null
      const transactions = await accountService.findTransactions(req.params.id, userId)
      res.status(200).json({ success: true, data: transactions })
    } catch (err) {
      next(err)
    }
  },

  async create(req, res, next) {
    try {
      const account = await accountService.create(req.body, req.user.id, req.user.role)
      res.status(201).json({ success: true, data: account })
    } catch (err) {
      next(err)
    }
  },

  async close(req, res, next) {
    try {
      await accountService.close(req.params.id)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  },
}