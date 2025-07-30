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

async function addMetadataColumns() {
  try {
    console.log('Adding metadata columns to form_pages table...');
    
    // Check if columns already exist
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'form_pages' 
      AND column_name IN ('original_width', 'original_height', 'rendered_width', 'rendered_height', 'paper_size', 'orientation', 'scale', 'dpi')
    `);
    
    const existingColumns = checkResult.rows.map(row => row.column_name);
    console.log('Existing columns:', existingColumns);
    
    const columnsToAdd = [
      'original_width INTEGER',
      'original_height INTEGER', 
      'rendered_width INTEGER',
      'rendered_height INTEGER',
      'paper_size VARCHAR(50)',
      'orientation VARCHAR(20)',
      'scale FLOAT',
      'dpi INTEGER'
    ].filter(colDef => {
      const colName = colDef.split(' ')[0];
      return !existingColumns.includes(colName);
    });
    
    if (columnsToAdd.length === 0) {
      console.log('✅ All metadata columns already exist');
      return;
    }
    
    console.log('Adding columns:', columnsToAdd);
    
    // Add each column
    for (const columnDef of columnsToAdd) {
      await pool.query(`
        ALTER TABLE form_pages 
        ADD COLUMN IF NOT EXISTS ${columnDef}
      `);
      console.log(`✅ Added column: ${columnDef}`);
    }
    
    console.log('🎉 Successfully added all metadata columns');
    
  } catch (error) {
    console.error('Error adding metadata columns:', error);
    throw error;
  }
}

async function main() {
  try {
    await addMetadataColumns();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
