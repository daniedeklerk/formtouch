import { db } from './lib/server/db.js';

async function testFixedData() {
  try {
    console.log('Testing fixed database data...');
    
    // Get form with ID 9
    const form = await db.getFormById(9);
    console.log('Form:', form);
    
    if (form) {
      // Get pages for this form
      const pages = await db.getFormPages(9);
      console.log('Pages:', pages);
      
      if (pages.length > 0) {
        const page = pages[0];
        console.log('First page image_data type:', typeof page.image_data);
        console.log('First page image_data is Buffer:', Buffer.isBuffer(page.image_data));
        console.log('First page image_data length:', page.image_data.length);
        
        // Convert to base64 (simulating what the API does)
        const base64Data = page.image_data.toString('base64');
        console.log('Base64 data length:', base64Data.length);
        console.log('Base64 data (first 100 chars):', base64Data.substring(0, 100));
        
        // Try to decode the base64 to see if it's now a valid PNG
        try {
          const decodedOnce = Buffer.from(base64Data, 'base64');
          console.log('Decoded length:', decodedOnce.length);
          console.log('Decoded signature:', decodedOnce.slice(0, 8).toString('hex'));
          
          // Check PNG signature
          const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
          const bufferSignature = decodedOnce.slice(0, 8);
          console.log('PNG signature expected:', pngSignature.toString('hex'));
          console.log('Buffer signature:', bufferSignature.toString('hex'));
          console.log('Signatures match:', pngSignature.equals(bufferSignature));
          
          if (pngSignature.equals(bufferSignature)) {
            console.log('✅ SUCCESS: Data is now correctly encoded as PNG!');
            
            // Test creating a data URL
            const dataUrl = `data:image/png;base64,${base64Data}`;
            console.log('Data URL length:', dataUrl.length);
            console.log('Data URL (first 150 chars):', dataUrl.substring(0, 150));
          } else {
            console.log('❌ FAILED: Data is still not a valid PNG');
          }
          
        } catch (error) {
          console.log('❌ Decode failed:', error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testFixedData();
