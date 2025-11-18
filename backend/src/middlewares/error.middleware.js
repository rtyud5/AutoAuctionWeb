export const errorHandler = (err, req, res, next) => {
  console.error(err);
  if (req.xhr || req.path.startsWith("/api")) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
  res.status(500).render("error/500", { message: "Internal server error" });
};
