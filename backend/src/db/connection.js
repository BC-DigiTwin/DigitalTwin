import mysql from 'mysql2/promise';
import dbConfig from './config.js';

class Database {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    try {
      this.pool = mysql.createPool(dbConfig);
      await this.testConnection();
      console.log(' Database pool initialized');
      return this;
    } catch (error) {
      console.error('Failed to initialize database:', error.message);
      throw error;
    }
  }

  async testConnection() {
    let connection;
    try {
      connection = await this.pool.getConnection();
      const [rows] = await connection.query(
        'SELECT NOW() as time, VERSION() as version'
      );
      console.log('   Database connected');
      console.log(`   Server Time: ${rows[0].time}`);
      console.log(`   MySQL: ${rows[0].version}`);
    } finally {
      if (connection) connection.release();
    }
  }

  async query(sql, params = []) {
    try {
      const [results] = await this.pool.execute(sql, params);
      return results;
    } catch (error) {
      console.error('   Query error:', error.message);
      console.error('   SQL:', sql);
      throw error;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('  Database connections closed');
    }
  }
}

const database = new Database();

database.initialize().catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n  Shutting down...');
  await database.close();
  process.exit(0);
});

export default database;