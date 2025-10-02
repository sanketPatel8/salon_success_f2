import "dotenv/config";
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  // connectionString: 'postgresql://postgres:Welcome%40456@localhost:5432/salon_success'
  connectionString: process.env.DATABASE_URL
});

async function testConnection(): Promise<void> {
  console.log(process.env.DATABASE_URL , "process.env.DATABASE_URL")
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully!');

    const res = await client.query('SELECT NOW()');
    console.log('Time from DB:', res.rows[0]);

    client.release();
  } catch (err) {
    console.log(process.env.DATABASE_URL , "process.env.DATABASE_URL")
    console.error('❌ Connection failed:', err);
  } finally {
    await pool.end();
  }
}

testConnection();
