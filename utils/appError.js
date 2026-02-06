// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');

// Route imports (create these routers in routes/ folder)
const locationsRouter = require('./routes/locationsRouter');
const buildingsRouter = require('./routes/buildingsRouter');
const floorsRouter = require('./routes/floorsRouter');
const roomsRouter = require('./routes/roomsRouter');
const usersRouter = require('./routes/usersRouter');

const app = express();

// 1. ALL YOUR MIDDLEWARE (body-parser, logger, etc.)
// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware (optional - uncomment if you want to log requests)
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.originalUrl}`);
//   next();
// });

// 2. ALL YOUR ACTUAL ROUTES
// Digital Twin Campus Routes - Hierarchical Location System
app.use('/api/v1/locations', locationsRouter);        // Get all locations in hierarchy
app.use('/api/v1/buildings', buildingsRouter);        // Get/create buildings
app.use('/api/v1/floors', floorsRouter);              // Get/create floors
app.use('/api/v1/rooms', roomsRouter);                // Get/create rooms
app.use('/api/v1/users', usersRouter);                // User authentication & profiles

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'Server is running' });
});

// 3. THE "CATCH-ALL" FOR UNDEFINED ROUTES
// If the code reaches this point, it means no route matched.
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 4. THE GLOBAL ERROR HANDLING MIDDLEWARE
// Express knows this is the error handler because it has 4 arguments.
app.use(globalErrorHandler);

module.exports = app;