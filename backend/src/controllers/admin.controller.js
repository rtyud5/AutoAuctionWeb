import db from '../config/db.js';

/*
  Admin controller (ESM) — 1:1 map to routes in routes/admin.route.js.
  Implement business logic later; these are safe stubs that use db where straightforward.
*/

const dashboard = async (req, res) => {
  try {
    const [[usersCount]] = await db.query('SELECT COUNT(*) AS cnt FROM users');
    const [[auctionsCount]] = await db.query('SELECT COUNT(*) AS cnt FROM auctions');
    const [[pendingUpgrades]] = await db.query("SELECT COUNT(*) AS cnt FROM upgrade_requests WHERE status = 'pending'");
    return res.json({
      success: true,
      data: {
        users: usersCount?.cnt ?? 0,
        auctions: auctionsCount?.cnt ?? 0,
        pendingUpgradeRequests: pendingUpgrades?.cnt ?? 0
      }
    });
  } catch (err) {
    console.error('admin.dashboard', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, email, role, is_blocked FROM users ORDER BY id DESC LIMIT 500');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('admin.listUsers', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const id = req.params.id;
    const [[user]] = await db.query('SELECT id, username, email, role, is_blocked FROM users WHERE id = ? LIMIT 1', [id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user });
  } catch (err) {
    console.error('admin.getUserById', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const id = req.params.id;
    const { role } = req.body;
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.updateUserRole', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.deleteUser', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const lockUser = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('UPDATE users SET is_blocked = 1 WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.lockUser', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const unlockUser = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('UPDATE users SET is_blocked = 0 WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.unlockUser', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listSellers = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, name AS storeName, email, created_at FROM users WHERE role = 'seller' ORDER BY created_at DESC");
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('admin.listSellers', err);
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
    console.error('admin.getSellerById', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteSeller = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM users WHERE id = ? AND role = ?', [id, 'seller']);
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.deleteSeller', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listProducts = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, title, seller_id, status FROM products ORDER BY id DESC LIMIT 200');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('admin.listProducts', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getProductById = async (req, res) => {
  try {
    const id = req.params.id;
    const [[product]] = await db.query('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, data: product });
  } catch (err) {
    console.error('admin.getProductById', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.deleteProduct', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listAuctions = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, title, seller_id, status, end_time FROM auctions ORDER BY end_time DESC LIMIT 500');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('admin.listAuctions', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAuctionById = async (req, res) => {
  try {
    const id = req.params.id;
    const [[auction]] = await db.query('SELECT * FROM auctions WHERE id = ? LIMIT 1', [id]);
    if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
    return res.json({ success: true, data: auction });
  } catch (err) {
    console.error('admin.getAuctionById', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateAuctionStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    await db.query('UPDATE auctions SET status = ? WHERE id = ?', [status, id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.updateAuctionStatus', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const removeAuction = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('UPDATE auctions SET status = ? WHERE id = ?', ['removed', id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.removeAuction', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listCategories = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, slug, parent_id FROM categories ORDER BY parent_id, id');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('admin.listCategories', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, slug, parent_id } = req.body;
    await db.query('INSERT INTO categories (name, slug, parent_id) VALUES (?, ?, ?)', [name, slug || null, parent_id || null]);
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.createCategory', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, slug, parent_id } = req.body;
    await db.query(
      'UPDATE categories SET name = COALESCE(?, name), slug = COALESCE(?, slug), parent_id = COALESCE(?, parent_id) WHERE id = ?',
      [name || null, slug || null, parent_id || null, id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.updateCategory', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM categories WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.deleteCategory', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listUpgradeRequests = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, user_id, message, status, created_at FROM upgrade_requests ORDER BY created_at DESC');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('admin.listUpgradeRequests', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const approveUpgradeRequest = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const id = req.params.id;
    const [[reqRow]] = await conn.query('SELECT user_id FROM upgrade_requests WHERE id = ? FOR UPDATE', [id]);
    if (!reqRow) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    const userId = reqRow.user_id;
    await conn.query('UPDATE users SET role = ? WHERE id = ?', ['seller', userId]);
    await conn.query("UPDATE upgrade_requests SET status = 'approved', processed_at = NOW() WHERE id = ?", [id]);
    await conn.commit();
    return res.json({ success: true });
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error('admin.approveUpgradeRequest', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
};

const rejectUpgradeRequest = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query("UPDATE upgrade_requests SET status = 'rejected', processed_at = NOW() WHERE id = ?", [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.rejectUpgradeRequest', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const [[usersToday]] = await db.query("SELECT COUNT(*) AS cnt FROM users WHERE DATE(created_at) = CURDATE()");
    const [[auctionsActive]] = await db.query("SELECT COUNT(*) AS cnt FROM auctions WHERE status = 'active'");
    return res.json({ success: true, data: { usersToday: usersToday?.cnt ?? 0, activeAuctions: auctionsActive?.cnt ?? 0 } });
  } catch (err) {
    console.error('admin.getStats', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default {
  dashboard,
  listUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  lockUser,
  unlockUser,
  listSellers,
  getSellerById,
  deleteSeller,
  listProducts,
  getProductById,
  deleteProduct,
  listAuctions,
  getAuctionById,
  updateAuctionStatus,
  removeAuction,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listUpgradeRequests,
  approveUpgradeRequest,
  rejectUpgradeRequest,
  getStats
};