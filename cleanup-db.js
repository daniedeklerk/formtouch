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

async function cleanupDatabase() {
  try {
    console.log('Cleaning up database...');
    
    // Get all forms
    const result = await pool.query('SELECT * FROM forms ORDER BY id');
    const forms = result.rows;
    console.log(`Found ${forms.length} forms in database`);
    
    // Delete all forms and their related data
    for (const form of forms) {
      console.log(`Deleting form: ${form.name} (ID: ${form.id})`);
      // Note: This should cascade delete pages and fields if foreign keys are set up properly
      await pool.query('DELETE FROM forms WHERE id = $1', [form.id]);
    }
    
    console.log('Database cleanup completed');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning up database:', error);
    process.exit(1);
  }
}

cleanupDatabase();
