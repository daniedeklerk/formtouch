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

async function checkDatabaseData() {
  try {
    console.log('Checking database data...');
    
    // Get all forms
    const formsResult = await pool.query('SELECT * FROM forms ORDER BY id');
    const forms = formsResult.rows;
    console.log(`Found ${forms.length} forms in database`);
    
    for (const form of forms) {
      console.log(`\nForm: ${form.name} (ID: ${form.id})`);
      
      // Get pages for this form
      const pagesResult = await pool.query('SELECT * FROM form_pages WHERE form_id = $1 ORDER BY page_number', [form.id]);
      const pages = pagesResult.rows;
      console.log(`  Pages: ${pages.length}`);
      
      for (const page of pages) {
        console.log(`    Page ${page.page_number}:`);
        console.log(`      Image data type: ${typeof page.image_data}`);
        console.log(`      Image data length: ${page.image_data.length}`);
        console.log(`      Is Buffer: ${Buffer.isBuffer(page.image_data)}`);
        
        // Try to convert to base64 and check first few characters
        try {
          const base64 = page.image_data.toString('base64');
          console.log(`      Base64 length: ${base64.length}`);
          console.log(`      Base64 preview: ${base64.substring(0, 50)}...`);
        } catch (error) {
          console.error(`      Error converting to base64:`, error);
        }
      }
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error checking database data:', error);
    process.exit(1);
  }
}

checkDatabaseData();
