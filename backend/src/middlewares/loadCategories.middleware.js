import db from '../config/db.js';

// Load top-level categories (parent_id IS NULL) and attach to res.locals
export default async function loadTopCategories(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT id, name, slug FROM categories WHERE parent_id IS NULL ORDER BY name ASC`,
      { raw: true }
    );
    res.locals.topCategories = rows || [];
  } catch (err) {
    console.warn('loadTopCategories failed:', err.message || err);
    res.locals.topCategories = [];
  }
  return next();
}
