#!/usr/bin/env node

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function testConnection() {
  console.log(' Testing AWS RDS Connection...\n');
  
  const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  };

  try {
    // 1. Basic connection
    console.log('1. Connecting to RDS...');
    const connection = await mysql.createConnection(config);
    
    // 2. Test query
    console.log('2. Running test query...');
    const [result] = await connection.query('SELECT NOW() as time');
    console.log(`    Server time: ${result[0].time}`);
    
    // 3. Check databases
    console.log('3. Listing databases...');
    const [dbs] = await connection.query('SHOW DATABASES');
    const dbNames = dbs.map(db => db.Database);
    console.log(`    Databases: ${dbNames.join(', ')}`);
    
    // 4. Check if our database exists
    if (dbNames.includes(process.env.DB_NAME)) {
      console.log(`    Database "${process.env.DB_NAME}" exists`);
    } else {
      console.log(`   ⚠️ Database "${process.env.DB_NAME}" not found`);
    }
    
    await connection.end();
    
    console.log('\n All tests passed! Database is ready.');
    return true;
  } catch (error) {
    console.error('\n Connection failed!');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check RDS endpoint:', process.env.DB_HOST);
    console.error('2. Verify security group allows your IP');
    console.error('3. Check database credentials');
    return false;
  }
}

// Run if called directly
if (process.argv[1] === import.meta.url || process.argv[1].includes('test-connection')) {
  const success = await testConnection();
  process.exit(success ? 0 : 1);
}

export default testConnection;