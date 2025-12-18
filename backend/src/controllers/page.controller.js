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

export const categoryView = async (req, res) => {
  try {
    const slug = req.params.slug || null;
    const origin = `${req.protocol}://${req.get('host')}`;

    const catRes = await fetch(`${origin}/api/categories`);
    const catJson = await catRes.json();
    const categories = Array.isArray(catJson) ? catJson : (catJson.categories || []);

    const listUrl = slug ? `${origin}/api/categories/${slug}` : `${origin}/api/auctions`;
    const aucRes = await fetch(listUrl);
    const aucJson = await aucRes.json();
    const auctions = Array.isArray(aucJson.data) ? aucJson.data : (aucJson.items || []);
    const pagination = aucJson.pagination || null;

    // Tìm tên danh mục theo slug
    const flat = [];
    (function walk(arr = []) {
      arr.forEach(c => { flat.push(c); if (Array.isArray(c.children)) walk(c.children); });
    })(categories);
    const found = flat.find(c => c.slug === slug);
    const title = slug ? (found?.name || slug) : 'Tất cả danh mục';

    return res.render("categories/categories", {
      title,
      categorySlug: slug,
      categories,
      auctions,
      pagination,
      isAuthenticated: !!req.user,
      currentUser: req.user || null,
      role: (req.user?.role || '').toLowerCase(),
    });
  } catch (err) {
    console.error("page.categoryView", err);
    return res.render("categories/categories", {
      title: "Danh mục",
      categorySlug: null,
      categories: [],
      auctions: [],
      pagination: null,
      isAuthenticated: !!req.user,
      currentUser: req.user || null,
      role: (req.user?.role || '').toLowerCase(),
    });
  }
};

const profileView = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect("/login");
    }

    const userId = req.user.id;

    const [rows] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      { replacements: [userId], raw: true }
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
    if (!userId) return res.redirect("/login");

    // Helper: ảnh fallback theo convention uploads/products/<product_id>/0.jpg
    const ensureImage = (row) => {
      if (row && (!row.image || String(row.image).includes("placeholder"))) {
        const pid = row.product_id || row.id;
        if (pid) row.image = `/uploads/products/${pid}/0.jpg`;
      }
      return row;
    };

    // 1) Đang diễn ra: các phiên mà user đang tham gia (đã bid hoặc đang bật auto-bid)
    let activeAuctions = [];
    try {
      const [rows] = await db.query(
        `
        SELECT DISTINCT
          p.id AS product_id,
          p.title,
          p.thumbnail AS image,
          a.id AS auction_id,
          a.current_price,
          a.end_time
        FROM auctions a
        JOIN products p ON p.id = a.product_id
        LEFT JOIN bids b
          ON b.auction_id = a.id AND b.bidder_id = ?
        LEFT JOIN auto_bid_rules r
          ON r.auction_id = a.id AND r.bidder_id = ? AND r.is_active = 1
        WHERE p.status = 'APPROVED'
          AND a.end_time > NOW()
          AND (b.id IS NOT NULL OR r.id IS NOT NULL)
        ORDER BY a.end_time ASC
        LIMIT 30
        `,
        { replacements: [userId, userId], raw: true }
      );
      activeAuctions = (rows || []).map(ensureImage);
    } catch (e) {
      console.warn("Skip activeAuctions:", e.message);
      activeAuctions = [];
    }

    // 2) Đã thắng: ưu tiên lấy theo orders (buyer_id = user)
    let wonAuctions = [];
    try {
      const [rows] = await db.query(
        `
        SELECT
          p.id AS product_id,
          p.title,
          p.thumbnail AS image,
          o.id AS order_id,
          o.created_at AS win_time,
          a.current_price
        FROM orders o
        JOIN auctions a ON a.id = o.auction_id
        JOIN products p ON p.id = a.product_id
        WHERE o.buyer_id = ?
        ORDER BY o.created_at DESC
        LIMIT 30
        `,
        { replacements: [userId], raw: true }
      );
      wonAuctions = (rows || []).map(ensureImage);
    } catch (e) {
      // Fallback: nếu chưa có orders thì lấy theo winner_id và đã kết thúc
      console.warn("orders query failed, fallback wonAuctions:", e.message);
      try {
        const [rows2] = await db.query(
          `
          SELECT
            p.id AS product_id,
            p.title,
            p.thumbnail AS image,
            a.end_time AS win_time,
            a.current_price
          FROM auctions a
          JOIN products p ON p.id = a.product_id
          WHERE a.current_winner_id = ?
            AND a.end_time <= NOW()
          ORDER BY a.end_time DESC
          LIMIT 30
          `,
          { replacements: [userId], raw: true }
        );
        wonAuctions = (rows2 || []).map(ensureImage);
      } catch (e2) {
        console.warn("Skip wonAuctions:", e2.message);
        wonAuctions = [];
      }
    }

    // 3) Yêu thích: ưu tiên watch_list (schema đã có model), fallback favorites (nếu bạn có bảng khác)
    let favoriteProducts = [];
    try {
      const [rows] = await db.query(
        `
        SELECT DISTINCT
          p.id AS product_id,
          p.title,
          p.thumbnail AS image,
          a.id AS auction_id,
          w.created_at AS liked_at
        FROM watch_list w
        JOIN auctions a ON a.id = w.auction_id
        JOIN products p ON p.id = a.product_id
        WHERE w.user_id = ?
        ORDER BY w.created_at DESC
        LIMIT 60
        `,
        { replacements: [userId], raw: true }
      );
      favoriteProducts = (rows || []).map(ensureImage);
    } catch (e) {
      console.warn("watch_list query failed, fallback favorites:", e.message);
      try {
        const [rows2] = await db.query(
          `
          SELECT DISTINCT
            p.id AS product_id,
            p.title,
            p.thumbnail AS image
          FROM favorites f
          JOIN products p ON p.id = f.product_id
          WHERE f.user_id = ?
          ORDER BY f.created_at DESC
          LIMIT 60
          `,
          { replacements: [userId], raw: true }
        );
        favoriteProducts = (rows2 || []).map(ensureImage);
      } catch (e2) {
        console.warn("Skip favoriteProducts:", e2.message);
        favoriteProducts = [];
      }
    }

    return res.render("profile/auction", {
      title: "Quản lý đấu giá",
      activeAuctions,
      wonAuctions,
      favoriteProducts,
      user: req.user || null,
    });
  } catch (err) {
    console.error("profileAuctionView error:", err);
    return res.render("profile/auction", {
      title: "Quản lý đấu giá",
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
      `SELECT id, start_price, step_price, current_price, current_winner_id, end_time, status
       FROM auctions
       WHERE product_id = ?
       LIMIT 1`,
      { replacements: [id], raw: true }
    );
    const auction = auctionRows?.[0] || {};

    // Lấy auto-bid rule của user hiện tại (nếu đã đăng nhập)
    let myAutoBid = null;
    if (req.user && auction.id) {
      const [ruleRows] = await db.query(
        `SELECT max_amount, is_active
         FROM auto_bid_rules
         WHERE auction_id = ? AND bidder_id = ?
         LIMIT 1`,
        { replacements: [auction.id, req.user.id], raw: true }
      );
      myAutoBid = ruleRows?.[0] || null;
    }


    // Lấy bids (join users để hiển thị bidder_masked)
    const [bidRows] = await db.query(
      `SELECT b.id, b.bidder_id, b.amount, b.is_auto, b.created_at, u.name AS bidder_name
       FROM bids b
       LEFT JOIN users u ON b.bidder_id = u.id
       WHERE b.auction_id = ?
       ORDER BY b.created_at DESC
       LIMIT 20`,
      { replacements: [auction.id || 0], raw: true }
    );

    const maskName = (name) => {
      const s = String(name || '').trim();
      if (!s) return 'Ẩn danh';
      if (s.length <= 2) return s[0] + '*';
      return s[0] + '*'.repeat(Math.min(6, s.length - 2)) + s[s.length - 1];
    };

    const bids = (bidRows || []).map((b) => ({
      ...b,
      bidder_masked: maskName(b.bidder_name),
      bidder_rating: 50, // placeholder để UI không lỗi
    }));

    const [relatedProducts] = await db.query(
      `SELECT p.id AS product_id, p.title, p.thumbnail as image, p.short_description
       FROM products p
       WHERE p.category_id = ? AND p.id != ? AND p.status = 'APPROVED'
       ORDER BY p.created_at DESC
       LIMIT 4`,
      { replacements: [product.category_id, id], raw: true }
    );

    // --- PHÂN TRANG Q&A ---
    const qpage = Math.max(1, parseInt(req.query.qpage) || 1);
    const qlimit = 4;
    const qoffset = (qpage - 1) * qlimit;

    // Tổng số bình luận
    const [[{ totalQna }]] = await db.query(
      `SELECT COUNT(*) AS totalQna FROM questions q
       LEFT JOIN auctions a ON a.id = q.auction_id
       WHERE a.product_id = ?`,
      { replacements: [id], raw: true }
    );

    // Lấy Q&A theo trang
    const [qaRows] = await db.query(
      `SELECT 
         q.id,
         q.content AS question,
         q.created_at,
         u.name AS user_name,
         a.content AS answer,
         a.created_at AS answered_at
       FROM questions q
       LEFT JOIN auctions auc ON auc.id = q.auction_id
       LEFT JOIN users u ON u.id = q.asker_id
       LEFT JOIN answers a ON a.question_id = q.id
       WHERE auc.product_id = ?
       ORDER BY q.created_at DESC
       LIMIT ? OFFSET ?`,
      { replacements: [id, qlimit, qoffset], raw: true }
    );
    const qnas = qaRows || [];

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
        auction_id: auction.id || null,
        current_winner_id: auction.current_winner_id || null,
        start_price: auction.start_price || 0,
        step_price: auction.step_price || 100000,
        current_price: auction.current_price || 0,
        buy_now_price: Math.floor(Number(auction.current_price || auction.start_price || 0) * 1.5),
        end_time: auction.end_time || new Date(Date.now() + 86400000).toISOString(),
        auction_status: auction.status || 'PENDING',
        seller_rating: 100,
        positive_count: 0,
        negative_count: 0,
        total_ratings: reviews.length,
      },
      myAutoBid,
      bids: bids || [],
      reviews,
      qnas,
      qnaPagination: {
        page: qpage,
        limit: qlimit,
        total: totalQna,
        totalPages: Math.max(1, Math.ceil(totalQna / qlimit))
      },
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
}

export default {
  index,
  loginView,
  registerView,
  showAuction,
  categoryView,
  profileView,
  reviewView,
  profileProductView,
  profileAuctionView,
  productDetailView,
};
