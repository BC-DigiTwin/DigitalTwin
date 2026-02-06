import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import db from './src/db/connection.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const [result] = await db.query('SELECT NOW() as time');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result[0].time,
      service: 'digital-twin-backend'
    });
  } catch (error) {
    res.status(500).json({ error: 'Database not available' });
  }
});

app.get('/api/buildings', async (req, res) => {
  try {
    const buildings = await db.query('SELECT * FROM buildings ORDER BY name');
    res.json(buildings);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🌐 CORS enabled for: ${process.env.CORS_ORIGIN}`);
});