import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import sourceRoutes from './routes/sourceRoutes.js';
import visualizationRoutes from './routes/visualizationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import cdpRoutes from './routes/cdpRoutes.js';
import flowAnalyticRoutes from './routes/flowAnalyticRoutes.js';
import telegrafRoutes from './routes/telegrafRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

// Initialize Redis client for session store
let redisClient;
let sessionStore;

const initializeRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000, // Reduced timeout to fail fast
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis max reconnection attempts reached');
            return new Error('Redis max reconnection attempts reached');
          }
          const delay = Math.min(retries * 100, 3000);
          console.log(`🔄 Reconnecting to Redis in ${delay}ms...`);
          return delay;
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err.message);
    });

    redisClient.on('connect', () => {
      console.log('🔗 Redis Client connecting...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis Client ready');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis Client reconnecting...');
    });

    await redisClient.connect();
    
    // Initialize Redis session store
    sessionStore = new RedisStore({ 
      client: redisClient,
      prefix: 'sess:',
      ttl: 86400 // 24 hours in seconds
    });

    console.log('✅ Redis session store initialized');
    return sessionStore;
  } catch (error) {
    console.error('⚠️  Redis connection failed, falling back to MemoryStore:', error.message);
    console.warn('⚠️  WARNING: MemoryStore will leak memory in production! Use Redis or another store for production environments.');
    return null; // Will use default MemoryStore
  }
};

// Initialize Redis in background (non-blocking)
initializeRedis().catch(err => {
  console.error('⚠️  Redis initialization error:', err.message);
});

// Configure allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5172',
  'http://10.20.50.125:5173',
  'http://10.20.50.125:5172',
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

// Session middleware with Redis store
const sessionConfig = {
  store: sessionStore, // Will use Redis if available, otherwise MemoryStore
  secret: process.env.SESSION_SECRET || 'msti-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for HTTP (development/VPS without HTTPS)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Allow cross-site requests for same domain
  }
};

app.use(session(sessionConfig));

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/visualizations', visualizationRoutes);
app.use('/api/cdp', cdpRoutes);
app.use('/api/flow-analytics', flowAnalyticRoutes);
app.use('/api/telegraf', telegrafRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, closing Redis connection...');
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, closing Redis connection...');
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
});

// Export redisClient for health checks
export { redisClient };

export default app; 