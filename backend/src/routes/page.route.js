import { Router } from "express";
import pageController from "../controllers/page.controller.js";

const router = Router();

/**
 * Safety wrapper: tránh crash khi controller thiếu handler (undefined).
 * Express yêu cầu callback là function tại thời điểm define route.
 */
const safe = (primaryName, fallbackName = null) => (req, res, next) => {
  const primary = pageController?.[primaryName];
  const fallback = fallbackName ? pageController?.[fallbackName] : null;
  const fn = typeof primary === "function" ? primary : typeof fallback === "function" ? fallback : null;

  if (!fn) {
    console.error(`[page.route] Missing handler: ${primaryName}${fallbackName ? ` (fallback: ${fallbackName})` : ""}`);
    return res.status(500).send("Missing route handler");
  }
  return fn(req, res, next);
};

router.get("/", safe("index"));
router.get("/login", safe("loginView"));
router.get("/register", safe("registerView"));
router.get("/setting", safe("profileView"));
router.get("/review", safe("reviewView"));
// Ưu tiên itemHistoryView (timeline mới), fallback về profileProductView (legacy)
router.get("/itemHistory", safe("itemHistoryView", "profileProductView"));
router.get("/itemManager", safe("profileAuctionView"));
router.get("/categories/:slug?", safe("categoryView"));
router.get("/product/:id", safe("productDetailView"));
router.post("/auctions/:id/rate-seller", safe("rateSeller"));
router.get("/search", safe("searchView"));
// Trang xác minh OTP – chỉ render giao diện
router.get("/verify-otp", (req, res) => {
  const email = req.query.email || "";
  const purpose = (req.query.purpose || "register").toString().toLowerCase();
  res.render("auth/verify-otp", {
    title: "Xác minh OTP",
    email,
    purpose,
    error: null,
  });
});

router.get("/auctions/:id", safe("showAuction"));

export default router;
