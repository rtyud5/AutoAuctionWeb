// backend/src/controllers/auth.controller.js
import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import { signToken } from "../utils/token.util.js";

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

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password_hash: hash,
      role: "bidder",
      is_active: true,
    });

    issueToken(res, user);
    return res.redirect("/");
  } catch (err) {
    console.error("auth.register error:", err);
    return res.status(500).render("auth/register", {
      error: "Có lỗi hệ thống xảy ra khi đăng ký. Vui lòng thử lại.",
    });
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
  login,
  logout,
  loginAsAdmin,
};
