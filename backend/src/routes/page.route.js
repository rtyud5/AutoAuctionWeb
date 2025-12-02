import { Router } from "express";
import pageController from "../controllers/page.controller.js";

const router = Router();

router.get("/", pageController.index);
router.get("/login", pageController.loginView);
router.get("/register", pageController.registerView);
router.get("/list", pageController.listAuctions);

// Trang xác minh OTP – chỉ render giao diện
router.get("/verify-otp", (req, res) => {
  res.render("auth/verify-otp");
});

router.get("/auctions/:id", pageController.showAuction);

export default router;
