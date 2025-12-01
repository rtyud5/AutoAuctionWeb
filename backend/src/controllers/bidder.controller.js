import db from '../config/db.js';

/*
  Bidder controller — 1:1 map to routes in routes/bidder.route.js
  Functions mirror logic previously inline in route file.
*/

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [[user]] = await db.query('SELECT id, username, email, is_blocked FROM users WHERE id = ?', [userId]);

    const [[watchRes]] = await db.query('SELECT COUNT(*) AS cnt FROM watchlists WHERE user_id = ?', [userId]);
    const [[activeBidsRes]] = await db.query(
      `SELECT COUNT(DISTINCT b.auction_id) AS cnt
       FROM bids b
       JOIN auctions a ON a.id = b.auction_id
       WHERE b.user_id = ? AND a.end_time > NOW()`,
      [userId]
    );
    const [[wonRes]] = await db.query(
      `SELECT COUNT(*) AS cnt FROM auctions WHERE (winner_id = ? OR (end_time < NOW() AND highest_bidder = ?))`,
      [userId, userId]
    );

    return res.json({
      user: { id: user.id, username: user.username, email: user.email, is_blocked: !!user.is_blocked },
      counts: { watchlist: watchRes.cnt || 0, activeBids: activeBidsRes.cnt || 0, won: wonRes.cnt || 0 }
    });
  } catch (err) {
    console.error('bidder.getProfile', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const getWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT w.auction_id, a.title, a.current_price, a.end_time
       FROM watchlists w
       JOIN auctions a ON a.id = w.auction_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return res.json({ watchlist: rows });
  } catch (err) {
    console.error('bidder.getWatchlist', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const addToWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const auctionId = req.params.auctionId;
    await db.query('INSERT IGNORE INTO watchlists (user_id, auction_id, created_at) VALUES (?, ?, NOW())', [
      userId,
      auctionId
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error('bidder.addToWatchlist', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const removeFromWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const auctionId = req.params.auctionId;
    await db.query('DELETE FROM watchlists WHERE user_id = ? AND auction_id = ?', [userId, auctionId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('bidder.removeFromWatchlist', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const placeBid = async (req, res) => {
  const userId = req.user.id;
  const auctionId = req.params.id;
  const { amount } = req.body;

  if (!amount || isNaN(amount) || Number(amount) <= 0) return res.status(400).json({ error: 'Invalid amount' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[user]] = await conn.query('SELECT id, is_blocked FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (!user) {
      await conn.rollback();
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.is_blocked) {
      await conn.rollback();
      return res.status(403).json({ error: 'User is blocked' });
    }

    const [[auction]] = await conn.query('SELECT id, current_price, end_time, bid_step, status FROM auctions WHERE id = ? FOR UPDATE', [auctionId]);
    if (!auction) {
      await conn.rollback();
      return res.status(404).json({ error: 'Auction not found' });
    }
    if (new Date(auction.end_time) <= new Date()) {
      await conn.rollback();
      return res.status(400).json({ error: 'Auction already ended' });
    }

    const step = auction.bid_step || 0;
    const minAllowed = Number(auction.current_price || 0) + Number(step || 0);
    if (Number(amount) <= Number(auction.current_price || 0) || (step && Number(amount) < minAllowed)) {
      await conn.rollback();
      return res.status(400).json({ error: `Bid must be greater than current price${step ? ` by at least ${step}` : ''}` });
    }

    await conn.query('INSERT INTO bids (auction_id, user_id, amount, created_at) VALUES (?, ?, ?, NOW())', [
      auctionId,
      userId,
      amount
    ]);

    await conn.query(
      'UPDATE auctions SET current_price = ?, highest_bidder = ?, bids_count = COALESCE(bids_count,0) + 1 WHERE id = ?',
      [amount, userId, auctionId]
    );

    await conn.commit();
    return res.json({ success: true });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('bidder.placeBid', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
};

const setAutoBid = async (req, res) => {
  try {
    const userId = req.user.id;
    const auctionId = req.params.id;
    const maxAmount = Number(req.body.max_amount);
    if (!maxAmount || maxAmount <= 0) return res.status(400).json({ error: 'Invalid max_amount' });

    await db.query(
      `INSERT INTO auto_bid_rules (user_id, auction_id, max_amount, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE max_amount = VALUES(max_amount), updated_at = NOW()`,
      [userId, auctionId, maxAmount]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('bidder.setAutoBid', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const listBids = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT b.id, b.auction_id, b.amount, b.created_at, a.title
       FROM bids b
       JOIN auctions a ON a.id = b.auction_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return res.json({ bids: rows });
  } catch (err) {
    console.error('bidder.listBids', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const listWon = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT a.id AS auction_id, a.title, a.end_time, a.winner_id, o.id AS order_id
       FROM auctions a
       LEFT JOIN orders o ON o.auction_id = a.id
       WHERE (a.winner_id = ? OR (a.end_time < NOW() AND a.highest_bidder = ?))
       ORDER BY a.end_time DESC`,
      [userId, userId]
    );
    return res.json({ won: rows });
  } catch (err) {
    console.error('bidder.listWon', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const createUpgradeRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const message = req.body.message || null;
    await db.query('INSERT INTO upgrade_requests (user_id, message, status, created_at) VALUES (?, ?, ?, NOW())', [
      userId,
      message,
      'pending'
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error('bidder.createUpgradeRequest', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export default {
  getProfile,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  placeBid,
  setAutoBid,
  listBids,
  listWon,
  createUpgradeRequest
};