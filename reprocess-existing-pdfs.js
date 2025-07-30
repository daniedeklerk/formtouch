import { db } from './lib/server/db.js';
import { processPdfFile } from './lib/server/pdfProcessor.js';
import { join } from 'path';

async function reprocessExistingPdfs() {
  try {
    console.log('Reprocessing existing PDFs to add metadata...');
    
    // Get all forms
    const forms = await db.getForms();
    console.log(`Found ${forms.length} forms to reprocess`);
    
    for (const form of forms) {
      console.log(`\n📄 Processing form: ${form.name}`);
      console.log(`📁 Folder: ${form.folder_path}`);
      
      // Construct the full PDF file path
      const pdfFilePath = join(form.folder_path, form.name);
      console.log(`📄 Full path: ${pdfFilePath}`);
      
      // Check if the PDF file exists
      const fs = await import('fs');
      if (!fs.existsSync(pdfFilePath)) {
        console.log(`❌ File not found: ${pdfFilePath}`);
        continue;
      }
      
      // Delete existing pages for this form
      console.log(`🗑️  Deleting existing pages for form ${form.id}`);
      await db.deleteFormPages(form.id);
      
      // Reprocess the PDF file
      console.log(`🔄 Reprocessing PDF: ${pdfFilePath}`);
      const success = await processPdfFile(pdfFilePath, form.id);
      
      if (success) {
        console.log(`✅ Successfully reprocessed form: ${form.name}`);
      } else {
        console.log(`❌ Failed to reprocess form: ${form.name}`);
      }
    }
    
    console.log('\n🎉 Finished reprocessing all PDFs!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

reprocessExistingPdfs();
