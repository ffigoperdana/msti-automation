import express from 'express';
import cors from 'cors';
import sourceRoutes from './routes/sourceRoutes.js';
import visualizationRoutes from './routes/visualizationRoutes.js';

const app = express();

// Enable CORS
app.use(cors());

// Middleware
app.use(express.json());

// Routes
app.use('/api/sources', sourceRoutes);
app.use('/api/visualizations', visualizationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

export default app; 