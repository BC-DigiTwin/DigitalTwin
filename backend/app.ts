import express from 'express';
import apiRouter from './routes/api';

const app = express();

app.use(express.json());
app.use('/api', apiRouter);

// Optional: error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
