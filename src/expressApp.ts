import express, { type Application, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';

const app: Application = express();

// 1. Security Middleware
app.use(helmet());
app.use(cors());

// 2. Parsing Middleware
app.use(express.json());

// 3. Routes
app.get('/', (req: Request, res: Response) => {
  res.send('API logic is separated from the server listener!');
});

// 4. Export for server.ts or testing
export default app;