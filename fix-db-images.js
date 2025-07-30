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

async function fixDoubleEncodedImages() {
  try {
    console.log('Fixing double-encoded images in database...');
    
    // Get all form pages
    const pagesResult = await pool.query('SELECT * FROM form_pages ORDER BY form_id, page_number');
    const pages = pagesResult.rows;
    console.log(`Found ${pages.length} form pages to check`);
    
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;
    
    for (const page of pages) {
      console.log(`\nProcessing page ${page.page_number} for form ${page.form_id} (ID: ${page.id})`);
      
      try {
        // Check if the data is double-encoded
        const base64Data = page.image_data.toString('base64');
        console.log(`  Current data size: ${page.image_data.length} bytes`);
        console.log(`  Base64 size: ${base64Data.length} chars`);
        
        // Try to decode once
        const decodedOnce = Buffer.from(base64Data, 'base64');
        const decodedOnceStr = decodedOnce.toString('utf8');
        
        // Check if it looks like another base64 string
        if (decodedOnceStr.match(/^[A-Za-z0-9+/]+={0,2}$/) && decodedOnceStr.length > 100) {
          console.log(`  ⚠️  Page appears to be double-encoded, fixing...`);
          
          // Decode the base64 again to get the actual PNG data
          const actualPngData = Buffer.from(decodedOnceStr, 'base64');
          
          // Check if it's now a valid PNG
          const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
          const bufferSignature = actualPngData.slice(0, 8);
          
          if (pngSignature.equals(bufferSignature)) {
            console.log(`  ✅ Fixed page ${page.page_number}, new size: ${actualPngData.length} bytes`);
            console.log(`  Size reduction: ${page.image_data.length - actualPngData.length} bytes`);
            
            // Update the database with the corrected data
            await pool.query(
              'UPDATE form_pages SET image_data = $1 WHERE id = $2',
              [actualPngData, page.id]
            );
            
            fixedCount++;
          } else {
            console.log(`  ❌ Page ${page.page_number} is not a valid PNG after double decode`);
            errorCount++;
          }
        } else {
          // Check if it's already a valid PNG
          const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
          const bufferSignature = page.image_data.slice(0, 8);
          
          if (pngSignature.equals(bufferSignature)) {
            console.log(`  ✅ Page ${page.page_number} is already correctly encoded`);
            alreadyCorrectCount++;
          } else {
            console.log(`  ❌ Page ${page.page_number} is neither double-encoded nor valid PNG`);
            console.log(`  Signature: ${bufferSignature.toString('hex')}`);
            errorCount++;
          }
        }
        
      } catch (error) {
        console.log(`  ❌ Error processing page ${page.page_number}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Finished processing images!`);
    console.log(`✅ Fixed: ${fixedCount} pages`);
    console.log(`✅ Already correct: ${alreadyCorrectCount} pages`);
    console.log(`❌ Errors: ${errorCount} pages`);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

fixDoubleEncodedImages();
