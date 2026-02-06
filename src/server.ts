import app from './app';

// In production, the port comes from environment variables
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log('Press CTRL+C to stop');
});