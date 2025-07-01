import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

class AuthController {
  // Login endpoint
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username dan password harus diisi'
        });
      }

      // Cari user berdasarkan email (menggunakan username sebagai email)
      const user = await prisma.user.findUnique({
        where: { email: username }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Username atau password salah'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Username atau password salah'
        });
      }

      // Create session
      req.session.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      console.log('Login success - Session ID:', req.sessionID);
      console.log('Login success - Session data:', req.session);

      res.json({
        success: true,
        message: 'Login berhasil',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  }

  // Logout endpoint
  async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Gagal logout'
          });
        }
        
        res.clearCookie('connect.sid');
        res.json({
          success: true,
          message: 'Logout berhasil'
        });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  }

  // Check session endpoint
  async checkSession(req, res) {
    try {
      console.log('Session check - Session ID:', req.sessionID);
      console.log('Session check - Session data:', req.session);
      console.log('Session check - Cookies:', req.headers.cookie);
      
      if (req.session.user) {
        res.json({
          success: true,
          user: req.session.user
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Tidak ada session aktif'
        });
      }
    } catch (error) {
      console.error('Check session error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  }

  // Create default admin user (for seeding)
  async createDefaultUser(req, res) {
    try {
      // Check if admin user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: 'cisco' }
      });

      if (existingUser) {
        return res.json({
          success: true,
          message: 'Default admin user sudah ada'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash('cisco123', 10);

      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          email: 'cisco',
          password_hash: hashedPassword,
          role: 'admin'
        }
      });

      res.json({
        success: true,
        message: 'Default admin user berhasil dibuat',
        user: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role
        }
      });

    } catch (error) {
      console.error('Create default user error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal membuat default user'
      });
    }
  }
}

export default new AuthController(); 