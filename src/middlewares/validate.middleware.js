import { validationResult } from 'express-validator'
import { AppError } from '../utils/apiError.js'

export const validate = (rules) => async (req, res, next) => {
  await Promise.all(rules.map((rule) => rule.run(req)))

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join(', ')
    return next(new AppError(message, 422))
  }
  next()
}