import db from '../config/db.js';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import Product from '../models/product.model.js';
import Auction from '../models/auction.model.js';

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

const newProductForm = async (req, res) => {
  try {
    const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name');
    return res.render('seller/upProduct', {
      title: 'Đăng sản phẩm mới',
      categories,
      user: req.user || null,
    });
  } catch (err) {
    console.error('seller.newProductForm', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createProduct = async (req, res) => {
  const t = await db.transaction();
  try {
    const sellerId = req.user?.id;
    if (!sellerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const {
      title,
      category_id,
      short_description,
      full_description,
      starting_price,
      end_time,
      step_price,   // optional
      auto_extend   // optional
    } = req.body;

    const startPriceNum = Number(starting_price);
    const stepPriceNum = step_price ? Number(step_price) : 100000;
    const autoExtendVal = auto_extend === undefined ? true : Boolean(auto_extend);
    const endTimeVal = end_time ? new Date(end_time) : new Date(Date.now() + 7 * 24 * 3600 * 1000);

    if (!title || !category_id || isNaN(startPriceNum) || startPriceNum <= 0 || isNaN(stepPriceNum) || stepPriceNum <= 0) {
      return res.status(400).json({ success: false, message: 'Thiếu/không hợp lệ: title, category_id, starting_price, step_price' });
    }

    let thumbnail = null;

    // 1) Product
    const product = await Product.create(
      {
        seller_id: sellerId,
        category_id,
        title,
        short_description: short_description || null,
        full_description: full_description || null,
        thumbnail,
        status: 'APPROVED'
      },
      { transaction: t }
    );

    // 2) Lưu ảnh vào folder theo product ID
    if (req.file) {
      const productDir = path.join(process.cwd(), 'public', 'uploads', 'products', String(product.id));
      
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
      }

      const newFilePath = path.join(productDir, '0.jpg');
      fs.copyFileSync(req.file.path, newFilePath);
      fs.unlinkSync(req.file.path);
      
      thumbnail = `/uploads/products/${product.id}/0.jpg`;

      await product.update(
        { thumbnail },
        { transaction: t }
      );
    }

    // 3) Auction
    const auction = await Auction.create(
      {
        product_id: product.id,
        seller_id: sellerId,
        start_price: startPriceNum,
        step_price: stepPriceNum,
        current_price: startPriceNum,
        current_winner_id: null,
        start_time: new Date(),
        end_time: endTimeVal,
        auto_extend: autoExtendVal,
        status: 'PENDING',
        winner_id: null,
        winner_bid_id: null
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({ success: true, message: 'Product created successfully', productId: product.id, auctionId: auction.id });
  } catch (err) {
    await t.rollback();
    console.error('seller.createProduct error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};

const listProducts = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    if (!sellerId) {
      return res.redirect('/login');
    }

    const [rows] = await db.query(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.seller_id = ? 
       ORDER BY p.created_at DESC`,
      { replacements: [sellerId], raw: true }
    );

    // Render đúng file: seller/products.ejs
    return res.render('seller/products', {
      title: 'Quản lý sản phẩm',
      products: rows || [],
      user: req.user || null,
    });
  } catch (err) {
    console.error('seller.listProducts error:', err);
    return res.status(500).render('error/500', { 
      title: 'Lỗi hệ thống',
      user: req.user || null 
    });
  }
};

const editProductForm = async (req, res) => {
  try {
    const id = req.params.id;
    const sellerId = req.user?.id;
    
    const [rows] = await db.query(
      'SELECT * FROM products WHERE id = ? AND seller_id = ? LIMIT 1',
      { replacements: [id, sellerId], raw: true }
    );
    
    if (!rows || rows.length === 0) {
      return res.status(404).render('error/404', { 
        title: 'Không tìm thấy',
        user: req.user || null 
      });
    }
    
    const product = rows[0];
    const [categories] = await db.query(
      'SELECT id, name FROM categories ORDER BY name',
      { replacements: [], raw: true }
    );

    // Lấy auction gắn với product (nếu có)
    const [auctionRows] = await db.query(
      'SELECT * FROM auctions WHERE product_id = ? AND seller_id = ? LIMIT 1',
      { replacements: [id, sellerId], raw: true }
    );
    const auction = auctionRows && auctionRows.length ? auctionRows[0] : null;
    
    return res.render('seller/editProduct', { 
      title: 'Chỉnh sửa sản phẩm',
      product,
      categories,
      auction,
      user: req.user || null
    });
  } catch (err) {
    console.error('seller.editProductForm error:', err);
    return res.status(500).render('error/500', { 
      title: 'Lỗi hệ thống',
      user: req.user || null 
    });
  }
};

const updateProduct = async (req, res) => {
  const t = await db.transaction();
  try {
    const sellerId = req.user?.id;
    if (!sellerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const productId = req.params.id;
    const {
      title,
      category_id,
      short_description,
      full_description,
      starting_price,
      step_price,
      end_time,
      auto_extend
    } = req.body;

    const startPriceNum = starting_price !== undefined ? Number(starting_price) : null;
    const stepPriceNum = step_price !== undefined ? Number(step_price) : null;

    if (startPriceNum !== null && (isNaN(startPriceNum) || startPriceNum <= 0)) {
      return res.status(400).json({ success: false, message: 'starting_price không hợp lệ' });
    }
    if (stepPriceNum !== null && (isNaN(stepPriceNum) || stepPriceNum <= 0)) {
      return res.status(400).json({ success: false, message: 'step_price không hợp lệ' });
    }

    // 1) Update product
    const product = await Product.findOne({ where: { id: productId, seller_id: sellerId } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Xử lý ảnh mới
    let thumbnail = undefined;
    if (req.file) {
      const productDir = path.join(process.cwd(), 'public', 'uploads', 'products', String(productId));
      
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
      }

      const newFilePath = path.join(productDir, '0.jpg');
      
      // Xóa ảnh cũ nếu tồn tại
      if (fs.existsSync(newFilePath)) {
        fs.unlinkSync(newFilePath);
      }
      
      fs.copyFileSync(req.file.path, newFilePath);
      fs.unlinkSync(req.file.path);
      
      thumbnail = `/uploads/products/${productId}/0.jpg`;
    }

    await product.update(
      {
        title: title ?? product.title,
        category_id: category_id ?? product.category_id,
        short_description: short_description ?? product.short_description,
        full_description: full_description ?? product.full_description,
        thumbnail: thumbnail ?? product.thumbnail,
      },
      { transaction: t }
    );

    // 2) Update auction linked to product
    const auction = await Auction.findOne({ where: { product_id: productId, seller_id: sellerId } });
    if (auction) {
      await auction.update(
        {
          start_price: startPriceNum ?? auction.start_price,
          step_price: stepPriceNum ?? auction.step_price,
          current_price: startPriceNum ?? auction.current_price, // nếu chỉnh giá khởi điểm, cập nhật current_price theo
          end_time: end_time ? new Date(end_time) : auction.end_time,
          auto_extend: auto_extend === undefined ? auction.auto_extend : Boolean(auto_extend),
        },
        { transaction: t }
      );
    }

    await t.commit();
    return res.json({ success: true, message: 'Updated successfully' });
  } catch (err) {
    await t.rollback();
    console.error('seller.updateProduct error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};

const deleteProduct = async (req, res) => {
  const t = await db.transaction();
  try {
    const sellerId = req.user?.id;
    const productId = req.params.id;
    if (!sellerId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Lấy product + thumbnail để kiểm tra quyền sở hữu
    const [rows] = await db.query(
      'SELECT id, thumbnail FROM products WHERE id = ? AND seller_id = ? LIMIT 1',
      { replacements: [productId, sellerId], transaction: t }
    );
    if (!rows || rows.length === 0) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Xóa auctions gắn với product
    await db.query(
      'DELETE FROM auctions WHERE product_id = ? AND seller_id = ?',
      { replacements: [productId, sellerId], transaction: t }
    );

    // Xóa product
    await db.query(
      'DELETE FROM products WHERE id = ? AND seller_id = ?',
      { replacements: [productId, sellerId], transaction: t }
    );

    await t.commit();

    // Xóa folder ảnh
    const productDir = path.join(process.cwd(), 'public', 'uploads', 'products', String(productId));
    if (fs.existsSync(productDir)) {
      fs.rmSync(productDir, { recursive: true, force: true });
    }

    return res.json({ success: true, message: 'Product & auctions deleted successfully' });
  } catch (err) {
    await t.rollback();
    console.error('seller.deleteProduct error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
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
  answerQuestion,
  newProductForm,
  createProduct,
  listProducts,
  editProductForm,
  updateProduct,
  deleteProduct
};