/**
 * Global error handling middleware.
 * Catches all unhandled errors and returns a consistent JSON response.
 */
export function errorHandler(err, _req, res, _next) {
  console.error('\x1b[31m[ERROR]\x1b[0m', err.stack || err.message || err);

  const status = err.status || err.statusCode || 500;

  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An internal error occurred'
        : err.message || 'Unknown error',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}
