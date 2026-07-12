import './config/env.js';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import researchRoutes from './routes/research.js';
import historyRoutes from './routes/history.js';
import compareRoutes from './routes/compare.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB once at startup
connectDB();

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Register routers
app.use('/api/auth', authRoutes);
app.use('/api/research', researchRoutes);
app.use('/api', historyRoutes); // Mounts /history and /research/:id
app.use('/api', compareRoutes); // Mounts /compare

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`[server] Server running on port ${PORT}`);
});
