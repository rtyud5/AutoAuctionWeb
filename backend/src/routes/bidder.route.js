const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth.middleware');

/**
 * GET /me
 * Tổng quan: profile + counts (watchlist, active bids, won)
 */
router.get('/me', auth, async (req, res) => {
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

    res.json({
      user: { id: user.id, username: user.username, email: user.email, is_blocked: !!user.is_blocked },
      counts: { watchlist: watchRes.cnt || 0, activeBids: activeBidsRes.cnt || 0, won: wonRes.cnt || 0 }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Watchlist
 */
router.get('/me/watchlist', auth, async (req, res) => {
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
    res.json({ watchlist: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/watchlist/:auctionId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const auctionId = req.params.auctionId;
    await db.query('INSERT IGNORE INTO watchlists (user_id, auction_id, created_at) VALUES (?, ?, NOW())', [
      userId,
      auctionId
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/watchlist/:auctionId/delete', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const auctionId = req.params.auctionId;
    await db.query('DELETE FROM watchlists WHERE user_id = ? AND auction_id = ?', [userId, auctionId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /auctions/:id/bid
 * - check login via auth middleware
 * - check user not blocked
 * - check auction active and bid amount valid
 * - insert bid, update auction current_price/highest_bidder and bids_count
 */
router.post('/auctions/:id/bid', auth, async (req, res) => {
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
    if (auction.end_time <= new Date()) {
      await conn.rollback();
      return res.status(400).json({ error: 'Auction already ended' });
    }
    // determine minimum increment
    const step = auction.bid_step || 0;
    const minAllowed = Number(auction.current_price || 0) + Number(step || 0);
    if (Number(amount) <= Number(auction.current_price || 0) || (step && Number(amount) < minAllowed)) {
      await conn.rollback();
      return res.status(400).json({ error: `Bid must be greater than current price${step ? ` by at least ${step}` : ''}` });
    }

    // insert bid
    await conn.query('INSERT INTO bids (auction_id, user_id, amount, created_at) VALUES (?, ?, ?, NOW())', [
      auctionId,
      userId,
      amount
    ]);

    // update auction
    await conn.query(
      'UPDATE auctions SET current_price = ?, highest_bidder = ?, bids_count = COALESCE(bids_count,0) + 1 WHERE id = ?',
      [amount, userId, auctionId]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

/**
 * POST /auctions/:id/auto-bid
 * Create or update auto bid rule for user on auction
 * Body: { max_amount: number }
 */
router.post('/auctions/:id/auto-bid', auth, async (req, res) => {
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

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /me/bids
 * Lịch sử ra giá của user
 */
router.get('/me/bids', auth, async (req, res) => {
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
    res.json({ bids: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /me/won
 * Các phiên đã thắng (link sang orders nếu có)
 */
router.get('/me/won', auth, async (req, res) => {
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
    res.json({ won: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /me/upgrade-request
 * Tạo upgrade_requests
 * Body: { message?: string }
 */
router.post('/me/upgrade-request', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const message = req.body.message || null;
    await db.query('INSERT INTO upgrade_requests (user_id, message, status, created_at) VALUES (?, ?, ?, NOW())', [
      userId,
      message,
      'pending'
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;