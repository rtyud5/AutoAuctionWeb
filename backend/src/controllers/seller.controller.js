import db from '../config/db.js';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import Product from '../models/product.model.js';
import Auction from '../models/auction.model.js';
import BlockedBidder from '../models/blocked_bidder.js';

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

    // 1. Chặn bidder
    await BlockedBidder.create({
      auction_id: auctionId,
      bidder_id: bidderId,
      reason: reason || null
    });

    // 2. Xóa tất cả các bid của bidder này trong phiên đấu giá
    await db.query(
      'DELETE FROM bids WHERE auction_id = ? AND bidder_id = ?',
      { replacements: [auctionId, bidderId] }
    );

    // 3. Kiểm tra nếu bidder này đang giữ giá cao nhất
    // Lấy bid cao nhất còn lại sau khi xóa
    const [rows] = await db.query(
      'SELECT bidder_id, amount FROM bids WHERE auction_id = ? ORDER BY amount DESC, created_at DESC LIMIT 1',
      { replacements: [auctionId] }
    );
    if (rows && rows.length > 0) {
      // Cập nhật current_price và current_winner_id cho auction
      await db.query(
        'UPDATE auctions SET current_price = ?, current_winner_id = ? WHERE id = ?',
        { replacements: [rows[0].amount, rows[0].bidder_id, auctionId] }
      );
    } else {
      // Nếu không còn ai đấu giá, reset auction
      await db.query(
        'UPDATE auctions SET current_price = start_price, current_winner_id = NULL WHERE id = ?',
        { replacements: [auctionId] }
      );
    }

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
      auto_extend,  // optional
      allow_negative_user // optional
    } = req.body;

    const startPriceNum = Number(starting_price);
    const stepPriceNum = step_price ? Number(step_price) : 100000;
    const autoExtendVal = auto_extend === undefined ? true : Boolean(auto_extend);
    const allowNegativeUserVal = String(allow_negative_user || "").toLowerCase() === "true" || allow_negative_user === "on" || allow_negative_user === "1";
    const endTimeVal = end_time ? new Date(end_time) : new Date(Date.now() + 7 * 24 * 3600 * 1000);

    if (!title || !category_id || isNaN(startPriceNum) || startPriceNum <= 0 || isNaN(stepPriceNum) || stepPriceNum <= 0) {
      return res.status(400).json({ success: false, message: 'Thiếu/không hợp lệ: title, category_id, starting_price, step_price' });
    }

    // Seller must upload exactly 4 images to match product detail gallery (0.jpg..3.jpg)
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length !== 4) {
      // Clean up any temp uploaded files
      for (const f of files) {
        try { fs.unlinkSync(f.path); } catch (_) {}
      }
      return res.status(400).json({
        success: false,
        message: 'Vui lòng tải lên đúng 4 ảnh sản phẩm (bắt buộc 4 ảnh).',
      });
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
        allow_negative_user: allowNegativeUserVal,
        status: 'APPROVED'
      },
      { transaction: t }
    );

    // 2) Lưu 4 ảnh vào folder theo product ID (0.jpg..3.jpg)
    const productDir = path.join(process.cwd(), 'public', 'uploads', 'products', String(product.id));
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }

    // Save images in deterministic order
    for (let i = 0; i < 4; i++) {
      const f = files[i];
      const newFilePath = path.join(productDir, `${i}.jpg`);
      try {
        // Use copy+unlink to be consistent with existing code
        fs.copyFileSync(f.path, newFilePath);
      } finally {
        try { fs.unlinkSync(f.path); } catch (_) {}
      }
    }

    thumbnail = `/uploads/products/${product.id}/0.jpg`;
    await product.update({ thumbnail }, { transaction: t });

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

    // Lấy nhận xét của winner cho từng sản phẩm
    for (const p of rows) {
      // Lấy auction
      const [[auction]] = await db.query(
        `SELECT id, winner_id FROM auctions WHERE product_id = ? LIMIT 1`,
        { replacements: [p.id], raw: true }
      );
      let order = null; // <-- Thêm dòng này

      if (auction && auction.winner_id) {
        // Lấy order
        const [[orderRow]] = await db.query(
          `SELECT id FROM orders WHERE auction_id = ? AND buyer_id = ? LIMIT 1`,
          { replacements: [auction.id, auction.winner_id], raw: true }
        );
        if (orderRow) {
          order = orderRow; // <-- Gán order
          // Lấy nhận xét
          const [[rating]] = await db.query(
            `SELECT comment, score FROM ratings WHERE order_id = ? AND rater_id = ? LIMIT 1`,
            { replacements: [order.id, auction.winner_id], raw: true }
          );
          if (rating) {
            p.winner_comment = rating.comment;
            p.winner_score = rating.score;
          }
        }
      }

      // Kiểm tra seller đã đánh giá winner chưa
      if (auction && auction.winner_id && order) {
        const [[sellerRating]] = await db.query(
          `SELECT id, comment, score FROM ratings WHERE order_id = ? AND rater_id = ? AND target_user_id = ? LIMIT 1`,
          { replacements: [order.id, sellerId, auction.winner_id], raw: true }
        );
        if (sellerRating) {
          p.seller_to_winner_comment = sellerRating.comment;
          p.seller_to_winner_score = sellerRating.score;
          p.seller_has_rated_winner = true;
        } else {
          p.seller_has_rated_winner = false;
        }
        p.winner_id = auction.winner_id;
        p.order_id = order.id;
      }
    }

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
      auto_extend,
      allow_negative_user
    } = req.body;

    const startPriceNum = starting_price !== undefined ? Number(starting_price) : null;
    const stepPriceNum = step_price !== undefined ? Number(step_price) : 100000;
    const autoExtendVal = auto_extend === undefined ? true : Boolean(auto_extend);
    const allowNegativeUserVal = String(allow_negative_user || "").toLowerCase() === "true" || allow_negative_user === "on" || allow_negative_user === "1";

    // Validate
    if (!title || !category_id || isNaN(startPriceNum) || startPriceNum <= 0 || isNaN(stepPriceNum) || stepPriceNum <= 0) {
      return res.status(400).json({ success: false, message: 'Thiếu/không hợp lệ: title, category_id, starting_price, step_price' });
    }

    // 1) Update product
    const product = await Product.findOne({ where: { id: productId, seller_id: sellerId } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Xử lý ảnh mới (nếu có upload 4 ảnh mới)
    let thumbnail = product.thumbnail;
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      if (files.length !== 4) {
        // Clean up any temp uploaded files
        for (const f of files) {
          try { fs.unlinkSync(f.path); } catch (_) {}
        }
        return res.status(400).json({
          success: false,
          message: 'Vui lòng tải lên đúng 4 ảnh sản phẩm (bắt buộc 4 ảnh).',
        });
      }
      const productDir = path.join(process.cwd(), 'public', 'uploads', 'products', String(productId));
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
      }
      // Ghi đè 4 ảnh mới
      for (let i = 0; i < 4; i++) {
        const f = files[i];
        const newFilePath = path.join(productDir, `${i}.jpg`);
        try {
          fs.copyFileSync(f.path, newFilePath);
        } finally {
          try { fs.unlinkSync(f.path); } catch (_) {}
        }
      }
      thumbnail = `/uploads/products/${productId}/0.jpg`;
    }

    // Cập nhật mô tả đầy đủ (cho phép sửa trực tiếp)
    let newFullDescription = full_description ?? product.full_description;

    await product.update(
      {
        title,
        category_id,
        short_description: short_description ?? product.short_description,
        full_description: newFullDescription,
        thumbnail,
        allow_negative_user: allowNegativeUserVal,
      },
      { transaction: t }
    );

    // 2) Update auction linked to product
    const auction = await Auction.findOne({ where: { product_id: productId, seller_id: sellerId } });
    if (auction) {
      await auction.update(
        {
          start_price: startPriceNum,
          step_price: stepPriceNum,
          current_price: startPriceNum, // nếu chỉnh giá khởi điểm, cập nhật luôn current_price
          end_time: end_time ? new Date(end_time) : auction.end_time,
          auto_extend: autoExtendVal,
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

    // 1. Xóa ratings liên quan đến các order của product
    await db.query(
      `DELETE r FROM ratings r
      JOIN orders o ON r.order_id = o.id
      JOIN auctions a ON o.auction_id = a.id
      WHERE a.product_id = ?`,
      { replacements: [productId], transaction: t }
    );

    // 2. Xóa orders liên quan đến product
    await db.query(
      `DELETE o FROM orders o
      JOIN auctions a ON o.auction_id = a.id
      WHERE a.product_id = ?`,
      { replacements: [productId], transaction: t }
    );

    // 4. Xóa bids liên quan đến các auctions của product
    await db.query(
      `DELETE b FROM bids b
      JOIN auctions a ON b.auction_id = a.id
      WHERE a.product_id = ?`,
      { replacements: [productId], transaction: t }
    );

    // 5. Xóa questions/answers liên quan đến các auctions của product
    await db.query(
      `DELETE q FROM questions q
      JOIN auctions a ON q.auction_id = a.id
      WHERE a.product_id = ?`,
      { replacements: [productId], transaction: t }
    );
    await db.query(
      `DELETE a FROM answers a
      JOIN questions q ON a.question_id = q.id
      JOIN auctions au ON q.auction_id = au.id
      WHERE au.product_id = ?`,
      { replacements: [productId], transaction: t }
    );

    // Xóa blocked_bidder liên quan đến các auctions của product
    await db.query(
      `DELETE bb FROM blocked_bidders bb
      JOIN auctions a ON bb.auction_id = a.id
      WHERE a.product_id = ?`,
      { replacements: [productId], transaction: t }
    );

    // Xóa auto_bid_rules liên quan đến các auctions của product
    await db.query(
      `DELETE abr FROM auto_bid_rules abr
      JOIN auctions a ON abr.auction_id = a.id
      WHERE a.product_id = ?`,
      { replacements: [productId], transaction: t }
    );

    // Xóa watch_list liên quan đến các auctions của product
    await db.query(
      `DELETE wl FROM watch_list wl
      JOIN auctions a ON wl.auction_id = a.id
      WHERE a.product_id = ?`,
      { replacements: [productId], transaction: t }
    );

    // 6. Xóa auctions (đã có)
    await db.query(
      'DELETE FROM auctions WHERE product_id = ? AND seller_id = ?',
      { replacements: [productId, sellerId], transaction: t }
    );

    // 7. Xóa product (đã có)
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

const listQuestions = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit || '10', 10)));
  const offset = (page - 1) * limit;

  try {
    const [rows] = await db.query(
      `SELECT q.id, q.content AS question, q.created_at,
              u.name AS user_name, p.title AS product_title, p.id AS product_id, a.id AS auction_id,
              ans.content AS answer, ans.created_at AS answered_at
       FROM questions q
       JOIN auctions a ON a.id = q.auction_id
       JOIN products p ON p.id = a.product_id
       LEFT JOIN users u ON u.id = q.asker_id
       LEFT JOIN answers ans ON ans.question_id = q.id
       WHERE a.seller_id = ?
       ORDER BY q.created_at DESC
       LIMIT ? OFFSET ?`,
      { replacements: [req.user.id, limit, offset], raw: true }
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM questions q JOIN auctions a ON a.id = q.auction_id
       WHERE a.seller_id = ?`,
      { replacements: [req.user.id], raw: true }
    );

    return res.render('seller/answer', {
      title: 'Câu hỏi của người mua',
      user: req.user || null,
      questions: rows || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error('listQuestions error:', err);
    return res.status(500).render('error/500', { title: 'Lỗi hệ thống', user: req.user || null });
  }
};

const rateWinner = async (req, res) => {
  try {
    const sellerId = req.user?.id;
    const productId = req.params.id;
    const { order_id, winner_id, score, comment } = req.body;

    // Kiểm tra seller có quyền đánh giá không
    const [[product]] = await db.query(
      `SELECT seller_id FROM products WHERE id = ? LIMIT 1`,
      { replacements: [productId], raw: true }
    );
    if (!product || product.seller_id !== sellerId) {
      return res.status(403).send('Không có quyền đánh giá');
    }

    // Kiểm tra đã đánh giá chưa
    const [[exist]] = await db.query(
      `SELECT id FROM ratings WHERE order_id = ? AND rater_id = ? AND target_user_id = ? LIMIT 1`,
      { replacements: [order_id, sellerId, winner_id], raw: true }
    );
    if (exist) {
      return res.redirect('/seller/products');
    }

    // Lưu đánh giá
    await db.query(
      `INSERT INTO ratings (order_id, rater_id, target_user_id, score, comment, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      { replacements: [order_id, sellerId, winner_id, score, comment], raw: true }
    );

    if (Number(score) === 1) {
      await db.query(
        'UPDATE users SET positive_count = positive_count + 1 WHERE id = ?',
        { replacements: [winner_id], raw: true }
      );
    } else if (Number(score) === -1) {
      await db.query(
        'UPDATE users SET negative_count = negative_count + 1 WHERE id = ?',
        { replacements: [winner_id], raw: true }
      );
    }

    return res.redirect('/seller/products');
  } catch (err) {
    console.error('rateWinner error:', err);
    return res.status(500).send('Lỗi hệ thống');
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
  deleteProduct,
  listQuestions,
  rateWinner
};