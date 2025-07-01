// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  } else {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Silakan login terlebih dahulu.'
    });
  }
};

// Admin role middleware
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Hanya admin yang diizinkan.'
    });
  }
};

// Optional auth middleware (tidak wajib login)
const optionalAuth = (req, res, next) => {
  // Attach user info if session exists, but don't block if not
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }
  next();
};

export {
  requireAuth,
  requireAdmin,
  optionalAuth
}; 