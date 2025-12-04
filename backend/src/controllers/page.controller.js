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

    // Lấy tổng điểm – luôn trả về 0 nếu không có bản ghi
    const [totalPointResult] = await db.query(
      `SELECT COALESCE(SUM(point), 0) AS total FROM reviews WHERE user_id = ?`,
      [userId]
    );
    const totalPoint = totalPointResult?.[0]?.total || 0;

    // Lấy danh sách review – nếu rỗng vẫn trả về []
    const [reviewList] = await db.query(
      `SELECT reviewer, comment, point, avatar 
       FROM reviews 
       WHERE user_id = ?
       ORDER BY id DESC`,
      [userId]
    );

    return res.render("profile/review", {
      title: "my review",
      totalPoint,
      reviewList: reviewList || []   // luôn là array
    });

  } catch (err) {
    console.error("reviewView error:", err);
    
    return res.render("profile/review", {
      title: "my review",
      totalPoint: 0,
      reviewList: []
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
  reviewView
};