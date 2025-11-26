const isSeller = (req, res, next) => {
  try {
    const user = req.user;
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    const role = (user.role || "").toString().toLowerCase();
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
