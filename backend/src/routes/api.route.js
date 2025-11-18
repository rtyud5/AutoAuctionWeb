import { Router } from "express";
import db from "../config/db.js";

const router = Router();

// Demo API: list auctions as JSON
router.get("/auctions", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, title, current_price, end_time FROM auctions");
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
