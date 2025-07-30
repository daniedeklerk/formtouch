import { db } from './lib/server/db.js';

async function testPdfMetadata() {
  try {
    console.log('Testing PDF metadata functionality...');
    
    // Get all forms and their pages
    const forms = await db.getForms();
    console.log(`Found ${forms.length} forms`);
    
    for (const form of forms) {
      console.log(`\n📄 Form: ${form.name} (ID: ${form.id})`);
      
      const pages = await db.getFormPages(form.id);
      console.log(`Found ${pages.length} pages`);
      
      for (const page of pages) {
        console.log(`\n  Page ${page.page_number}:`);
        console.log(`    Original dimensions: ${page.original_width || 'N/A'} x ${page.original_height || 'N/A'} points`);
        console.log(`    Rendered dimensions: ${page.rendered_width || 'N/A'} x ${page.rendered_height || 'N/A'} pixels`);
        console.log(`    Paper size: ${page.paper_size || 'N/A'}`);
        console.log(`    Orientation: ${page.orientation || 'N/A'}`);
        console.log(`    Scale: ${page.scale || 'N/A'}`);
        console.log(`    DPI: ${page.dpi || 'N/A'}`);
        console.log(`    Image data size: ${page.image_data.length} bytes`);
        
        // Check if we have valid metadata
        if (page.original_width && page.original_height) {
          const aspectRatio = page.original_width / page.original_height;
          console.log(`    Aspect ratio: ${aspectRatio.toFixed(3)}`);
          
          if (aspectRatio > 1) {
            console.log(`    ✅ Detected as landscape`);
          } else {
            console.log(`    ✅ Detected as portrait`);
          }
        } else {
          console.log(`    ⚠️  No metadata found - this is an old page`);
        }
      }
    }
    
    console.log('\n🎉 PDF metadata test completed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testPdfMetadata();
