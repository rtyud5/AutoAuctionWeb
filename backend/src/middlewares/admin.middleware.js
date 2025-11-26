const isAdmin = (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
    return next();
  } catch (err) {
    console.error('admin.middleware.isAdmin', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export { isAdmin };
export default isAdmin;