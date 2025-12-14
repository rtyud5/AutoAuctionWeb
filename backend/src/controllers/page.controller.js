import db from "../config/db.js";

const index = async (req, res) => {
  let auctions = { endingSoon: [], highestPrice: [], mostBids: [] };
  try {
    const [endingSoon] = await db.query(
      `SELECT p.id AS product_id, p.title, p.thumbnail AS image, p.short_description,
              c.name as category_name, u.name as seller_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.status = 'APPROVED'
       ORDER BY p.created_at DESC 
       LIMIT 5`,
      { raw: true }
    );

    const [highestPrice] = await db.query(
      `SELECT p.id AS product_id, p.title, p.thumbnail AS image, p.short_description,
              c.name as category_name, u.name as seller_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.status = 'APPROVED'
       ORDER BY p.id DESC 
       LIMIT 5`,
      { raw: true }
    );

    const [mostBids] = await db.query(
      `SELECT p.id AS product_id, p.title, p.thumbnail AS image, p.short_description,
              c.name as category_name, u.name as seller_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.status = 'APPROVED'
       ORDER BY RAND()
       LIMIT 5`,
      { raw: true }
    );

    const fixImage = (p) => {
      if (p.image && !p.image.includes('placeholder')) return;
      p.image = `/uploads/products/${p.product_id}/0.jpg`;
    };

    endingSoon.forEach(fixImage);
    highestPrice.forEach(fixImage);
    mostBids.forEach(fixImage);

    auctions = { endingSoon, highestPrice, mostBids };
  } catch (e) {
    console.error("Error in index controller:", e);
  }
  return res.render("home/index", { title: "Online Auction", auctions, user: req.user || null });
};

const loginView = (req, res) => {
  const rawError = req.query.error;
  const rawAdminError = req.query.adminError;
  const error = rawError ? decodeURIComponent(rawError) : null;
  const adminError = rawAdminError ? decodeURIComponent(rawAdminError) : null;
  return res.render("auth/login", { title: "Đăng nhập", error, adminError });
};

const registerView = (req, res) =>
  res.render("auth/register", { title: "Đăng ký" });

const showAuction = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM auctions WHERE id = ?", [id]);
    const auction = rows[0] || null;
    if (!auction)
      return res.status(404).render("error/404", { title: "Không tìm thấy" });
    return res.render("auction/detail", { title: auction.title, auction });
  } catch (e) {
    console.error(e);
    return res.status(500).render("error/500", { title: "Lỗi server" });
  }
};

const listByCategory = async (req, res, categoryId, view) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 9;
  const offset = (page - 1) * limit;

  try {
    const [countRows] = await db.query(
      "SELECT COUNT(*) as count FROM products WHERE category_id = ? AND status = 'APPROVED'",
      { replacements: [categoryId], raw: true }
    );
    const total = countRows?.[0]?.count || 0;

    const [rows] = await db.query(
      `SELECT 
        p.id AS product_id,
        p.title,
        p.thumbnail as image,
        p.short_description,
        c.name as category_name,
        u.name as seller_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.category_id = ? AND p.status = 'APPROVED'
       ORDER BY p.created_at DESC 
       LIMIT ? OFFSET ?`,
      { replacements: [categoryId, limit, offset], raw: true }
    );

    const [catRows] = await db.query(
      "SELECT name FROM categories WHERE id = ? LIMIT 1",
      { replacements: [categoryId], raw: true }
    );
    const category = catRows?.[0];
    const title = category?.name || "Danh mục";

    const totalPages = Math.ceil(total / limit) || 1;
    const pages = Array.from({ length: totalPages }, (_, i) => ({
      num: i + 1,
      url: `?page=${i + 1}`,
      current: i + 1 === page,
    }));

    const pagination = {
      pages,
      prev: page > 1 ? `?page=${page - 1}` : null,
      next: page < totalPages ? `?page=${page + 1}` : null,
      currentPage: page,
      totalPages,
    };

    return res.render(view, { title, auctions: rows || [], category: categoryId, pagination });
  } catch (e) {
    console.error(`Error in listByCategory:`, e);
    return res.render(view, { 
      title: "Danh mục", 
      auctions: [], 
      category: categoryId, 
      pagination: { pages: [], currentPage: 1, totalPages: 1, prev: null, next: null } 
    });
  }
};

const listElectronics = (req, res) =>
  listByCategory(req, res, "electronics", "categories/electronics");
const listFashion = (req, res) =>
  listByCategory(req, res, "fashion", "categories/fashion");

const profileView = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const userId = req.user.id;

    const [rows] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [userId]
    );

    const dbUser = rows && rows[0];

    const user = dbUser || {
      id: userId,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    };

    return res.render("profile/setting", {
      title: "Cài đặt Profile",
      user,
    });
  } catch (err) {
    console.error("page.profileView", err);
    const fallbackUser = req.user || {
      name: "Guest User",
      email: "guest@example.com",
    };
    return res.render("profile/setting", {
      title: "Cài đặt Profile",
      user: fallbackUser,
    });
  }
};

const reviewView = async (req, res) => {
  if (!req.user) return res.redirect("/login");
  const userId = req.user.id;

  try {
    const [totalPointResult] = await db.query(
      `SELECT COALESCE(SUM(point), 0) AS total FROM reviews WHERE user_id = ?`,
      { replacements: [userId], raw: true }
    );
    const totalPoint = totalPointResult?.[0]?.total ?? 0;

    const [reviewList] = await db.query(
      `SELECT reviewer, comment, point, avatar 
       FROM reviews 
       WHERE user_id = ?
       ORDER BY id DESC`,
      { replacements: [userId], raw: true }
    );

    return res.render("profile/review", {
      title: "My review",
      totalPoint,
      reviewList: reviewList || [],
      user: req.user || null,
    });
  } catch (err) {
    console.error("reviewView error:", err);
    return res.render("profile/review", {
      title: "My review",
      totalPoint: 0,
      reviewList: [],
      user: req.user || null,
    });
  }
};

const profileProductView = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.redirect('/login');

    // --- SẢN PHẨM YÊU THÍCH ---
    const [favoriteList] = await db.query(
      `SELECT p.id, p.title, p.thumbnail as image, p.short_description
       FROM favorites f
       JOIN products p ON f.product_id = p.id
       WHERE f.user_id = ?`,
      { replacements: [userId], raw: true }
    );

    // --- SẢN PHẨM ĐANG ĐẤU GIÁ (nếu có bảng bids + auctions) ---
    let biddingList = [];
    try {
      const [bidData] = await db.query(
        `SELECT p.id, p.title, p.current_price, p.thumbnail as image, p.end_time
         FROM bids b
         JOIN products p ON b.product_id = p.id
         WHERE b.user_id = ? AND p.end_time > NOW()
         GROUP BY p.id
         ORDER BY p.end_time ASC`,
        { replacements: [userId], raw: true }
      );
      biddingList = bidData || [];
    } catch (e) {
      console.warn('Skip biddingList:', e.message);
    }

    // --- SẢN PHẨM ĐÃ THẮNG (nếu có bảng winners) ---
    let wonList = [];
    try {
      const [wonData] = await db.query(
        `SELECT p.id, p.title, p.current_price, p.thumbnail as image
         FROM products p
         WHERE p.seller_id = ? AND p.status = 'SOLD'
         ORDER BY p.updated_at DESC`,
        { replacements: [userId], raw: true }
      );
      wonList = wonData || [];
    } catch (e) {
      console.warn('Skip wonList:', e.message);
    }

    return res.render("profile/product", {
      title: "Quản lý sản phẩm",
      favoriteList: favoriteList || [],
      biddingList,
      wonList,
      user: req.user || null,
    });
  } catch (err) {
    console.error("profileProductView error:", err);
    return res.render("profile/product", {
      title: "Quản lý sản phẩm",
      favoriteList: [],
      biddingList: [],
      wonList: [],
      user: req.user || null,
    });
  }
};

const profileAuctionView = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.redirect('/login');

    // 1. Sản phẩm đang đấu giá (APPROVED, chưa kết thúc)
    let activeAuctions = [];
    try {
      const [activeData] = await db.query(
        `SELECT id, title, thumbnail AS image, end_time
         FROM products
         WHERE status = 'APPROVED' AND end_time > NOW()
         ORDER BY end_time ASC
         LIMIT 10`,
        { raw: true }
      );
      activeAuctions = activeData || [];
    } catch (e) {
      console.warn('Skip activeAuctions:', e.message);
    }

    // 2. Sản phẩm đã thắng (SOLD)
    let wonAuctions = [];
    try {
      const [wonData] = await db.query(
        `SELECT id, title, thumbnail AS image, updated_at AS win_time
         FROM products
         WHERE status = 'SOLD'
         ORDER BY updated_at DESC
         LIMIT 10`,
        { raw: true }
      );
      wonAuctions = wonData || [];
    } catch (e) {
      console.warn('Skip wonAuctions:', e.message);
    }

    // 3. Yêu thích (nếu có bảng favorites)
    let favoriteProducts = [];
    try {
      const [favData] = await db.query(
        `SELECT p.id, p.title, p.thumbnail AS image
         FROM favorites f
         JOIN products p ON p.id = f.product_id
         WHERE f.user_id = ?`,
        { replacements: [userId], raw: true }
      );
      favoriteProducts = favData || [];
    } catch (e) {
      console.warn('Skip favoriteProducts:', e.message);
      favoriteProducts = [];
    }

    return res.render('profile/auction', {
      title: 'Quản lý đấu giá',
      activeAuctions,
      wonAuctions,
      favoriteProducts,
      user: req.user || null,
    });
  } catch (err) {
    console.error('profileAuctionView error:', err);
    return res.render('profile/auction', {
      title: 'Quản lý đấu giá',
      activeAuctions: [],
      wonAuctions: [],
      favoriteProducts: [],
      user: req.user || null,
    });
  }
};

const productDetailView = async (req, res) => {
  const { id } = req.params;

  try {
    const [prodRows] = await db.query(
      `SELECT 
        p.id, p.title, p.short_description, p.full_description, p.thumbnail, p.status,
        p.seller_id, p.category_id,
        c.name as category_name,
        u.name as seller_name,
        u.email as seller_email
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.id = ? AND p.status = 'APPROVED'
       LIMIT 1`,
      { replacements: [id], raw: true }
    );
    const product = prodRows?.[0];

    if (!product) {
      return res.status(404).render("error/404", { 
        title: "Không tìm thấy sản phẩm",
        user: req.user || null
      });
    }

    // Lấy auction info
    const [auctionRows] = await db.query(
      `SELECT start_price, step_price, current_price, end_time, status
       FROM auctions
       WHERE product_id = ?
       LIMIT 1`,
      { replacements: [id], raw: true }
    );
    const auction = auctionRows?.[0] || {};

    // Lấy bids
    const [bids] = await db.query(
      `SELECT id, bidder_id, amount, is_auto, created_at 
       FROM bids 
       WHERE auction_id = (SELECT id FROM auctions WHERE product_id = ?)
       ORDER BY created_at DESC LIMIT 20`,
      { replacements: [id], raw: true }
    );

    const [relatedProducts] = await db.query(
      `SELECT p.id AS product_id, p.title, p.thumbnail as image, p.short_description
       FROM products p
       WHERE p.category_id = ? AND p.id != ? AND p.status = 'APPROVED'
       ORDER BY p.created_at DESC
       LIMIT 4`,
      { replacements: [product.category_id, id], raw: true }
    );

    const imgBase = `/uploads/products/${product.id}`;
    const images = [
      `${imgBase}/0.jpg`,
      `${imgBase}/1.jpg`,
      `${imgBase}/2.jpg`,
      `${imgBase}/3.jpg`,
    ].filter(Boolean);

    let reviews = [];
    try {
      const [ratingRows] = await db.query(
        `SELECT r.id, r.score, r.comment, r.created_at, u.name as user_name
         FROM ratings r
         LEFT JOIN users u ON r.rater_id = u.id
         WHERE r.target_user_id = ?
         ORDER BY r.created_at DESC
         LIMIT 10`,
        { replacements: [product.seller_id], raw: true }
      );

      reviews = (ratingRows || []).map((r) => ({
        ...r,
        user_name: r.user_name || 'Ẩn danh',
        comment: r.comment || 'Không có bình luận',
        rating: r.score === 1 ? 5 : 1,
        images: [
          `/uploads/reviews/${product.id}/0.jpg`,
          `/uploads/reviews/${product.id}/1.jpg`,
          `/uploads/reviews/${product.id}/2.jpg`,
        ],
      }));
    } catch (err) {
      console.warn('Skip ratings:', err.message);
      reviews = [];
    }

    return res.render("home/productDetail", {
      title: product.title,
      user: req.user || null,
      product: {
        id: product.id,
        product_id: product.id,
        title: product.title,
        short_description: product.short_description,
        full_description: product.full_description,
        thumbnail: product.thumbnail,
        image: images[0] || product.thumbnail || null,
        images,
        category_name: product.category_name,
        seller_name: product.seller_name,
        seller_email: product.seller_email,
        seller_id: product.seller_id,
        // Auction data
        start_price: auction.start_price || 0,
        step_price: auction.step_price || 100000,
        current_price: auction.current_price || 0,
        end_time: auction.end_time || new Date(Date.now() + 86400000).toISOString(),
        auction_status: auction.status || 'PENDING',
        seller_rating: 100,
        positive_count: 0,
        negative_count: 0,
        total_ratings: reviews.length,
      },
      bids: bids || [],
      reviews,
      relatedProducts: (relatedProducts || []).map(p => ({
        ...p,
        end_time: new Date(Date.now() + 86400000).toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error in productDetailView:", error);
    return res.status(500).render("error/500", { 
      title: "Lỗi hệ thống",
      user: req.user || null
    });
  }
};

export default {
  index,
  loginView,
  registerView,
  showAuction,
  listElectronics,
  listFashion,
  profileView,
  reviewView,
  profileProductView,
  profileAuctionView,
  productDetailView,
};
