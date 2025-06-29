import express from 'express';
import authController from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/session', authController.checkSession);

// Admin routes (for seeding default user)
router.post('/create-default-user', authController.createDefaultUser);

// Protected routes example
router.get('/profile', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.session.user
  });
});

export default router; 