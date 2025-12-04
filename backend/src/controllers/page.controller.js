import db from '../config/db.js';

const index = async (req, res) => {
  let auctions = [];
  try {
    const [endingSoon] = await db.query(
      "SELECT id, title, current_price, end_time FROM auctions WHERE end_time > NOW() ORDER BY end_time ASC LIMIT 5"
    );
    const [highestPrice] = await db.query(
      "SELECT id, title, current_price, end_time FROM auctions ORDER BY current_price DESC LIMIT 5"
    );
    const [mostBids] = await db.query(
      "SELECT a.id, a.title, a.current_price, a.end_time, COALESCE(a.bids_count, (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id)) AS bids_count FROM auctions a ORDER BY bids_count DESC LIMIT 5"
    );
    auctions = { endingSoon, highestPrice, mostBids };
  } catch (e) {
    console.error(e);
  }
  return res.render('home/index', { title: 'Online Auction', auctions });
};

const loginView = (req, res) => res.render('auth/login', { title: 'Đăng nhập' });
const registerView = (req, res) => res.render('auth/register', { title: 'Đăng ký' });

const showAuction = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM auctions WHERE id = ?', [id]);
    const auction = rows[0] || null;
    if (!auction) return res.status(404).render('error/404', { title: 'Không tìm thấy' });
    return res.render('auction/detail', { title: auction.title, auction });
  } catch (e) {
    console.error(e);
    return res.status(500).render('error/500', { title: 'Lỗi server' });
  }
};

const listAuctions = async (req, res) => {
  let rows = [];
  try {
    const [result] = await db.query(
      "SELECT id, title, current_price, end_time, image FROM auctions WHERE end_time > NOW() ORDER BY end_time ASC"
    );
    rows = result;
  } catch (e) {
    console.error("listAuctions DB error:", e);
  }
  return res.render("home/list", { title: "Danh sách", auctions: rows });
};

const profileView = (req, res) => {
  const user = req.user || {
    name: "Guest User",
    email: "guest@example.com",
    avatar: null
  };
  return res.render("profile/setting", {title: 'Cài đặt Profile',
    user
  });
};

const reviewView = async (req, res) => {
  try {
    const userId = req.user?.id || 1;

    // Lấy tổng điểm
    const [totalPointResult] = await db.query(
      `SELECT COALESCE(SUM(point), 0) AS total FROM reviews WHERE user_id = ?`,
      [userId]
    );
    const totalPoint = totalPointResult?.[0]?.total ?? 0;

    // Lấy danh sách review
    const [reviewList] = await db.query(
      `SELECT reviewer, comment, point, avatar 
       FROM reviews 
       WHERE user_id = ?
       ORDER BY id DESC`,
      [userId]
    );

    return res.render("profile/review", {
      title: "My review",
      totalPoint,
      reviewList: reviewList || []   // luôn đảm bảo là array
    });

  } catch (err) {
    console.error("reviewView error:", err);
    
    return res.render("profile/review", {
      title: "My review",
      totalPoint: 0,
      reviewList: []
    });
  }
};

const profileProductView = async (req, res) => {
  try {
    const userId = req.user?.id || 1;

    // --- SẢN PHẨM YÊU THÍCH ---
    const [favoriteList] = await db.query(
      `SELECT p.id, p.name, p.price, p.image
       FROM favorites f
       JOIN products p ON f.product_id = p.id
       WHERE f.user_id = ?`,
      [userId]
    );

    // --- SẢN PHẨM ĐANG ĐẤU GIÁ ---
    const [biddingList] = await db.query(
      `SELECT a.id, a.title AS name, a.current_price AS price, a.image
       FROM bids b
       JOIN auctions a ON b.auction_id = a.id
       WHERE b.user_id = ? AND a.end_time > NOW()
       GROUP BY a.id
       ORDER BY a.end_time ASC`,
      [userId]
    );

    // --- SẢN PHẨM ĐÃ THẮNG ---
    const [wonList] = await db.query(
      `SELECT a.id, a.title AS name, a.current_price AS price, a.image, w.win_date
       FROM winners w
       JOIN auctions a ON w.auction_id = a.id
       WHERE w.user_id = ?
       ORDER BY w.win_date DESC`,
      [userId]
    );

    return res.render("profile/product", {
      title: "Quản lý sản phẩm",
      favoriteList: favoriteList || [],
      biddingList: biddingList || [],
      wonList: wonList || []
    });

  } catch (err) {
    console.error("profileProductView error:", err);

    return res.render("profile/itemHistory", {
      title: "Quản lý sản phẩm",
      favoriteList: [],
      biddingList: [],
      wonList: []
    });
  }
};

const profileAuctionView = async (req, res) => {
  try {
    const userId = req.user?.id || 1;

    // 1. Danh sách sản phẩm đang đấu giá
    const [activeAuctions] = await db.query(
      `SELECT id, title, current_price, bid_count, end_time
       FROM auctions
       WHERE status = 'active' AND user_id = ? 
       ORDER BY end_time ASC`,
      [userId]
    );

    // 2. Danh sách sản phẩm của người thắng đấu giá
    const [wonAuctions] = await db.query(
      `SELECT id, title, final_price, win_time
       FROM auctions
       WHERE status = 'won' AND winner_id = ?
       ORDER BY win_time DESC`,
      [userId]
    );

    // 3. Danh sách yêu thích
    const [favoriteProducts] = await db.query(
      `SELECT p.id, p.name, p.image, p.price
       FROM favorites f
       JOIN products p ON p.id = f.product_id
       WHERE f.user_id = ?`,
      [userId]
    );

    return res.render("profile/auction", {
      title: "Quản lý đấu giá",
      activeAuctions: activeAuctions || [],
      wonAuctions: wonAuctions || [],
      favoriteProducts: favoriteProducts || []
    });

  } catch (err) {
    console.error("profileAuctionView error:", err);
    return res.render("profile/itemManager", {
      title: "Quản lý đấu giá",
      activeAuctions: [],
      wonAuctions: [],
      favoriteProducts: []
    });
  }
};

export default {
  index,
  loginView,
  registerView,
  showAuction,
  listAuctions, 
  profileView,
  reviewView,
  profileProductView,
  profileAuctionView
};