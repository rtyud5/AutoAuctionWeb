import { Router } from "express";
import db from "../config/db.js";

const router = Router();

router.get("/", async (req, res) => {
  // demo: fetch some auctions
  let auctions = [];
  try {
    // Top 5 ending soon
    const [endingSoon] = await db.query(
      "SELECT id, title, current_price, end_time FROM auctions WHERE end_time > NOW() ORDER BY end_time ASC LIMIT 5"
    );
    // Top 5 highest price
    const [highestPrice] = await db.query(
      "SELECT id, title, current_price, end_time FROM auctions ORDER BY current_price DESC LIMIT 5"
    );
    // Top 5 most bids (assumes bids_count column or computed)
    const [mostBids] = await db.query(
      "SELECT a.id, a.title, a.current_price, a.end_time, COALESCE(a.bids_count, (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id)) AS bids_count FROM auctions a ORDER BY bids_count DESC LIMIT 5"
    );
    auctions = { endingSoon, highestPrice, mostBids };
  } catch (e) {
    console.error(e);
  }
  res.render("home/index", { title: "Online Auction", auctions });
});

router.get("/login", (req, res) => {
  res.render("auth/login", { title: "Đăng nhập" });
});

router.get("/register", (req, res) => {
  res.render("auth/register", { title: "Đăng ký" });
});

router.get("/auctions/:id", async (req, res) => {
  const { id } = req.params;
  let auction = null;
  try {
    const [rows] = await db.query("SELECT * FROM auctions WHERE id = ?", [id]);
    auction = rows[0] || null;
  } catch (e) {
    console.error(e);
  }
  if (!auction) return res.status(404).render("error/404", { title: "Không tìm thấy" });
  res.render("auction/detail", { title: auction.title, auction });
});

module.exports = router;