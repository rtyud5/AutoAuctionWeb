// ...existing code...
import db from '../config/db.js';

const isSeller = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    // If user had seller role, verify expiry from DB (to auto-revert when expired)
    const normalizedRole = (user.role || "").toString().toLowerCase();

    if (normalizedRole === "seller") {
      try {
        const [[row]] = await db.query("SELECT seller_expires_at, role FROM users WHERE id = ? LIMIT 1", {
          replacements: [user.id],
          raw: true,
        });

        if (row && row.seller_expires_at) {
          const now = new Date();
          const exp = new Date(row.seller_expires_at);
          if (!isNaN(exp) && exp <= now) {
            // expiry reached: revert role to bidder
            await db.query("UPDATE users SET role = ?, seller_expires_at = NULL WHERE id = ?", {
              replacements: ["bidder", user.id],
              raw: true,
            });
            // reflect change in req.user for this request
            req.user.role = "bidder";
            // forbid seller-only action
            return res.status(403).json({ success: false, message: "Forbidden (seller access expired)" });
          }
        }
      } catch (e) {
        console.error("seller.middleware.expiryCheck", e);
        // continue — fall back to token role
      }
    }

    const role = (req.user.role || "").toString().toLowerCase();
    // allow sellers and admins
    if (role !== "seller" && role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return next();
  } catch (err) {
    console.error("seller.middleware.isSeller", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export { isSeller };
export default isSeller;

