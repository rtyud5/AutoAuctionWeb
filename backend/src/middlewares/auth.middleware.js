import { verifyToken } from "../utils/token.util.js";

const getTokenFromReq = (req) => {
  // cookie ưu tiên, fallback Authorization header
  if (req.cookies?.token) return req.cookies.token;
  const authHeader = req.headers?.authorization;
  if (!authHeader) return null;
  if (authHeader.startsWith("Bearer ")) return authHeader.split(" ")[1];
  return authHeader;
};

const handleUnauth = (req, res) => {
  // nếu client mong JSON trả 401 JSON, khác thì redirect tới trang login
  const wantsJson = req.xhr || req.headers.accept?.includes("application/json") || req.path.startsWith("/api");
  if (wantsJson) return res.status(401).json({ success: false, message: "Unauthorized" });
  return res.redirect("/login");
};

export const requireAuth = (req, res, next) => {
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

// default export to match imports like `import auth from '../middlewares/auth.middleware.js'`
export default requireAuth;