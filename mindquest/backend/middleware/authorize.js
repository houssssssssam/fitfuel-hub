/**
 * Authorization middleware — ensures the authenticated user can only
 * access their own resources.
 *
 * Must be used AFTER the `protect` middleware (which sets req.userId from JWT).
 */
const authorizeOwner = (req, res, next) => {
  const paramUserId = req.params.userId;

  // If the route has no :userId param, skip (e.g. POST /api/chat)
  if (!paramUserId) return next();

  if (paramUserId !== req.userId) {
    return res.status(403).json({ message: "Forbidden: you can only access your own data" });
  }

  next();
};

module.exports = { authorizeOwner };
