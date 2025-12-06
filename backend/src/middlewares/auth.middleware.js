import { verifyToken } from "../utils/token.util.js";

const getTokenFromReq = (req) => {
  // Ưu tiên cookie, fallback sang Authorization header
  if (req.cookies?.token) return req.cookies.token;
  const authHeader = req.headers?.authorization;
  if (!authHeader) return null;
  if (authHeader.startsWith("Bearer ")) return authHeader.split(" ")[1];
  return authHeader;
};

const handleUnauth = (req, res) => {
  // Nếu client mong JSON thì trả JSON, còn lại redirect tới trang login
  const wantsJson =
    req.xhr ||
    req.headers.accept?.includes("application/json") ||
    req.path.startsWith("/api");

  if (wantsJson) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  return res.redirect("/login");
};

// Gắn thông tin user + role vào req và res.locals cho mọi request
const attachUser = (req, res, next) => {
  try {
    const token = getTokenFromReq(req);
    if (token) {
      const user = verifyToken(token);
      if (user) {
        req.user = user;

        const normalizedRole = (user.role || "").toString().toLowerCase();
        // Trong DB: 'user' được xem như 'bidder'
        const role =
          !normalizedRole || normalizedRole === "user"
            ? "bidder"
            : normalizedRole;

        res.locals.currentUser = user;
        res.locals.isAuthenticated = true;
        res.locals.role = role;
        res.locals.isAdmin = role === "admin";
        res.locals.isSeller = role === "seller";
        res.locals.isBidder = role === "bidder";
      }
    }
  } catch (err) {
    console.error("auth.middleware.attachUser", err);
  }

  if (!res.locals.role) {
    res.locals.role = "guest";
    res.locals.isAuthenticated = false;
    res.locals.isAdmin = false;
    res.locals.isSeller = false;
    res.locals.isBidder = false;
  }

  return next();
};

// Bắt buộc đã đăng nhập
const requireAuth = (req, res, next) => {
  try {
    const token = getTokenFromReq(req);
    if (!token) return handleUnauth(req, res);
    const user = verifyToken(token);
    if (!user) return handleUnauth(req, res);
    req.user = user;
    return next();
  } catch (err) {
    console.error("auth.middleware.requireAuth", err);
    return handleUnauth(req, res);
  }
};

export { attachUser, requireAuth };
export default requireAuth;
