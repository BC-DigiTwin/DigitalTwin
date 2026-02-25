import 'dotenv/config';

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false },
  
  timezone: 'Z',
  charset: 'utf8mb4'
};

const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
  console.error('  Missing environment variables:', missing);
  process.exit(1);
}

console.log(`  Database config loaded for: ${process.env.DB_NAME}`);
console.log(`  Host: ${process.env.DB_HOST}`);

export default dbConfig;