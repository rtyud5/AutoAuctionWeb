import db from '../config/db.js';
import UpgradeRequest from '../models/upgradeRequest.model.js';
import User from '../models/user.model.js';
import Auction from '../models/auction.model.js';

/*
  Admin controller (ESM) — 1:1 map to routes in routes/admin.route.js.
  Phần API trả JSON giữ nguyên như cũ.
*/

// ===== API JSON =====

const dashboard = async (req, res) => {
  try {
    const users = await User.count();
    const auctions = await Auction.count();
    const pendingUpgradeRequests = await UpgradeRequest.count({
      where: { status: 'PENDING' }
    });

    return res.json({
      success: true,
      data: {
        users,
        auctions,
        pendingUpgradeRequests
      }
    });
  } catch (err) {
    console.error('admin.dashboard', err);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const listUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, email, role, is_blocked FROM users ORDER BY id DESC LIMIT 500'
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('admin.listUsers', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const id = req.params.id;
    const [[user]] = await db.query(
      'SELECT id, username, email, role, is_blocked FROM users WHERE id = ? LIMIT 1',
      [id]
    );
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
    const [rows] = await db.query(
      "SELECT id, name AS storeName, email, created_at FROM users WHERE role = 'seller' ORDER BY created_at DESC"
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('admin.listSellers', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSellerById = async (req, res) => {
  try {
    const id = req.params.id;
    const [[seller]] = await db.query(
      "SELECT id, name, email, storeName FROM users WHERE id = ? AND role = 'seller' LIMIT 1",
      [id]
    );
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
    const [rows] = await db.query(
      'SELECT id, title, seller_id, status FROM products ORDER BY id DESC LIMIT 200'
    );
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

const removeProductAdmin = async (req, res) => {
  try {
    const id = Number(req.params.id);

    // "Gỡ bỏ" theo nghĩa: ẩn khỏi sàn ngay lập tức
    // 1) Đánh dấu sản phẩm BANNED (không còn xuất hiện ở các trang lọc APPROVED)
    await db.query('UPDATE products SET status = ? WHERE id = ?', ['BANNED', id]);

    // 2) Gỡ các phiên đấu giá liên quan (nếu có) để không còn hiển thị
    await db.query('UPDATE auctions SET status = ? WHERE product_id = ?', ['removed', id]);

    if (req.accepts('html')) return res.redirect('/admin/products-page?success=removed');
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.removeProductAdmin', err);
    if (req.accepts('html')) return res.redirect('/admin/products-page?error=remove_failed');
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};



const listAuctions = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, title, seller_id, status, end_time FROM auctions ORDER BY end_time DESC LIMIT 500'
    );
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
    const [rows] = await db.query(
      'SELECT id, name, slug, parent_id FROM categories ORDER BY parent_id, id'
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('admin.listCategories', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, slug, parent_id } = req.body;

    // slug có thể để trống; nếu để trống thì lưu NULL để các phần khác không bị lỗi
    const safeSlug = (typeof slug === 'string' && slug.trim().length > 0) ? slug.trim() : null;

    await db.query('INSERT INTO categories (name, slug, parent_id) VALUES (?, ?, ?)', [
      name,
      safeSlug,
      parent_id ? Number(parent_id) : null,
    ]);

    // Nếu request đến từ form HTML (Admin UI) thì redirect về trang quản lý
    if (req.accepts('html')) return res.redirect('/admin/categories-page?success=created');
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.createCategory', err);
    if (req.accepts('html')) return res.redirect('/admin/categories-page?error=create_failed');
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
    const id = Number(req.params.id);

    // Không cho xoá danh mục đã có sản phẩm
    const [[cntRow]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM products WHERE category_id = ?',
      [id]
    );

    const cnt = Number(cntRow?.cnt || 0);
    if (cnt > 0) {
      if (req.accepts('html')) return res.redirect('/admin/categories-page?error=has_products');
      return res.status(400).json({
        success: false,
        message: 'Không thể xoá danh mục vì đã có sản phẩm.',
      });
    }

    await db.query('DELETE FROM categories WHERE id = ?', [id]);

    if (req.accepts('html')) return res.redirect('/admin/categories-page?success=deleted');
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.deleteCategory', err);
    if (req.accepts('html')) return res.redirect('/admin/categories-page?error=delete_failed');
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listUpgradeRequests = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, user_id, note, status, created_at FROM upgrade_requests ORDER BY created_at DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('admin.listUpgradeRequests', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const approveUpgradeRequest = async (req, res) => {
  try {
    const id = req.params.id;

    const req_row = await UpgradeRequest.findByPk(id);
    if (!req_row) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    if (req_row.status === 'APPROVED') {
      return res.json({ success: false, message: 'Request already approved' });
    }

    await User.update({ role: 'seller' }, { where: { id: req_row.user_id } });
    await UpgradeRequest.update({ status: 'APPROVED' }, { where: { id } });

    if (req.accepts('html')) return res.redirect('/admin/upgrade-requests-page');
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.approveUpgradeRequest', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const rejectUpgradeRequest = async (req, res) => {
  try {
    const id = req.params.id;
    await UpgradeRequest.update({ status: 'REJECTED' }, { where: { id } });
    if (req.accepts('html')) return res.redirect('/admin/upgrade-requests-page');
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.rejectUpgradeRequest', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteUpgradeRequest = async (req, res) => {
  try {
    const id = req.params.id;
    await UpgradeRequest.destroy({ where: { id } });
    if (req.accepts('html')) return res.redirect('/admin/upgrade-requests-page');
    return res.json({ success: true });
  } catch (err) {
    console.error('admin.deleteUpgradeRequest', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const [[usersToday]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM users WHERE DATE(created_at) = CURDATE()'
    );
    const [[auctionsActive]] = await db.query(
      "SELECT COUNT(*) AS cnt FROM auctions WHERE status = 'active'"
    );
    return res.json({
      success: true,
      data: { usersToday: usersToday?.cnt ?? 0, activeAuctions: auctionsActive?.cnt ?? 0 },
    });
  } catch (err) {
    console.error('admin.getStats', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ===== Admin UI render functions (EJS, dùng layout riêng) =====

const renderDashboard = async (req, res) => {
  try {
    const [[usersCount]] = await db.query('SELECT COUNT(*) AS cnt FROM users');
    const [[bidderCount]] = await db.query(
      "SELECT COUNT(*) AS cnt FROM users WHERE role = 'bidder'"
    );
    const [[sellerCount]] = await db.query(
      "SELECT COUNT(*) AS cnt FROM users WHERE role = 'seller'"
    );
    const [[pendingUpgrades]] = await db.query(
      "SELECT COUNT(*) AS cnt FROM upgrade_requests WHERE status = 'pending'"
    );

    return res.render('admin/dashboard', {
      layout: 'layouts/admin',
      layout: 'layouts/admin',        // <-- BẮT BUỘC DÙNG LAYOUT ADMIN
      title: 'Admin Dashboard',
      stats: {
        totalUsers: usersCount?.cnt ?? 0,
        bidderCount: bidderCount?.cnt ?? 0,
        sellerCount: sellerCount?.cnt ?? 0,
        pendingUpgrade: pendingUpgrades?.cnt ?? 0,
      },
    });
  } catch (err) {
    console.error('admin.renderDashboard', err);
    return res.status(500).render('error/500', { title: 'Lỗi server' });
  }
};

const renderUpgradeRequestsPage = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ur.*, u.name, u.email
       FROM upgrade_requests ur
       LEFT JOIN users u ON ur.user_id = u.id
       ORDER BY ur.id DESC`
    );

    const requests = (rows || []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_name: r.name || `User #${r.user_id}`,
      user_email: r.email || '—',
      note: r.note || null,
      status: r.status || 'PENDING',
      created_at: r.created_at || null,
    }));

    return res.render('admin/upgrade-requests', {
      layout: 'layouts/admin',
      title: 'Yêu cầu nâng cấp Seller',
      requests,
    });
  } catch (err) {
    console.error('admin.renderUpgradeRequestsPage', err);
    return res.status(500).render('error/500', { title: 'Lỗi server' });
  }
};

const renderUsersPage = async (req, res) => {
  try {
    // Lấy toàn bộ user, tránh phụ thuộc tên cột cụ thể
    const [rows] = await db.query('SELECT * FROM users ORDER BY id DESC');

    const users = (rows || []).map((u) => ({
      id: u.id,
      // Ưu tiên username, nếu không có thì name, nếu không nữa thì fallback User #id
      name: u.username || u.name || `User #${u.id}`,
      email: u.email || '',
      role: u.role || 'bidder',
      // nếu không có is_blocked thì mặc định là đang hoạt động
      is_active: !(u.is_blocked ?? 0),
      // nếu DB không có created_at thì để null, view sẽ hiển thị "—"
      created_at: u.created_at || null,
    }));

    return res.render('admin/users', {
      layout: 'layouts/admin',
      title: 'Quản lý tài khoản',
      users,
    });
  } catch (err) {
    console.error('admin.renderUsersPage', err);
    return res.status(500).render('error/500', { title: 'Lỗi server' });
  }
};

const renderProductsPage = async (req, res) => {
  try {
    const { success, error } = req.query;

    const [rows] = await db.query(
      `SELECT 
        p.id,
        p.title,
        p.thumbnail,
        p.status,
        p.created_at,
        u.name AS seller_name,
        u.email AS seller_email,
        c.name AS category_name
      FROM products p
      LEFT JOIN users u ON p.seller_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
      LIMIT 500`
    );

    const products = (rows || []).map((p) => ({
      id: p.id,
      title: p.title || `Product #${p.id}`,
      thumbnail: p.thumbnail || null,
      status: p.status || 'PENDING',
      created_at: p.created_at || null,
      seller_name: p.seller_name || '—',
      seller_email: p.seller_email || '—',
      category_name: p.category_name || '—',
    }));

    return res.render('admin/products', {
      layout: 'layouts/admin',
      title: 'Quản lý sản phẩm',
      products,
      success: success || null,
      error: error || null,
    });
  } catch (err) {
    console.error('admin.renderProductsPage', err);
    return res.status(500).render('error/500', { title: 'Lỗi server' });
  }
};

const renderCategoriesPage = async (req, res) => {
  try {
    const { success, error } = req.query;

    const [rows] = await db.query(
      `SELECT 
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY (c.parent_id IS NOT NULL), c.parent_id, c.id`
    );

    // danh sách parent cho dropdown
    const [parents] = await db.query(
      `SELECT id, name FROM categories WHERE parent_id IS NULL ORDER BY id`
    );

    const categories = (rows || []).map((c) => ({
      id: c.id,
      name: c.name || `Category #${c.id}`,
      slug: c.slug || '',
      parent_id: c.parent_id || null,
      product_count: Number(c.product_count || 0),
    }));

    return res.render('admin/categories', {
      layout: 'layouts/admin',
      title: 'Quản lý danh mục',
      categories,
      parents: parents || [],
      success: success || null,
      error: error || null,
    });
  } catch (err) {
    console.error('admin.renderCategoriesPage', err);
    return res.status(500).render('error/500', { title: 'Lỗi server' });
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
  removeProductAdmin,
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
  deleteUpgradeRequest,
  getStats,
  renderDashboard,
  renderUpgradeRequestsPage,
  renderUsersPage,
  renderProductsPage,
  renderCategoriesPage,
};