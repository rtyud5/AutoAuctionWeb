// backend/src/controllers/auth.controller.js
import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import { signToken } from "../utils/token.util.js";
import { createOtpToken, sendOtpEmail, verifyOtpToken } from "../services/otp.service.js";

const COOKIE_NAME = "token";

const ADMIN_KEY = process.env.ADMIN_KEY || "admin123";

/**
 * Tạo JWT và set cookie đăng nhập
 */
const issueToken = (res, user) => {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: (user.role || "bidder").toLowerCase(),
  };

  const token = signToken(payload, "7d");

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    // secure: true trong môi trường production với HTTPS
  });

  return token;
};

/**
 * ĐĂNG KÝ
 *  - Thêm user mới với role mặc định = 'bidder'
 *  - Kiểm tra trùng email
 *  - Lưu password_hash
 *  - Đăng nhập luôn sau khi đăng ký thành công
 */
// Step 1: request OTP for registration (create pending payload + send email)
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).render("auth/register", {
        error: "Vui lòng nhập đầy đủ Họ tên, Email và Mật khẩu",
      });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).render("auth/register", {
        error: "Email đã tồn tại, vui lòng dùng email khác",
      });
    }

    // hash password now and store into OTP payload (user is created only after OTP verification)
    const hash = await bcrypt.hash(password, 10);

    const { otp } = await createOtpToken({
      email,
      purpose: "REGISTER",
      payload: {
        name,
        email,
        password_hash: hash,
      },
    });

    await sendOtpEmail({ email, otp, purpose: "REGISTER" });

    // Redirect to OTP verify page (UI is rendered via page.route.js)
    return res.redirect(`/verify-otp?purpose=register&email=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error("auth.register error:", err);
    const code = String(err?.code || "").toUpperCase();
    const msg = String(err?.message || "");

    // Most common failure here is mail config/auth problems.
    const isMailProblem =
      code.startsWith("E") ||
      /MAIL_(HOST|PORT|USER|PASS|FROM)/i.test(msg) ||
      /auth|login|password|credential|smtp|connection|timeout/i.test(msg);

    const friendly = isMailProblem
      ? "Không gửi được email OTP. Vui lòng kiểm tra cấu hình email (MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASS, và MAIL_SECURE nếu dùng port 465)."
      : "Có lỗi hệ thống xảy ra khi đăng ký. Vui lòng thử lại.";

    return res.status(500).render("auth/register", { error: friendly });
  }
};

// Step 2: verify OTP (registration flow) and create user
const verifyOtp = async (req, res) => {
  try {
    const { otp, email, purpose } = req.body || {};
    const p = String(purpose || "register").toLowerCase() === "reset_password" ? "RESET_PASSWORD" : "REGISTER";

    const result = await verifyOtpToken({ email, purpose: p, otp });
    if (!result.ok) {
      const msg =
        result.reason === "NOT_FOUND_OR_EXPIRED"
          ? "OTP không tồn tại hoặc đã hết hạn"
          : result.reason === "TOO_MANY_ATTEMPTS"
            ? "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu OTP mới."
            : "Mã OTP không đúng";

      return res.status(400).render("auth/verify-otp", {
        title: "Xác minh OTP",
        error: msg,
        email,
        purpose: p === "REGISTER" ? "register" : "reset_password",
      });
    }

    if (p !== "REGISTER") {
      return res.redirect("/login");
    }

    const payload = result.token.payload || {};

    // re-check email uniqueness (race condition)
    const existing = await User.findOne({ where: { email: payload.email || email } });
    if (existing) {
      return res.status(409).render("auth/register", {
        error: "Email đã tồn tại, vui lòng dùng email khác",
      });
    }

    const user = await User.create({
      name: payload.name,
      email: payload.email,
      password_hash: payload.password_hash,
      role: "BIDDER",
      is_active: true,
    });

    issueToken(res, user);
    return res.redirect("/");
  } catch (err) {
    console.error("auth.verifyOtp error:", err);
    return res.status(500).render("auth/verify-otp", {
      title: "Xác minh OTP",
      error: "Có lỗi hệ thống xảy ra khi xác minh OTP. Vui lòng thử lại.",
    });
  }
};

// Forgot password: send OTP (always respond success to avoid user enumeration)
const forgotSendOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: "Email là bắt buộc" });
    }

    const user = await User.findOne({ where: { email } });
    if (user) {
      const { otp } = await createOtpToken({ email, purpose: "RESET_PASSWORD" });
      await sendOtpEmail({ email, otp, purpose: "RESET_PASSWORD" });
    }

    return res.json({ success: true, message: "Nếu email tồn tại, hệ thống đã gửi OTP." });
  } catch (err) {
    console.error("auth.forgotSendOtp error:", err);
    return res.status(500).json({ success: false, message: "Có lỗi hệ thống. Vui lòng thử lại." });
  }
};

// Forgot password: verify OTP and reset password to "123"
const forgotVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Thiếu email hoặc OTP" });
    }

    const result = await verifyOtpToken({ email, purpose: "RESET_PASSWORD", otp });
    if (!result.ok) {
      // Requirement: nếu không xác thực đúng thì không làm gì cả
      return res.json({ success: false, message: "OTP không đúng hoặc đã hết hạn" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Do nothing (avoid leaking)
      return res.json({ success: false, message: "OTP không đúng hoặc đã hết hạn" });
    }

    const newHash = await bcrypt.hash("123", 10);
    await user.update({ password_hash: newHash });

    return res.json({
      success: true,
      message: "Mật khẩu đã được reset thành 123. Vui lòng đăng nhập và đổi mật khẩu ngay.",
    });
  } catch (err) {
    console.error("auth.forgotVerifyOtp error:", err);
    return res.status(500).json({ success: false, message: "Có lỗi hệ thống. Vui lòng thử lại." });
  }
};

/**
 * ĐĂNG NHẬP
 *  - Nếu sai thông tin => redirect về /login?error=...
 *  - Không ném lỗi 500 cho case sai email/mật khẩu
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    const invalidMsg = encodeURIComponent("Email hoặc mật khẩu không đúng");

    if (!email || !password) {
      const msg = encodeURIComponent("Vui lòng nhập đầy đủ Email và Mật khẩu");
      return res.redirect(`/login?error=${msg}`);
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.redirect(`/login?error=${invalidMsg}`);
    }

    const ok = await bcrypt.compare(password, user.password_hash || "");

    if (!ok) {
      return res.redirect(`/login?error=${invalidMsg}`);
    }

    issueToken(res, user);
    return res.redirect("/");
  } catch (err) {
    console.error("auth.login error:", err);
    return res.status(500).render("auth/login", {
      error: "Có lỗi hệ thống xảy ra khi đăng nhập. Vui lòng thử lại.",
    });
  }
};

/**
 * ĐĂNG XUẤT
 */
const logout = async (req, res) => {
  try {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: "lax",
    });

    return res.redirect("/");
  } catch (err) {
    console.error("auth.logout error:", err);
    return res.status(500).render("auth/login", {
      error: "Có lỗi hệ thống xảy ra khi đăng xuất. Vui lòng thử lại.",
    });
  }
};



/**
 * ĐĂNG NHẬP ADMIN BẰNG ADMIN KEY
 *  - Dùng popup riêng trên trang login.
 *  - Nếu adminKey đúng thì tìm (hoặc tạo) user role 'ADMIN' và cấp token.
 */
const loginAsAdmin = async (req, res) => {
  try {
    const { adminKey } = req.body || {};

    if (!adminKey) {
      const msg = encodeURIComponent("Vui lòng nhập Admin key");
      return res.redirect(`/login?adminError=${msg}`);
    }

    if (adminKey !== ADMIN_KEY) {
      const msg = encodeURIComponent("Admin key không đúng");
      return res.redirect(`/login?adminError=${msg}`);
    }

    // Tìm user admin, nếu chưa có thì tạo mặc định
    let adminUser = await User.findOne({ where: { role: "ADMIN" } });

    if (!adminUser) {
      const password_hash = await bcrypt.hash(ADMIN_KEY, 10);
      adminUser = await User.create({
        name: "System Admin",
        email: "admin@example.com",
        password_hash,
        role: "ADMIN",
      });
    }

    issueToken(res, adminUser);

    return res.redirect("/admin/dashboard");
  } catch (err) {
    console.error("auth.loginAsAdmin error:", err);
    const msg = encodeURIComponent("Có lỗi hệ thống xảy ra khi đăng nhập Admin");
    return res.redirect(`/login?adminError=${msg}`);
  }
};

export default {
  register,
  verifyOtp,
  login,
  logout,
  loginAsAdmin,
  forgotSendOtp,
  forgotVerifyOtp,
};
