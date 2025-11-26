/**
 * Global error and 404 handlers
 * - export named `errorHandler` and `notFoundHandler`
 * - default export is `errorHandler` for compatibility
 */

export const errorHandler = (err, req, res, _next) => {
  console.error(err);

  const wantsJson = req.xhr || req.path.startsWith('/api') || req.headers.accept?.includes('application/json');
  const isDev = process.env.NODE_ENV !== 'production';

  const payload = {
    success: false,
    message: err?.message || 'Internal server error'
  };

  if (isDev && err?.stack) payload.stack = err.stack;

  if (wantsJson) {
    return res.status(err?.status || 500).json(payload);
  }

  res.status(err?.status || 500).render('error/500', {
    title: 'Server error',
    message: payload.message,
    stack: isDev ? err?.stack : undefined
  });
};

export default errorHandler;