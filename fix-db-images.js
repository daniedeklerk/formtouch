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

// Proper 1x1 transparent PNG base64
const properPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

async function fixDatabaseImages() {
  try {
    console.log('Fixing database images...');
    
    // Get all form pages
    const pagesResult = await pool.query('SELECT * FROM form_pages');
    const pages = pagesResult.rows;
    console.log(`Found ${pages.length} form pages to fix`);
    
    for (const page of pages) {
      console.log(`Updating page ${page.page_number} for form ${page.form_id}`);
      
      // Update the image data with proper PNG
      await pool.query(
        'UPDATE form_pages SET image_data = $1 WHERE id = $2',
        [Buffer.from(properPngBase64, 'base64'), page.id]
      );
    }
    
    console.log('Database images fixed successfully');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error fixing database images:', error);
    process.exit(1);
  }
}

fixDatabaseImages();
