import express from "express";
import authController from "../controllers/auth.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", authController.register);
router.post("/verify-otp", authController.verifyOtp);
router.post("/login", authController.login);
router.post("/admin-login", authController.loginAsAdmin);

// Forgot password OTP flow (AJAX)
router.post("/forgot/send-otp", authController.forgotSendOtp);
router.post("/forgot/verify-otp", authController.forgotVerifyOtp);
router.post("/logout", auth, authController.logout);
router.get("/logout", auth, authController.logout);

export default router;
