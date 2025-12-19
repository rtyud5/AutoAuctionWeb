import db from '../config/db.js';

export default async function reputationMiddleware(req, res, next) {
  let reputation = null;
  if (req.user && req.user.id) {
    try {
      const [[userRow]] = await db.query(
        `SELECT positive_count, negative_count FROM users WHERE id = ? LIMIT 1`,
        { replacements: [req.user.id], raw: true }
      );
      reputation = 10 + (userRow?.positive_count || 0) - (userRow?.negative_count || 0);
    } catch (e) {
      reputation = 10;
    }
  }
  res.locals.reputation = reputation;
  next();
}