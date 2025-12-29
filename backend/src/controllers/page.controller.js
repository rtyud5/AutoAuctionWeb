import db from "../config/db.js";
import Rating from "../models/rating.model.js";

const index = async (req, res) => {
  let auctions = { endingSoon: [], highestPrice: [], mostBids: [] };
  try {
    // 1. Sản phẩm mới nhất (theo created_at của product)
    const [endingSoon] = await db.query(
      `SELECT p.id AS product_id, p.title, p.thumbnail AS image, p.short_description,
              c.name as category_name, u.name as seller_name,
              a.start_price, a.current_price, a.end_time,
              (SELECT COUNT(*) FROM bids WHERE bids.auction_id = a.id) as bid_count
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN auctions a ON a.product_id = p.id AND a.status = 'RUNNING'
       WHERE p.status = 'APPROVED'
       ORDER BY p.created_at DESC 
       LIMIT 5`,
      { raw: true }
    );

    // 2. Sản phẩm nổi bật (theo giá hiện tại cao nhất)
    const [highestPrice] = await db.query(
      `SELECT p.id AS product_id, p.title, p.thumbnail AS image, p.short_description,
              c.name as category_name, u.name as seller_name,
              a.start_price, a.current_price, a.end_time,
              (SELECT COUNT(*) FROM bids b JOIN auctions aa ON b.auction_id = aa.id WHERE aa.product_id = p.id) as bid_count
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN auctions a ON a.product_id = p.id
       WHERE p.status = 'APPROVED'
       ORDER BY COALESCE(a.current_price, 0) DESC
       LIMIT 5`,
      { raw: true }
    );

    // 3. Sản phẩm đề xuất (theo số lượt đấu giá nhiều nhất)
    const [mostBids] = await db.query(
      `SELECT p.id AS product_id, p.title, p.thumbnail AS image, p.short_description,
              c.name as category_name, u.name as seller_name,
              a.start_price, a.current_price, a.end_time,
              (SELECT COUNT(*) FROM bids b JOIN auctions aa ON b.auction_id = aa.id WHERE aa.product_id = p.id) as bid_count
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN auctions a ON a.product_id = p.id
       WHERE p.status = 'APPROVED'
       ORDER BY bid_count DESC
       LIMIT 5`,
      { raw: true }
    );

    const fixImage = (p) => {
      if (p.image && !p.image.includes("placeholder")) return;
      p.image = `/uploads/products/${p.product_id}/0.jpg`;
    };

    endingSoon.forEach(fixImage);
    highestPrice.forEach(fixImage);
    mostBids.forEach(fixImage);

    auctions = { endingSoon, highestPrice, mostBids };
  } catch (e) {
    console.error("Error in index controller:", e);
  }
  return res.render("home/index", {
    title: "Online Auction",
    auctions,
    user: req.user || null,
  });
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
    const origin = `${req.protocol}://${req.get("host")}`;

    const catRes = await fetch(`${origin}/api/categories`);
    const catJson = await catRes.json();
    const categories = Array.isArray(catJson)
      ? catJson
      : catJson.categories || [];

    const listUrl = slug
      ? `${origin}/api/categories/${slug}`
      : `${origin}/api/auctions`;
    const aucRes = await fetch(listUrl);
    const aucJson = await aucRes.json();
    const auctions = Array.isArray(aucJson.data)
      ? aucJson.data
      : aucJson.items || [];
    const pagination = aucJson.pagination || null;

    // Tìm tên danh mục theo slug
    const flat = [];
    (function walk(arr = []) {
      arr.forEach((c) => {
        flat.push(c);
        if (Array.isArray(c.children)) walk(c.children);
      });
    })(categories);
    const found = flat.find((c) => c.slug === slug);
    const title = slug ? found?.name || slug : "Tất cả danh mục";

    return res.render("categories/categories", {
      title,
      categorySlug: slug,
      categories,
      auctions,
      pagination,
      isAuthenticated: !!req.user,
      currentUser: req.user || null,
      role: (req.user?.role || "").toLowerCase(),
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
      role: (req.user?.role || "").toLowerCase(),
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
    // 1) Score tổng (dựa trên ratings)
    const [scoreRows] = await db.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN score = 1 THEN 1 ELSE 0 END), 0) AS positive,
        COALESCE(SUM(CASE WHEN score = -1 THEN 1 ELSE 0 END), 0) AS negative
      FROM ratings
      WHERE target_user_id = ?
      `,
      { replacements: [userId], raw: true }
    );

    const positive = Number(scoreRows?.[0]?.positive ?? 0);
    const negative = Number(scoreRows?.[0]?.negative ?? 0);
    const net = positive - negative;
    const total = positive + negative;
    const percent = total > 0 ? Math.round((positive / total) * 100) : 0;

    // 2) Lịch sử "đánh giá đã thực hiện"
    const [givenRatings] = await db.query(
      `
      SELECT
        r.id, r.order_id, r.score, r.comment, r.created_at,
        u.name AS target_name,
        p.title AS product_title
      FROM ratings r
      JOIN users u ON u.id = r.target_user_id
      LEFT JOIN orders o ON o.id = r.order_id
      LEFT JOIN auctions a ON a.id = o.auction_id
      LEFT JOIN products p ON p.id = a.product_id
      WHERE r.rater_id = ?
      ORDER BY r.created_at DESC
      LIMIT 200
      `,
      { replacements: [userId], raw: true }
    );

    // 3) Lịch sử "được đánh giá"
    const [receivedRatings] = await db.query(
      `
      SELECT
        r.id, r.order_id, r.score, r.comment, r.created_at,
        u.name AS rater_name,
        p.title AS product_title
      FROM ratings r
      JOIN users u ON u.id = r.rater_id
      LEFT JOIN orders o ON o.id = r.order_id
      LEFT JOIN auctions a ON a.id = o.auction_id
      LEFT JOIN products p ON p.id = a.product_id
      WHERE r.target_user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 200
      `,
      { replacements: [userId], raw: true }
    );

    return res.render("profile/review", {
      title: "Đánh giá",
      user: req.user || null,
      score: { positive, negative, net, percent },
      givenRatings: givenRatings || [],
      receivedRatings: receivedRatings || [],
    });
  } catch (err) {
    console.error("reviewView error:", err);
    return res.render("profile/review", {
      title: "Đánh giá",
      user: req.user || null,
      score: { positive: 0, negative: 0, net: 0, percent: 0 },
      givenRatings: [],
      receivedRatings: [],
    });
  }
};

const itemHistoryView = async (req, res) => {
  if (!req.user) return res.redirect("/login");
  const userId = req.user.id;

  try {
    // 1) BID events
    const [bidRows] = await db.query(
      `
      SELECT
        b.created_at AS at,
        'BID' AS kind,
        p.title,
        b.amount
      FROM bids b
      JOIN auctions a ON a.id = b.auction_id
      JOIN products p ON p.id = a.product_id
      WHERE b.bidder_id = ?
      ORDER BY b.created_at ASC
      `,
      { replacements: [userId], raw: true }
    );

    // 2) AUTO_BID create/update events
    const [ruleRows] = await db.query(
      `
      SELECT
        r.created_at,
        r.updated_at,
        r.max_amount AS amount,
        p.title
      FROM auto_bid_rules r
      JOIN auctions a ON a.id = r.auction_id
      JOIN products p ON p.id = a.product_id
      WHERE r.bidder_id = ?
      `,
      { replacements: [userId], raw: true }
    );

    const autoEvents = [];
    for (const r of ruleRows || []) {
      autoEvents.push({
        at: r.created_at,
        kind: "AUTO_BID",
        title: r.title,
        amount: r.amount,
        is_update: 0,
      });
      if (r.updated_at && String(r.updated_at) !== String(r.created_at)) {
        autoEvents.push({
          at: r.updated_at,
          kind: "AUTO_BID",
          title: r.title,
          amount: r.amount,
          is_update: 1,
        });
      }
    }

    // 3) WIN/LOSE only when auction ended/cancelled and user participated
    const [resultRows] = await db.query(
      `
      SELECT DISTINCT
        a.end_time AS at,
        CASE WHEN a.winner_id = ? THEN 'WIN' ELSE 'LOSE' END AS kind,
        p.title,
        a.current_price AS amount
      FROM auctions a
      JOIN products p ON p.id = a.product_id
      LEFT JOIN bids b ON b.auction_id = a.id AND b.bidder_id = ?
      LEFT JOIN auto_bid_rules r ON r.auction_id = a.id AND r.bidder_id = ?
      WHERE (b.id IS NOT NULL OR r.id IS NOT NULL)
        AND a.end_time <= NOW()
        AND a.status IN ('ENDED','CANCELLED')
      ORDER BY a.end_time ASC
      `,
      { replacements: [userId, userId, userId], raw: true }
    );

    const events = []
      .concat(bidRows || [])
      .concat(autoEvents)
      .concat(resultRows || [])
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    return res.render("profile/itemHistory", {
      title: "Lịch sử đấu giá",
      user: req.user || null,
      events,
    });
  } catch (err) {
    console.error("itemHistoryView error:", err);
    return res.render("profile/itemHistory", {
      title: "Lịch sử đấu giá",
      user: req.user || null,
      events: [],
    });
  }
};

const profileProductView = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.redirect("/login");

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
      console.warn("Skip biddingList:", e.message);
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
      console.warn("Skip wonList:", e.message);
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
  const user = req.user || null;

  try {
    const [prodRows] = await db.query(
      `SELECT 
        p.id, p.title, p.short_description, p.full_description, p.thumbnail, p.images, p.allow_negative_user, p.status,
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
        user: req.user || null,
      });
    }

    // Lấy auction info
    const [auctionRows] = await db.query(
      `SELECT id, start_price, step_price, current_price, current_winner_id, end_time, status, winner_id
      FROM auctions
      WHERE product_id = ?
      LIMIT 1`,
      { replacements: [id], raw: true }
    );
    const auction = auctionRows?.[0] || {};

    // Lấy tên người thắng (nếu có)
    let winner_name = null;
    if (auction.winner_id) {
      const [[winnerUser]] = await db.query(
        `SELECT name FROM users WHERE id = ? LIMIT 1`,
        { replacements: [auction.winner_id], raw: true }
      );
      winner_name = winnerUser?.name || "Ẩn danh";
    }

    // Lấy order liên quan đến auction này và user là người thắng
    let hasRated = false;
    if (
      user &&
      auction.status === "ENDED" &&
      auction.winner_id === user.id &&
      auction.id
    ) {
      const [[order]] = await db.query(
        `SELECT id FROM orders WHERE auction_id = ? AND buyer_id = ? LIMIT 1`,
        { replacements: [auction.id, user.id], raw: true }
      );
      if (order) {
        const [[rating]] = await db.query(
          `SELECT id FROM ratings WHERE order_id = ? AND rater_id = ? LIMIT 1`,
          { replacements: [order.id, user.id], raw: true }
        );
        hasRated = !!rating;
      }
    }

    // Lấy trạng thái watchlist của user hiện tại (để render icon yêu thích)
    let isWatchlisted = false;
    if (req.user && auction.id) {
      const [[w]] = await db.query(
        `SELECT 1 AS ok
         FROM watch_list
         WHERE user_id = ? AND auction_id = ?
         LIMIT 1`,
        { replacements: [req.user.id, auction.id], raw: true }
      );
      isWatchlisted = !!w;
    }

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
      const s = String(name || "").trim();
      if (!s) return "Ẩn danh";
      if (s.length <= 2) return s[0] + "*";
      return s[0] + "*".repeat(Math.min(6, s.length - 2)) + s[s.length - 1];
    };

    const bids = (bidRows || []).map((b) => ({
      ...b,
      bidder_masked: maskName(b.bidder_name),
      bidder_rating: 50, // placeholder để UI không lỗi
    }));

    const [relatedProducts] = await db.query(
      `SELECT p.id AS product_id, p.title, p.thumbnail as image, p.short_description,
              a.id AS auction_id, a.start_price, a.current_price, a.end_time, a.status AS auction_status
       FROM products p
       LEFT JOIN auctions a ON a.product_id = p.id
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

    // Parse images from database (Cloudinary URLs) or fallback to local paths for old data
    let images = [];
    if (product.images) {
      try {
        images = JSON.parse(product.images);
      } catch (e) {
        console.error("Failed to parse product images:", e);
      }
    }

    // Fallback to old local paths if no images in database
    if (!images || images.length === 0) {
      const imgBase = `/uploads/products/${product.id}`;
      images = [
        `${imgBase}/0.jpg`,
        `${imgBase}/1.jpg`,
        `${imgBase}/2.jpg`,
        `${imgBase}/3.jpg`,
      ];
    }

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
        user_name: r.user_name || "Ẩn danh",
        comment: r.comment || "Không có bình luận",
        rating: r.score === 1 ? 5 : 1,
        images: [
          `/uploads/reviews/${product.id}/0.jpg`,
          `/uploads/reviews/${product.id}/1.jpg`,
          `/uploads/reviews/${product.id}/2.jpg`,
        ],
      }));
    } catch (err) {
      console.warn("Skip ratings:", err.message);
      reviews = [];
    }

    // ===== Permission for bidder interactions (auto-bid / buy-now) =====
    let interaction = {
      blocked: false,
      reason: null,
      type: null,
      reputation: null,
      allow_negative_user: Boolean(product.allow_negative_user),
    };

    if (user && auction.id) {
      // Seller cannot bid on own product
      if (Number(user.id) === Number(product.seller_id)) {
        interaction.blocked = true;
        interaction.type = "SELLER";
        interaction.reason = "Bạn là người bán của sản phẩm này.";
      } else {
        // Seller-block list
        const [[bb]] = await db.query(
          `SELECT reason FROM blocked_bidders WHERE auction_id = ? AND bidder_id = ? LIMIT 1`,
          { replacements: [auction.id, user.id], raw: true }
        );
        if (bb) {
          interaction.blocked = true;
          interaction.type = "BLOCKED_BY_SELLER";
          interaction.reason = bb.reason
            ? `Bạn đã bị người bán chặn: ${bb.reason}`
            : "Bạn đã bị người bán chặn khỏi phiên đấu giá này.";
        } else {
          // Reputation threshold (<5) only applies when product does NOT allow negative user
          const [[uRow]] = await db.query(
            `SELECT positive_count, negative_count FROM users WHERE id = ? LIMIT 1`,
            { replacements: [user.id], raw: true }
          );
          const pos = Number(uRow?.positive_count || 0);
          const neg = Number(uRow?.negative_count || 0);
          const rep = 10 + pos - neg;
          interaction.reputation = rep;

          if (!interaction.allow_negative_user && rep < 5) {
            interaction.blocked = true;
            interaction.type = "NEGATIVE_USER";
            interaction.reason = `Điểm uy tín của bạn (${rep}) < 5, nên không được phép bid / auto-bid / mua ngay ở sản phẩm này.`;
          }
        }
      }
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
        hasRated,
        // Auction data
        auction_id: auction.id || null,
        isWatchlisted,
        current_winner_id: auction.current_winner_id || null,
        start_price: auction.start_price || 0,
        step_price: auction.step_price || 100000,
        current_price: auction.current_price || 0,
        buy_now_price: Math.floor(
          Number(auction.current_price || auction.start_price || 0) * 1.5
        ),
        end_time: auction.end_time
          ? new Date(auction.end_time).toISOString()
          : new Date(Date.now() + 86400000).toISOString(),
        end_time_ms: auction.end_time
          ? new Date(auction.end_time).getTime()
          : Date.now() + 86400000,
        auction_status: auction.status || "PENDING",
        status: auction.status || "PENDING",
        winner_id: auction.winner_id || null,
        winner_name: winner_name || "Ẩn danh",
        seller_rating: 100,
        positive_count: 0,
        negative_count: 0,
        total_ratings: reviews.length,
      },
      interaction,
      myAutoBid,
      bids: bids || [],
      reviews,
      qnas,
      qnaPagination: {
        page: qpage,
        limit: qlimit,
        total: totalQna,
        totalPages: Math.max(1, Math.ceil(totalQna / qlimit)),
      },
      relatedProducts: (relatedProducts || []).map((p) => ({
        id: p.product_id,
        product_id: p.product_id,
        title: p.title,
        image: p.image,
        thumbnail: p.image,
        short_description: p.short_description,
        auction_id: p.auction_id || null,
        start_price: p.start_price || 0,
        current_price: typeof p.current_price !== 'undefined' && p.current_price !== null ? p.current_price : null,
        buy_now_price: Math.floor((p.current_price || p.start_price || 0) * 1.5),
        end_time: p.end_time ? new Date(p.end_time).toISOString() : null,
        end_time_ms: p.end_time ? new Date(p.end_time).getTime() : null,
        auction_status: p.auction_status || 'PENDING',
      })),
    });
  } catch (error) {
    console.error("Error in productDetailView:", error);
    return res.status(500).render("error/500", {
      title: "Lỗi hệ thống",
      user: req.user || null,
    });
  }
};

/**
 * Search View - Full-text search cho products
 */
const searchView = async (req, res) => {
  try {
    const query = req.query.q || "";
    const categoryId = req.query.category || "";
    const sortBy = req.query.sort || "relevance"; // relevance, price_asc, price_desc, newest
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 12;
    const offset = (page - 1) * limit;

    let results = [];
    let total = 0;
    let categories = [];

    // Lấy danh sách categories để hiển thị filters
    try {
      const [catRows] = await db.query(
        `SELECT id, name, slug FROM categories WHERE parent_id IS NULL ORDER BY name ASC`,
        { raw: true }
      );
      categories = catRows || [];
    } catch (e) {
      console.warn("Skip categories:", e.message);
    }

    // Nếu có query search
    if (query.trim()) {
      const searchWords = query.trim().replace(/\s+/g, " ");
      const searchPattern = `%${searchWords}%`;

      // Kiểm tra FULLTEXT index có sẵn không
      let hasFulltext = false;
      try {
        await db.query(
          `SELECT 1 FROM products 
           WHERE MATCH(title, short_description, full_description) AGAINST(? IN NATURAL LANGUAGE MODE) LIMIT 1`,
          { replacements: [searchWords], raw: true }
        );
        hasFulltext = true;
      } catch (e) {
        console.warn("FULLTEXT index not available, using LIKE fallback");
        hasFulltext = false;
      }

      // Build WHERE clause và replacements cho COUNT query
      let whereClause = `p.status = 'APPROVED'`;
      let whereReplacements = [];

      if (hasFulltext) {
        whereClause += ` AND MATCH(p.title, p.short_description, p.full_description) AGAINST(? IN NATURAL LANGUAGE MODE)`;
        whereReplacements.push(searchWords);
      } else {
        whereClause += ` AND (p.title LIKE ? OR p.short_description LIKE ? OR p.full_description LIKE ?)`;
        whereReplacements.push(searchPattern, searchPattern, searchPattern);
      }

      if (categoryId) {
        whereClause += ` AND p.category_id = ?`;
        whereReplacements.push(categoryId);
      }

      // COUNT total
      const [[{ total: totalCount }]] = await db.query(
        `SELECT COUNT(*) AS total FROM products p WHERE ${whereClause}`,
        { replacements: whereReplacements, raw: true }
      );
      total = totalCount || 0;

      // Build SELECT clause, ORDER BY, và replacements cho main query
      let selectRelevance = "0";
      let orderBy = "p.created_at DESC";
      let selectReplacements = []; // Replacements cho SELECT clause
      let orderReplacements = []; // Replacements cho ORDER BY

      if (sortBy === "relevance") {
        if (hasFulltext) {
          selectRelevance = `MATCH(p.title, p.short_description, p.full_description) AGAINST(? IN NATURAL LANGUAGE MODE)`;
          selectReplacements.push(searchWords);
          orderBy = `relevance_score DESC, p.created_at DESC`;
        } else {
          selectRelevance = `(CASE 
            WHEN p.title LIKE ? THEN 3 
            WHEN p.short_description LIKE ? THEN 2 
            WHEN p.full_description LIKE ? THEN 1 
            ELSE 0 END)`;
          selectReplacements.push(searchPattern, searchPattern, searchPattern);
          orderBy = `relevance_score DESC, p.created_at DESC`;
        }
      } else if (sortBy === "price_asc") {
        orderBy = "a.current_price ASC, p.created_at DESC";
      } else if (sortBy === "price_desc") {
        orderBy = "a.current_price DESC, p.created_at DESC";
      } else if (sortBy === "newest") {
        orderBy = "p.created_at DESC";
      }

      // Query lấy kết quả - build replacements theo đúng thứ tự trong SQL
      const [rows] = await db.query(
        `SELECT 
          p.id AS product_id, 
          p.title, 
          p.thumbnail AS image, 
          p.short_description,
          c.name AS category_name,
          u.name AS seller_name,
          a.current_price,
          a.end_time,
          ${selectRelevance} AS relevance_score
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN users u ON p.seller_id = u.id
         LEFT JOIN auctions a ON a.product_id = p.id
         WHERE ${whereClause}
         ORDER BY ${orderBy}
         LIMIT ? OFFSET ?`,
        {
          replacements: [
            ...selectReplacements, // Cho SELECT clause
            ...whereReplacements, // Cho WHERE clause
            limit, // Cho LIMIT
            offset, // Cho OFFSET
          ],
          raw: true,
        }
      );

      results = (rows || []).map((p) => {
        // Fix image path
        if (!p.image || p.image.includes("placeholder")) {
          p.image = `/uploads/products/${p.product_id}/0.jpg`;
        }
        return p;
      });
    }

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };

    return res.render("search/results", {
      title: query ? `Tìm kiếm: ${query}` : "Tìm kiếm sản phẩm",
      query,
      categoryId,
      sortBy,
      results,
      categories,
      pagination,
      isAuthenticated: !!req.user,
      currentUser: req.user || null,
      role: (req.user?.role || "").toLowerCase(),
    });
  } catch (err) {
    console.error("page.searchView error:", err);
    return res.render("search/results", {
      title: "Tìm kiếm sản phẩm",
      query: req.query.q || "",
      categoryId: "",
      sortBy: "relevance",
      results: [],
      categories: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 1 },
      isAuthenticated: !!req.user,
      currentUser: req.user || null,
      role: (req.user?.role || "").toLowerCase(),
    });
  }
};

export const rateSeller = async (req, res) => {
  try {
    const auctionId = req.params.id;
    const userId = req.user?.id;
    const { comment, rating } = req.body;

    // Lấy order liên quan đến auction này và user là người thắng
    const [[order]] = await db.query(
      `SELECT o.id, o.buyer_id, a.seller_id
      FROM orders o
      JOIN auctions a ON a.id = o.auction_id
      WHERE o.auction_id = ? LIMIT 1`,
      { replacements: [auctionId], raw: true }
    );
    if (!order || order.buyer_id !== userId) {
      return res.status(403).send("Bạn không có quyền đánh giá");
    }

    // Kiểm tra đã đánh giá chưa
    const exist = await Rating.findOne({
      where: {
        order_id: order.id,
        rater_id: userId,
        target_user_id: order.seller_id,
      },
    });
    if (exist) {
      return res.status(400).send("Bạn đã đánh giá rồi");
    }

    // Lưu vào bảng ratings
    await Rating.create({
      order_id: order.id,
      rater_id: userId,
      target_user_id: order.seller_id,
      score: Number(rating),
      comment,
    });

    if (Number(rating) === 1) {
      await db.query(
        `UPDATE users SET positive_count = positive_count + 1 WHERE id = ?`,
        { replacements: [order.seller_id], raw: true }
      );
    } else if (Number(rating) === -1) {
      await db.query(
        `UPDATE users SET negative_count = negative_count + 1 WHERE id = ?`,
        { replacements: [order.seller_id], raw: true }
      );
    }

    return res.redirect(req.get("Referrer") || "/");
  } catch (err) {
    console.error("rateSeller error:", err);
    return res.status(500).send("Lỗi hệ thống");
  }
};

export default {
  index,
  loginView,
  registerView,
  showAuction,
  categoryView,
  profileView,
  reviewView,
  itemHistoryView,
  profileProductView,
  profileAuctionView,
  productDetailView,
  searchView,
  rateSeller,
};
