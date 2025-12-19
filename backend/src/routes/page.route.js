import { Router } from "express";
import pageController from "../controllers/page.controller.js";

const router = Router();

router.get("/", pageController.index);
router.get("/login", pageController.loginView);
router.get("/register", pageController.registerView);
router.get("/setting", pageController.profileView);
router.get("/review", pageController.reviewView);
router.get("/itemHistory", pageController.itemHistoryView);
router.get("/itemManager", pageController.profileAuctionView);
router.get("/categories/:slug?", pageController.categoryView);
router.get("/product/:id", pageController.productDetailView);
router.post("/auctions/:id/rate-seller", pageController.rateSeller);
router.get("/search", pageController.searchView);
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

router.get("/auctions/:id", pageController.showAuction);

export default router;
