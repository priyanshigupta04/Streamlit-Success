/**
 * Quick test to verify Cloudinary is properly configured
 * Run with: node backend/utils/testCloudinary.js
 */

const cloudinary = require('cloudinary').v2;

console.log('🔍 Cloudinary Configuration Status:');
console.log('='.repeat(50));

// Check env variables
console.log('\n📋 Environment Variables:');
console.log(`CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing'}`);
console.log(`CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing'}`);

// Test connection
console.log('\n🔗 Testing API Connection:');
cloudinary.api.ping((error, result) => {
  if (error) {
    console.error('❌ Connection Failed:', error.message);
  } else {
    console.log('✅ Connection Successful');
    console.log(`   Cloud Name: ${result.cloud_name}`);
  }

  console.log('\n✨ Test Complete');
  process.exit(0);
});
