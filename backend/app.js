import express from 'express';
import apiRoutes from './routes/api.js';
import database from './src/db/connection.js'; 

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: database.pool ? 'connected' : 'initializing'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server - database is already initialized in connection.js
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API endpoint: http://localhost:${port}/api/hierarchy`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    await database.close();
    process.exit(0);
});