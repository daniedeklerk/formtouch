import { db } from './lib/server/db.js';

async function testDbData() {
  try {
    console.log('Testing database data...');
    
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
        
        // Convert to base64
        const base64Data = page.image_data.toString('base64');
        console.log('Base64 data length:', base64Data.length);
        console.log('Base64 data (first 100 chars):', base64Data.substring(0, 100));
        
        // Try to decode the base64 to see if it's double-encoded
        try {
          const decodedOnce = Buffer.from(base64Data, 'base64');
          console.log('Decoded once length:', decodedOnce.length);
          console.log('Decoded once (first 50 chars):', decodedOnce.toString('utf8', 0, 50));
          
          // Check if the decoded data looks like another base64 string
          const decodedOnceStr = decodedOnce.toString('utf8');
          if (decodedOnceStr.match(/^[A-Za-z0-9+/]+={0,2}$/)) {
            console.log('⚠️  Data appears to be double-encoded base64!');
            
            // Try to decode again
            try {
              const decodedTwice = Buffer.from(decodedOnceStr, 'base64');
              console.log('Decoded twice length:', decodedTwice.length);
              console.log('Decoded twice signature:', decodedTwice.slice(0, 8).toString('hex'));
              
              // Check PNG signature
              const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
              const bufferSignature = decodedTwice.slice(0, 8);
              console.log('PNG signature expected:', pngSignature.toString('hex'));
              console.log('Buffer signature:', bufferSignature.toString('hex'));
              console.log('Signatures match:', pngSignature.equals(bufferSignature));
              
            } catch (error) {
              console.log('❌ Second decode failed:', error.message);
            }
          } else {
            console.log('✅ Data does not appear to be double-encoded');
          }
          
        } catch (error) {
          console.log('❌ First decode failed:', error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testDbData();
