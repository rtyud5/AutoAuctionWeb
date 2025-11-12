import { verifyToken } from "../utils/token.util.js";

export const requireAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) return res.redirect("/login");
  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (e) {
    return res.redirect("/login");
  }
};
