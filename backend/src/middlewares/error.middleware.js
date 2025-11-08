module.exports = (err, req, res, next) => {
  console.error("🔥 Error middleware caught:", err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};
