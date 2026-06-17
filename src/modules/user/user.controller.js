import { userService } from './user.service.js'

export const userController = {
  async create(req, res, next) {
    try {
      const user = await userService.create(req.body)
      res.status(201).json({ success: true, data: user })
    } catch (err) {
      next(err)
    }
  },

  async findAll(req, res, next) {
    try {
      const users = await userService.findAll()
      res.status(200).json({ success: true, data: users })
    } catch (err) {
      next(err)
    }
  },

  async findById(req, res, next) {
    try {
      const user = await userService.findById(req.params.id)
      res.status(200).json({ success: true, data: user })
    } catch (err) {
      next(err)
    }
  },

  async update(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.body)
      res.status(200).json({ success: true, data: user })
    } catch (err) {
      next(err)
    }
  },

  async toggleActive(req, res, next) {
    try {
      const user = await userService.toggleActive(req.params.id)
      res.status(200).json({ success: true, data: user })
    } catch (err) {
      next(err)
    }
  },

  async delete(req, res, next) {
    try {
      await userService.delete(req.params.id)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  },
}