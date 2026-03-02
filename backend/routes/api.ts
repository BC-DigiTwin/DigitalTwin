import { Router } from 'express';

const router = Router();

// Example route
router.get('/hierarchy/:id', (req, res) => {
  // Implement hierarchy logic or import controller here
  res.json({ success: true, data: {} });
});

export default router;
