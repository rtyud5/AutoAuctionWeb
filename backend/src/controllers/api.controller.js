import db from '../config/db.js';

const listAuctions = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const sort = req.query.sort || 'ending_soon';

    const sortMap = {
      price_asc: 'a.current_price ASC',
      price_desc: 'a.current_price DESC',
      ending_soon: 'a.end_time ASC',
      bids_desc: 'COALESCE(a.bids_count, b.cnt) DESC'
    };
    const orderBy = sortMap[sort] || sortMap.ending_soon;

    let where = ['1=1'];
    const params = [];

    if (q) {
      where.push('(a.title LIKE ? OR a.description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    if (req.query.category) {
      const [[cat]] = await db.query('SELECT id FROM categories WHERE slug = ? LIMIT 1', [req.query.category]);
      if (cat) {
        const [childCats] = await db.query('SELECT id FROM categories WHERE parent_id = ?', [cat.id]);
        const catIds = [cat.id, ...childCats.map(c => c.id)];
        where.push(`a.category_id IN (${catIds.map(() => '?').join(',')})`);
        params.push(...catIds);
      } else {
        return res.json({ success: true, data: [], pagination: { page, limit, total: 0 } });
      }
    }

    const whereSQL = 'WHERE ' + where.join(' AND ');

    const [[countRow]] = await db.query(
      `SELECT COUNT(*) AS cnt
       FROM auctions a
       LEFT JOIN (SELECT auction_id, COUNT(*) AS cnt FROM bids GROUP BY auction_id) b ON b.auction_id = a.id
       ${whereSQL}`,
      params
    );
    const total = countRow?.cnt || 0;

    const [rows] = await db.query(
      `SELECT a.id, a.title, a.current_price, a.starting_price, a.end_time, COALESCE(a.bids_count, b.cnt) AS bids_count
       FROM auctions a
       LEFT JOIN (SELECT auction_id, COUNT(*) AS cnt FROM bids GROUP BY auction_id) b ON b.auction_id = a.id
       ${whereSQL}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({ success: true, data: rows, pagination: { page, limit, total } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getAuction = async (req, res) => {
  try {
    const id = req.params.id;
    const [[auction]] = await db.query(
      'SELECT a.*, u.id AS seller_id, u.username AS seller_name FROM auctions a LEFT JOIN users u ON u.id = a.seller_id WHERE a.id = ? LIMIT 1',
      [id]
    );
    if (!auction) return res.status(404).json({ success: false, message: 'Not found' });

    const [bids] = await db.query(
      'SELECT b.id, b.user_id, b.amount, b.created_at, u.username FROM bids b LEFT JOIN users u ON u.id = b.user_id WHERE b.auction_id = ? ORDER BY b.created_at DESC LIMIT 50',
      [id]
    );

    const [qas] = await db.query(
      'SELECT q.id, q.user_id, q.question, q.answer, q.created_at, u.username FROM qna q LEFT JOIN users u ON u.id = q.user_id WHERE q.auction_id = ? ORDER BY q.created_at DESC LIMIT 50',
      [id]
    );

    const [[ratingRow]] = await db.query(
      'SELECT AVG(r.rating) AS avg_rating, COUNT(*) AS total_ratings FROM ratings r WHERE r.seller_id = ?',
      [auction.seller_id]
    );

    return res.json({
      success: true,
      data: {
        auction,
        bids,
        qas,
        sellerRating: { avg: Number(ratingRow?.avg_rating || 0).toFixed(2), count: ratingRow?.total_ratings || 0 }
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const listCategories = async (req, res) => {
  try {
    const [cats] = await db.query('SELECT id, name, slug, parent_id FROM categories ORDER BY parent_id, id');
    const map = {};
    cats.forEach(c => (map[c.id] = { ...c, children: [] }));
    const roots = [];
    cats.forEach(c => {
      if (c.parent_id && map[c.parent_id]) map[c.parent_id].children.push(map[c.id]);
      else roots.push(map[c.id]);
    });
    return res.json({ success: true, data: roots });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const listAuctionsByCategory = async (req, res) => {
  try {
    const slug = req.params.slug;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const sort = req.query.sort || 'ending_soon';

    const sortMap = {
      price_asc: 'a.current_price ASC',
      price_desc: 'a.current_price DESC',
      ending_soon: 'a.end_time ASC',
      bids_desc: 'COALESCE(a.bids_count, b.cnt) DESC'
    };
    const orderBy = sortMap[sort] || sortMap.ending_soon;

    const [[category]] = await db.query('SELECT id, name FROM categories WHERE slug = ? LIMIT 1', [slug]);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    const [childCats] = await db.query('SELECT id FROM categories WHERE parent_id = ?', [category.id]);
    const catIds = [category.id, ...childCats.map(c => c.id)];
    const placeholders = catIds.map(() => '?').join(',');

    const [[countRow]] = await db.query(`SELECT COUNT(*) AS cnt FROM auctions WHERE category_id IN (${placeholders})`, catIds);
    const total = countRow?.cnt || 0;

    const [rows] = await db.query(
      `SELECT a.id, a.title, a.current_price, a.end_time, COALESCE(a.bids_count, b.cnt) AS bids_count
       FROM auctions a
       LEFT JOIN (SELECT auction_id, COUNT(*) AS cnt FROM bids GROUP BY auction_id) b ON b.auction_id = a.id
       WHERE a.category_id IN (${placeholders})
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...catIds, limit, offset]
    );

    return res.json({ success: true, data: rows, pagination: { page, limit, total } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const search = async (req, res) => {
  // reuse listAuctions logic
  return listAuctions(req, res);
};

export default {
  listAuctions,
  getAuction,
  listCategories,
  listAuctionsByCategory,
  search
};