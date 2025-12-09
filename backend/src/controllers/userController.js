import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

class UserController {
  // Get all users (admin only)
  async getAllUsers(req, res) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
          // Exclude password_hash for security
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        users
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data user'
      });
    }
  }

  // Get single user (admin only)
  async getUser(req, res) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User tidak ditemukan'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data user'
      });
    }
  }

  // Create new user (admin only)
  async createUser(req, res) {
    try {
      const { email, password, role } = req.body;

      // Validation
      if (!email || !password || !role) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, dan role harus diisi'
        });
      }

      // Validate role
      if (!['admin', 'editor', 'viewer'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role harus salah satu dari: admin, editor, viewer'
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email sudah terdaftar'
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password_hash,
          role
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'User berhasil dibuat',
        user
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal membuat user'
      });
    }
  }

  // Update user (admin only)
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { email, password, role } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User tidak ditemukan'
        });
      }

      // Prepare update data
      const updateData = {};

      if (email) {
        // Check if email is already used by another user
        const emailExists = await prisma.user.findFirst({
          where: {
            email,
            id: { not: id }
          }
        });

        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: 'Email sudah digunakan oleh user lain'
          });
        }

        updateData.email = email;
      }

      if (password) {
        updateData.password_hash = await bcrypt.hash(password, 10);
      }

      if (role) {
        if (!['admin', 'editor', 'viewer'].includes(role)) {
          return res.status(400).json({
            success: false,
            message: 'Role harus salah satu dari: admin, editor, viewer'
          });
        }
        updateData.role = role;
      }

      // Update user
      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        message: 'User berhasil diupdate',
        user
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengupdate user'
      });
    }
  }

  // Delete user (admin only)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User tidak ditemukan'
        });
      }

      // Prevent deleting yourself
      if (req.session.user.id === id) {
        return res.status(400).json({
          success: false,
          message: 'Tidak dapat menghapus akun sendiri'
        });
      }

      // Delete user
      await prisma.user.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'User berhasil dihapus'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menghapus user'
      });
    }
  }
}

export default new UserController();

