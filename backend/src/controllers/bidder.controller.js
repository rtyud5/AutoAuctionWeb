import db from '../config/db.js';

import Auction from '../models/auction.model.js';
import Bid from '../models/bid.model.js';
import AutoBidRule from '../models/autoBidRule.model.js';
import BlockedBidder from '../models/blocked_bidder.js';
import Order from '../models/order.model.js';
import UpgradeRequest from '../models/upgradeRequest.model.js';

import { runAutoBidEngine } from '../services/autoBid.service.js';

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Giá mua ngay hiện tại (theo UI đang hiển thị ở trang chi tiết)
// NOTE: Dự án chưa có cột buy_now_price trong DB, nên dùng công thức nhất quán.
const calcBuyNowPrice = (auction) => {
  const base = toNum(auction?.current_price || auction?.start_price || 0);
  return Math.floor(base * 1.5);
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const [rows] = await db.query(
      'SELECT id, name, email, role, is_blocked FROM users WHERE id = ? LIMIT 1',
      { replacements: [userId], raw: true }
    );
    const user = rows?.[0];

    return res.json({ success: true, user: user || null });
  } catch (err) {
    console.error('bidder.getProfile', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getWatchlist = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const [rows] = await db.query(
      `SELECT w.auction_id, a.current_price, a.end_time, p.title, p.thumbnail
       FROM watchlists w
       JOIN auctions a ON a.id = w.auction_id
       JOIN products p ON p.id = a.product_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      { replacements: [userId], raw: true }
    );
    return res.json({ success: true, watchlist: rows || [] });
  } catch (err) {
    console.error('bidder.getWatchlist', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addToWatchlist = async (req, res) => {
  try {
    const userId = req.user?.id;
    const auctionId = Number(req.params.auctionId);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!Number.isFinite(auctionId)) return res.status(400).json({ success: false, message: 'Invalid auction id' });

    await db.query(
      'INSERT IGNORE INTO watchlists (user_id, auction_id, created_at) VALUES (?, ?, NOW())',
      { replacements: [userId, auctionId], raw: true }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('bidder.addToWatchlist', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const removeFromWatchlist = async (req, res) => {
  try {
    const userId = req.user?.id;
    const auctionId = Number(req.params.auctionId);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!Number.isFinite(auctionId)) return res.status(400).json({ success: false, message: 'Invalid auction id' });

    await db.query('DELETE FROM watchlists WHERE user_id = ? AND auction_id = ?', {
      replacements: [userId, auctionId],
      raw: true,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('bidder.removeFromWatchlist', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Manual bid (API only).
 * UI đã chuyển sang Auto-bid + Mua ngay, nhưng endpoint này vẫn giữ để tránh break.
 */
const placeBid = async (req, res) => {
  const userId = req.user?.id;
  const auctionId = Number(req.params.id);
  const amount = Number(req.body.amount);

  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!Number.isFinite(auctionId)) return res.status(400).json({ success: false, message: 'Invalid auction id' });
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

  try {
    await db.transaction(async (t) => {
      const auction = await Auction.findByPk(auctionId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!auction) throw Object.assign(new Error('Auction not found'), { statusCode: 404 });

      const now = new Date();
      if (auction.end_time && new Date(auction.end_time) <= now) {
        throw Object.assign(new Error('Auction already ended'), { statusCode: 400 });
      }
      const st = String(auction.status || '').toUpperCase();
      if (st === 'ENDED' || st === 'CANCELLED') {
        throw Object.assign(new Error('Auction already ended'), { statusCode: 400 });
      }

      const blocked = await BlockedBidder.findOne({
        where: { auction_id: auctionId, bidder_id: userId },
        transaction: t,
        lock: t.LOCK.KEY_SHARE,
      });
      if (blocked) throw Object.assign(new Error('You are blocked from this auction'), { statusCode: 403 });

      const current = toNum(auction.current_price);
      const step = Math.max(1, toNum(auction.step_price));
      const minAllowed = current + step;

      if (amount < minAllowed) {
        throw Object.assign(new Error(`Bid must be at least ${minAllowed.toLocaleString('vi-VN')} VND`), { statusCode: 400 });
      }

      // Bid must be < buy-now price
      const buyNowPrice = calcBuyNowPrice(auction);
      if (buyNowPrice > 0 && amount >= buyNowPrice) {
        throw Object.assign(
          new Error(`Bid phải nhỏ hơn giá mua ngay (${buyNowPrice.toLocaleString('vi-VN')} VND). Nếu muốn mua ngay hãy bấm Mua ngay.`),
          { statusCode: 400 }
        );
      }

      const bid = await Bid.create(
        { auction_id: auctionId, bidder_id: userId, amount, is_auto: false },
        { transaction: t }
      );

      await auction.update(
        { current_price: amount, current_winner_id: userId, winner_bid_id: bid.id },
        { transaction: t }
      );

      // Trigger auto-bid competition after manual bid
      await runAutoBidEngine({ transaction: t, auctionId });
    });

    return res.json({ success: true });
  } catch (err) {
    const code = err.statusCode || 500;
    console.error('bidder.placeBid', err);
    return res.status(code).json({ success: false, message: err.message || 'Server error' });
  }
};

/**
 * Set auto-bid max.
 * Constraints:
 * - max_amount must be < buy-now price.
 */
const setAutoBid = async (req, res) => {
  const userId = req.user?.id;
  const auctionId = Number(req.params.id);
  const maxAmount = Number(req.body.max_amount);

  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!Number.isFinite(auctionId)) return res.status(400).json({ success: false, message: 'Invalid auction id' });
  if (!Number.isFinite(maxAmount) || maxAmount <= 0) return res.status(400).json({ success: false, message: 'Invalid max_amount' });

  try {
    let note = null;

    await db.transaction(async (t) => {
      const auction = await Auction.findByPk(auctionId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!auction) throw Object.assign(new Error('Auction not found'), { statusCode: 404 });

      const now = new Date();
      if (auction.end_time && new Date(auction.end_time) <= now) {
        throw Object.assign(new Error('Auction already ended'), { statusCode: 400 });
      }
      const st = String(auction.status || '').toUpperCase();
      if (st === 'ENDED' || st === 'CANCELLED') {
        throw Object.assign(new Error('Auction already ended'), { statusCode: 400 });
      }

      const blocked = await BlockedBidder.findOne({
        where: { auction_id: auctionId, bidder_id: userId },
        transaction: t,
        lock: t.LOCK.KEY_SHARE,
      });
      if (blocked) throw Object.assign(new Error('You are blocked from this auction'), { statusCode: 403 });

      const buyNowPrice = calcBuyNowPrice(auction);
      if (buyNowPrice > 0 && maxAmount >= buyNowPrice) {
        throw Object.assign(
          new Error(`Max auto-bid phải nhỏ hơn giá mua ngay (${buyNowPrice.toLocaleString('vi-VN')} VND).`),
          { statusCode: 400 }
        );
      }

      const existing = await AutoBidRule.findOne({
        where: { auction_id: auctionId, bidder_id: userId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (existing) {
        await existing.update({ max_amount: maxAmount, is_active: true }, { transaction: t });
      } else {
        await AutoBidRule.create(
          { auction_id: auctionId, bidder_id: userId, max_amount: maxAmount, is_active: true },
          { transaction: t }
        );
      }

      const current = toNum(auction.current_price);
      const step = Math.max(1, toNum(auction.step_price));
      const minAllowed = current + step;
      if (maxAmount < minAllowed) {
        note = `Đã lưu auto-bid, nhưng max hiện tại nhỏ hơn giá tối thiểu để outbid (${minAllowed.toLocaleString('vi-VN')} VND).`;
      }

      // Run engine to resolve competition immediately
      await runAutoBidEngine({ transaction: t, auctionId });
    });

    return res.json({ success: true, note });
  } catch (err) {
    const code = err.statusCode || 500;
    console.error('bidder.setAutoBid', err);
    return res.status(code).json({ success: false, message: err.message || 'Server error' });
  }
};

/**
 * Buy now (kết thúc phiên đấu giá và tạo Order).
 */
const buyNow = async (req, res) => {
  const userId = req.user?.id;
  const auctionId = Number(req.params.id);

  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (!Number.isFinite(auctionId)) return res.status(400).json({ success: false, message: 'Invalid auction id' });

  try {
    const result = await db.transaction(async (t) => {
      const auction = await Auction.findByPk(auctionId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!auction) throw Object.assign(new Error('Auction not found'), { statusCode: 404 });

      const now = new Date();
      if (auction.end_time && new Date(auction.end_time) <= now) {
        throw Object.assign(new Error('Auction already ended'), { statusCode: 400 });
      }
      const st = String(auction.status || '').toUpperCase();
      if (st === 'ENDED' || st === 'CANCELLED') {
        throw Object.assign(new Error('Auction already ended'), { statusCode: 400 });
      }

      const blocked = await BlockedBidder.findOne({
        where: { auction_id: auctionId, bidder_id: userId },
        transaction: t,
        lock: t.LOCK.KEY_SHARE,
      });
      if (blocked) throw Object.assign(new Error('You are blocked from this auction'), { statusCode: 403 });

      const buyNowPrice = calcBuyNowPrice(auction);
      if (buyNowPrice <= 0) {
        throw Object.assign(new Error('Buy-now price is not available'), { statusCode: 400 });
      }

      // Place final bid
      const bid = await Bid.create(
        {
          auction_id: auctionId,
          bidder_id: userId,
          amount: buyNowPrice,
          is_auto: false,
        },
        { transaction: t }
      );

      // End auction
      await auction.update(
        {
          current_price: buyNowPrice,
          current_winner_id: userId,
          winner_id: userId,
          winner_bid_id: bid.id,
          status: 'ENDED',
          end_time: now,
        },
        { transaction: t }
      );

      // Create order if not exists
      const existingOrder = await Order.findOne({ where: { auction_id: auctionId }, transaction: t, lock: t.LOCK.UPDATE });
      if (existingOrder) {
        return { orderId: existingOrder.id, buyNowPrice, productId: auction.product_id };
      }

      const order = await Order.create(
        {
          auction_id: auctionId,
          seller_id: auction.seller_id,
          buyer_id: userId,
          status: 'WAIT_BUYER_INFO',
        },
        { transaction: t }
      );

      return { orderId: order.id, buyNowPrice, productId: auction.product_id };
    });

    // If request comes from a normal HTML form, redirect.
    const acceptsHtml = String(req.headers.accept || '').includes('text/html');
    if (acceptsHtml && !req.xhr) {
      return res.redirect(`/orders/${result.orderId}`);
    }
    return res.json({ success: true, orderId: result.orderId, buy_now_price: result.buyNowPrice, productId: result.productId });
  } catch (err) {
    const code = err.statusCode || 500;
    console.error('bidder.buyNow', err);
    if (String(req.headers.accept || '').includes('text/html') && !req.xhr) {
      return res.status(code).redirect(`/?error=${encodeURIComponent(err.message || 'Server error')}`);
    }
    return res.status(code).json({ success: false, message: err.message || 'Server error' });
  }
};

const listBids = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const [rows] = await db.query(
      `SELECT b.id, b.auction_id, b.amount, b.is_auto, b.created_at
       FROM bids b
       WHERE b.bidder_id = ?
       ORDER BY b.created_at DESC`,
      { replacements: [userId], raw: true }
    );
    return res.json({ success: true, bids: rows || [] });
  } catch (err) {
    console.error('bidder.listBids', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listWon = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const [rows] = await db.query(
      `SELECT a.id AS auction_id, a.product_id, a.current_price, a.end_time, a.winner_id, o.id AS order_id
       FROM auctions a
       LEFT JOIN orders o ON o.auction_id = a.id
       WHERE a.winner_id = ?
       ORDER BY a.end_time DESC`,
      { replacements: [userId], raw: true }
    );
    return res.json({ success: true, won: rows || [] });
  } catch (err) {
    console.error('bidder.listWon', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const showUpgradeRequestForm = (req, res) => {
  return res.render('profile/upgradeRequestPage', { title: 'Yêu cầu nâng cấp Seller' });
};

async function createUpgradeRequest(req, res, next) {
  try {
    const { message = '' } = req.body;
    if (!message.trim()) {
      return res.render('profile/upgradeRequestPage', {
        title: 'Yêu cầu nâng cấp Seller',
        error: 'Vui lòng nhập lý do nâng cấp',
      });
    }

    const existing = await UpgradeRequest.findOne({
      where: { user_id: req.user.id, status: ['PENDING', 'APPROVED'] },
    });
    if (existing) {
      return res.render('profile/upgradeRequestPage', {
        title: 'Yêu cầu nâng cấp Seller',
        error: existing.status === 'PENDING' ? 'Bạn đã gửi yêu cầu và đang chờ duyệt.' : 'Tài khoản đã được duyệt nâng cấp.',
      });
    }

    await UpgradeRequest.create({
      user_id: req.user.id,
      status: 'PENDING',
      note: message.trim(),
    });

    return res.render('profile/upgradeRequestPage', {
      title: 'Yêu cầu nâng cấp Seller',
      success: 'Đã gửi yêu cầu, vui lòng chờ admin duyệt.',
    });
  } catch (err) {
    console.error('createUpgradeRequest error:', err);
    return next(err);
  }
}

export default {
  getProfile,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  placeBid,
  setAutoBid,
  buyNow,
  listBids,
  listWon,
  showUpgradeRequestForm,
  createUpgradeRequest,
};
