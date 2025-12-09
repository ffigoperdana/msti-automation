// Authentication middleware
const requireAuth = (req, res, next) => {
  console.log('🔐 requireAuth - Session ID:', req.sessionID);
  console.log('🔐 requireAuth - Session user:', req.session?.user);
  
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
  console.log('👑 requireAdmin - Session user:', req.session?.user);
  console.log('👑 requireAdmin - User role:', req.session?.user?.role);
  
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Hanya admin yang diizinkan.'
    });
  }
};

// Editor role middleware (admin + editor can access)
const requireEditor = (req, res, next) => {
  if (req.session && req.session.user && 
      (req.session.user.role === 'admin' || req.session.user.role === 'editor')) {
    return next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Hanya admin dan editor yang diizinkan.'
    });
  }
};

// Block write operations for viewer (only admin and editor can write)
const requireWrite = (req, res, next) => {
  if (req.session && req.session.user) {
    const role = req.session.user.role;
    if (role === 'admin' || role === 'editor') {
      return next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Anda tidak memiliki izin untuk melakukan perubahan.'
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Silakan login terlebih dahulu.'
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
  requireEditor,
  requireWrite,
  optionalAuth
}; 