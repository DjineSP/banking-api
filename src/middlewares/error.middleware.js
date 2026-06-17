export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const message = err.isOperational ? err.message : 'Erreur interne du serveur'

  if (process.env.NODE_ENV === 'dev') {
    console.error(`[${err.statusCode}] ${err.message}\n`, err.stack)
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'dev' && { stack: err.stack }),
  })
}