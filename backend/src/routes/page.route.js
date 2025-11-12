import { Router } from "express";
import db from "../config/db.js";

const router = Router();

router.get("/", async (req, res) => {
  // demo: fetch some auctions
  let auctions = [];
  try {
    const [rows] = await db.query("SELECT id, title, current_price, end_time FROM auctions ORDER BY end_time ASC LIMIT 8");
    auctions = rows;
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

export default router;
