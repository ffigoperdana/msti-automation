import express from 'express';
import cors from 'cors';
import session from 'express-session';
import sourceRoutes from './routes/sourceRoutes.js';
import visualizationRoutes from './routes/visualizationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cdpRoutes from './routes/cdpRoutes.js';

const app = express();

// Configure allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5172',
  'http://192.168.238.10:5173',
  'http://192.168.238.10:5172',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove undefined values

// Enable CORS with credentials
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'msti-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for HTTP (development/VPS without HTTPS)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Allow cross-site requests for same domain
  }
}));

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/visualizations', visualizationRoutes);
app.use('/api/cdp', cdpRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

export default app; 