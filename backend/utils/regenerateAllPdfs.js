/**
 * Regenerate PDFs for all issued documents
 * Run with: node backend/utils/regenerateAllPdfs.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DocumentRequest = require('../models/DocumentRequest');
const { generateNoc } = require('../services/documentGenerator');

async function regenerateAll() {
  try {
    console.log('\n🔄 PDF Regeneration for All Issued Documents\n' + '='.repeat(70));
    
    // Connect to DB
    console.log('\n📚 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected');
    
    // Find all issued NOC requests without URLs
    console.log('\n🔍 Finding issued documents without PDFs...');
    const docs = await DocumentRequest.find({
      type: 'noc',
      overallStatus: 'issued',
      generatedDocUrl: null
    });
    
    console.log(`Found ${docs.length} documents to regenerate\n`);
    
    if (docs.length === 0) {
      console.log('✅ All documents already have PDFs!');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Regenerate each one
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      console.log(`\n📄 Processing document ${i + 1}/${docs.length}`);
      console.log(`   Document ID: ${doc._id}`);
      console.log(`   Student ID: ${doc.studentId}`);
      console.log(`   Job ID: ${doc.jobId}`);
      
      try {
        const result = await generateNoc(doc.studentId, doc.jobId);
        
        if (result.success) {
          console.log(`   ✅ PDF Generated: ${result.pdfUrl}`);
          
          // Save URL to document
          doc.generatedDocUrl = result.pdfUrl;
          doc.generatedAt = result.generatedAt;
          doc.documentVersion = 1;
          await doc.save();
          
          console.log(`   💾 Document updated in database`);
        } else {
          console.error(`   ❌ Generation failed: ${result.error}`);
        }
      } catch (error) {
        console.error(`   💥 Error:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ REGENERATION COMPLETE\n');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

regenerateAll();
