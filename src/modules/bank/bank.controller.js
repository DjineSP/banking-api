import { bankService } from './bank.service.js'

export const bankController = {
  async findAll(req, res, next) {
    try {
      const banks = await bankService.findAll()
      res.status(200).json({ success: true, data: banks })
    } catch (err) {
      next(err)
    }
  },

  async findById(req, res, next) {
    try {
      const bank = await bankService.findById(req.params.id)
      res.status(200).json({ success: true, data: bank })
    } catch (err) {
      next(err)
    }
  },

  async create(req, res, next) {
    try {
      const bank = await bankService.create(req.body)
      res.status(201).json({ success: true, data: bank })
    } catch (err) {
      next(err)
    }
  },

  async update(req, res, next) {
    try {
      const bank = await bankService.update(req.params.id, req.body)
      res.status(200).json({ success: true, data: bank })
    } catch (err) {
      next(err)
    }
  },

  async toggleActive(req, res, next) {
    try {
      const bank = await bankService.toggleActive(req.params.id)
      res.status(200).json({ success: true, data: bank })
    } catch (err) {
      next(err)
    }
  },
}