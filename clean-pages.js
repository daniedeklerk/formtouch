import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  ssl: process.env.PG_SSL === 'true',
});

async function cleanPages() {
  try {
    console.log('Cleaning up form pages...');
    
    // Delete all form pages
    const result = await pool.query('DELETE FROM form_pages');
    console.log(`Deleted ${result.rowCount} form pages`);
    
    console.log('Form pages cleaned up successfully');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up form pages:', error);
    process.exit(1);
  }
}

cleanPages();
