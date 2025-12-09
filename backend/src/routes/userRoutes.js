import express from 'express';
import userController from '../controllers/userController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All user management routes require admin role
router.get('/', requireAdmin, userController.getAllUsers);
router.get('/:id', requireAdmin, userController.getUser);
router.post('/', requireAdmin, userController.createUser);
router.put('/:id', requireAdmin, userController.updateUser);
router.delete('/:id', requireAdmin, userController.deleteUser);

export default router;
