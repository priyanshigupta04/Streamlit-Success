/**
 * Test PDF Generation End-to-End
 * Run with: node backend/utils/testPdfGeneration.js
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const htmlPdf = require('html-pdf');
const cloudinary = require('cloudinary').v2;

console.log('\n🧪 PDF Generation Test\n' + '='.repeat(60));

// Step 1: Test Handlebars template compilation
console.log('\n📋 Step 1: Testing Template Compilation...');
try {
  const templatePath = path.join(__dirname, '../templates/noc.hbs');
  console.log(`   Looking for template at: ${templatePath}`);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error('Template file not found!');
  }
  
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  console.log(`   ✅ Template loaded (${templateContent.length} bytes)`);
  
  const template = handlebars.compile(templateContent);
  console.log('   ✅ Template compiled successfully');
  
  // Step 2: Test data formatting
  console.log('\n📝 Step 2: Testing Data Formatting...');
  const testData = {
    institutionName: 'Test Institute',
    institutionAddress: 'Test Address',
    institutionPhone: '+91-XXXX-XXXX',
    institutionEmail: 'test@institute.edu',
    studentName: 'John Doe',
    enrollmentNo: 'TEST001',
    branch: 'Computer Science',
    academicYear: '2024-2025',
    cgpa: '8.5',
    companyName: 'Google',
    jobTitle: 'Software Engineer',
    jobLocation: 'Bangalore',
    stipend: '50000',
    issueDate: new Date().toLocaleDateString(),
    documentId: 'DOC12345',
  };
  console.log('   ✅ Test data prepared');
  
  // Step 3: Test HTML generation
  console.log('\n🎨 Step 3: Testing HTML Generation...');
  const html = template(testData);
  console.log(`   ✅ HTML generated (${html.length} bytes)`);
  
  if (html.length < 500) {
    console.warn('   ⚠️  HTML is very small - template might not be rendering correctly');
  }
  
  // Step 4: Test PDF conversion
  console.log('\n📄 Step 4: Testing PDF Conversion...');
  const options = {
    format: 'A4',
    orientation: 'portrait',
    timeout: 30000,
  };
  
  htmlPdf.create(html, options).toBuffer((err, buffer) => {
    if (err) {
      console.error(`   ❌ PDF conversion failed: ${err.message}`);
      console.log('\n🔧 Troubleshoot: Make sure html-pdf dependencies are installed');
      console.log('   Run: npm install canvas');
      process.exit(1);
    }
    
    console.log(`   ✅ PDF created successfully (${buffer.length} bytes)`);
    
    // Step 5: Test Cloudinary upload
    console.log('\n☁️  Step 5: Testing Cloudinary Upload...');
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn('   ⚠️  CLOUDINARY_CLOUD_NAME not set');
      console.log('\n✨ Test Result: PDF generation works! Only Cloudinary upload not configured.\n');
      process.exit(0);
    }
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'test/noc',
        public_id: `test_noc_${Date.now()}`,
        format: 'pdf',
      },
      (error, result) => {
        if (error) {
          console.error(`   ❌ Cloudinary upload failed: ${error.message}`);
        } else {
          console.log(`   ✅ Uploaded successfully`);
          console.log(`   📎 URL: ${result.secure_url}`);
        }
        
        console.log('\n✨ All tests completed!\n');
        process.exit(error ? 1 : 0);
      }
    );
    
    uploadStream.end(buffer);
  });
  
} catch (error) {
  console.error(`\n❌ Test Failed: ${error.message}`);
  console.error('\nStack:', error.stack);
  process.exit(1);
}
