import db from '../config/db.js';
import bcrypt from 'bcrypt';

/*
  Seller controller — 1:1 map to routes/seller.route.js
  Implement real logic later. These are minimal, safe stubs using db where straightforward.
*/

const register = async (req, res) => {
  try {
    const { name, email, password, storeName } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Missing fields' });

    const [[exists]] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, storeName, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [name, email, hash, 'seller', storeName || null]
    );
    return res.status(201).json({ success: true, data: { id: result.insertId, name, email, storeName } });
  } catch (err) {
    console.error('seller.register', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Missing credentials' });

    const [[user]] = await db.query('SELECT id, name, email, password, role FROM users WHERE email = ? AND role = ? LIMIT 1', [
      email,
      'seller'
    ]);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Return basic profile (token handling is in auth.controller / middleware)
    return res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('seller.login', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const logout = async (req, res) => {
  try {
    // clearing cookie handled by auth controller/middleware; keep stub
    return res.json({ success: true });
  } catch (err) {
    console.error('seller.logout', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const [[user]] = await db.query('SELECT id, name, email, storeName, created_at FROM users WHERE id = ? LIMIT 1', [userId]);
    return res.json({ success: true, data: user || null });
  } catch (err) {
    console.error('seller.getProfile', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, email, storeName } = req.body;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    await db.query('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), storeName = COALESCE(?, storeName), updated_at = NOW() WHERE id = ?', [
      name || null,
      email || null,
      storeName || null,
      userId
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error('seller.updateProfile', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createItem = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    const { title, startingPrice, endDate } = req.body;
    if (!sellerId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const [result] = await db.query(
      'INSERT INTO products (title, seller_id, starting_price, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [title, sellerId, startingPrice, 'active']
    );
    // Optionally create auction later
    if (endDate) {
      await db.query('INSERT INTO auctions (product_id, title, seller_id, current_price, end_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())', [
        result.insertId,
        title,
        sellerId,
        startingPrice,
        endDate,
        'active'
      ]);
    }
    return res.status(201).json({ success: true, data: { productId: result.insertId } });
  } catch (err) {
    console.error('seller.createItem', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateItem = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    const id = req.params.id;
    const { title, startingPrice, endDate } = req.body;
    // basic ownership check omitted for brevity
    await db.query('UPDATE products SET title = COALESCE(?, title), starting_price = COALESCE(?, starting_price), updated_at = NOW() WHERE id = ? AND seller_id = ?', [
      title || null,
      startingPrice || null,
      id,
      sellerId
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error('seller.updateItem', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteItem = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    const id = req.params.id;
    await db.query('DELETE FROM products WHERE id = ? AND seller_id = ?', [id, sellerId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('seller.deleteItem', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSellers = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, name AS storeName, email, created_at FROM users WHERE role = 'seller' ORDER BY created_at DESC");
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('seller.getSellers', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSellerById = async (req, res) => {
  try {
    const id = req.params.id;
    const [[seller]] = await db.query("SELECT id, name, email, storeName FROM users WHERE id = ? AND role = 'seller' LIMIT 1", [id]);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    return res.json({ success: true, data: seller });
  } catch (err) {
    console.error('seller.getSellerById', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteSeller = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM users WHERE id = ? AND role = ?', [id, 'seller']);
    return res.json({ success: true });
  } catch (err) {
    console.error('seller.deleteSeller', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* Seller-specific UI/actions */

const dashboard = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    const [[itemsCount]] = await db.query('SELECT COUNT(*) AS cnt FROM products WHERE seller_id = ?', [sellerId]);
    const [[auctionsCount]] = await db.query('SELECT COUNT(*) AS cnt FROM auctions WHERE seller_id = ?', [sellerId]);
    return res.json({ success: true, data: { items: itemsCount?.cnt ?? 0, auctions: auctionsCount?.cnt ?? 0 } });
  } catch (err) {
    console.error('seller.dashboard', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listAuctions = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    const [rows] = await db.query('SELECT id, title, current_price, end_time, status FROM auctions WHERE seller_id = ? ORDER BY end_time DESC', [sellerId]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('seller.listAuctions', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const newAuctionForm = async (req, res) => {
  try {
    // return minimal data for form (categories, products)
    const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name');
    const [products] = await db.query('SELECT id, title FROM products WHERE seller_id = ?', [req.user?.id]);
    return res.json({ success: true, data: { categories, products } });
  } catch (err) {
    console.error('seller.newAuctionForm', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createAuction = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    const { title, startingPrice, endDate, productId } = req.body;
    const [result] = await db.query(
      'INSERT INTO auctions (product_id, title, seller_id, current_price, end_time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [productId || null, title, sellerId, startingPrice, endDate || null, 'active']
    );
    return res.status(201).json({ success: true, data: { auctionId: result.insertId } });
  } catch (err) {
    console.error('seller.createAuction', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const editAuctionForm = async (req, res) => {
  try {
    const id = req.params.id;
    const [[auction]] = await db.query('SELECT * FROM auctions WHERE id = ? LIMIT 1', [id]);
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    return res.json({ success: true, data: auction });
  } catch (err) {
    console.error('seller.editAuctionForm', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateAuction = async (req, res) => {
  try {
    const id = req.params.id;
    const { title, startingPrice, endDate } = req.body;
    await db.query('UPDATE auctions SET title = COALESCE(?, title), current_price = COALESCE(?, current_price), end_time = COALESCE(?, end_time), updated_at = NOW() WHERE id = ?', [
      title || null,
      startingPrice || null,
      endDate || null,
      id
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error('seller.updateAuction', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const blockBidder = async (req, res) => {
  try {
    const auctionId = req.params.id;
    const { bidderId, reason } = req.body;
    await db.query('INSERT INTO blocked_bidders (auction_id, bidder_id, reason, created_at) VALUES (?, ?, ?, NOW())', [
      auctionId,
      bidderId,
      reason || null
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error('seller.blockBidder', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const answerQuestion = async (req, res) => {
  try {
    const questionId = req.params.id;
    const { answer } = req.body;
    await db.query('INSERT INTO answers (question_id, seller_id, answer, created_at) VALUES (?, ?, ?, NOW())', [
      questionId,
      req.user?.id,
      answer
    ]);
    return res.json({ success: true });
  } catch (err) {
    console.error('seller.answerQuestion', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  createItem,
  updateItem,
  deleteItem,
  getSellers,
  getSellerById,
  deleteSeller,
  dashboard,
  listAuctions,
  newAuctionForm,
  createAuction,
  editAuctionForm,
  updateAuction,
  blockBidder,
  answerQuestion
};