import express from "express";
import authController from "../controllers/auth.controller.js";
import auth from "../middlewares/auth.middleware.js";
import { generateCaptcha } from "../utils/captcha.util.js";

const router = express.Router();

router.post("/register", authController.register);
// provide a lightweight captcha endpoint used by the register form to refresh question
router.get('/captcha', (req, res) => {
	try {
		const { question } = generateCaptcha(req);
		return res.json({ question });
	} catch (err) {
		console.error('captcha route error', err);
		return res.status(500).json({ question: null });
	}
});
router.post("/verify-otp", authController.verifyOtp);
router.post("/login", authController.login);
router.post("/admin-login", authController.loginAsAdmin);

// Forgot password OTP flow (AJAX)
router.post("/forgot/send-otp", authController.forgotSendOtp);
router.post("/forgot/verify-otp", authController.forgotVerifyOtp);
router.post("/logout", auth, authController.logout);
router.get("/logout", auth, authController.logout);

export default router;
