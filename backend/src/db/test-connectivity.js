#!/usr/bin/env node

import 'dotenv/config';
import mysql from 'mysql2/promise';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

console.log('AWS Connectivity Test (Limited Permissions)\n');

async function testRDSDirect() {
  console.log('1. Testing RDS Connection...');
  

  const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD ,
    database: process.env.DB_NAME ,
    ssl: { rejectUnauthorized: false }
  };

  try {
    const conn = await mysql.createConnection(config);
    const [result] = await conn.query('SELECT 1 as test_value');
    console.log('   RDS: CONNECTED');
    await conn.end();
    return true;
  } catch (error) {
    console.log(`   RDS: ERROR - ${error.message}`);
    return false;
  }
}

async function testS3Direct() {
  console.log('\n2. Testing S3 Bucket Access...');
  
  const bucketName = process.env.S3_BUCKET_NAME || 'digital-twin-assets-xxxxx';
  
  try {
    const s3 = new S3Client({
      region: process.env.AWS_REGION || 'us-east-2'
    });

    
    const response = await s3.send(new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1  
    }));
    
    console.log(`   S3: BUCKET ACCESSIBLE - "${bucketName}"`);
    return true;
  } catch (error) {
    console.log(`   S3: ERROR - ${error.message}`);
    console.log(`   TIP: This may require bucket-specific permissions`);
    return false;
  }
}

async function runTests() {
  const rdsOk = await testRDSDirect();
  const s3Ok = await testS3Direct();
  
  console.log('\n' + '='.repeat(40));
  console.log('RESULTS:');
  console.log(`RDS Connection: ${rdsOk ? 'PASS' : 'FAIL'}`);
  console.log(`S3 Bucket Access: ${s3Ok ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(40));
  
  process.exit(rdsOk && s3Ok ? 0 : 1);
}

runTests().catch(console.error);
