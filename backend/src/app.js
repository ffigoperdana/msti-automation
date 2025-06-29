import express from 'express';
import cors from 'cors';
import session from 'express-session';
import sourceRoutes from './routes/sourceRoutes.js';
import visualizationRoutes from './routes/visualizationRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

// Enable CORS with credentials
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'msti-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/visualizations', visualizationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

export default app; 