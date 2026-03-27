/**
 * Diagnostic Script - Check document request details
 * Run with: node backend/utils/checkDocuments.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DocumentRequest = require('../models/DocumentRequest');
const User = require('../models/User');
const Job = require('../models/Job');

async function diagnose() {
  try {
    console.log('\n🔍 Document Diagnostics\n' + '='.repeat(70));
    
    // Connect to DB
    console.log('\n📚 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected');
    
    // Find all NOC requests
    console.log('\n📋 Finding all NOC requests...');
    const docs = await DocumentRequest.find({ type: 'noc' })
      .populate('studentId', 'name email enrollmentNo branch')
      .populate('jobId', 'title company location stipend');
    
    console.log(`Found ${docs.length} NOC requests\n`);
    
    if (docs.length === 0) {
      console.log('❌ No NOC requests found!');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Check each document
    docs.slice(0, 3).forEach((doc, idx) => {
      console.log(`\n📄 Document ${idx + 1}:`);
      console.log('   ID:', doc._id);
      console.log('   Status:', doc.overallStatus);
      console.log('   Generated URL:', doc.generatedDocUrl || '❌ NULL');
      console.log('   Generated At:', doc.generatedAt || '❌ NULL');
      
      if (doc.studentId) {
        console.log('\n   Student Details:');
        console.log('      Name:', doc.studentId.name);
        console.log('      Enrollment:', doc.studentId.enrollmentNo || '❌ MISSING');
        console.log('      Branch:', doc.studentId.branch || '❌ MISSING');
      } else {
        console.log('   ❌ Student not populated!');
      }
      
      if (doc.jobId) {
        console.log('\n   Job Details:');
        console.log('      Title:', doc.jobId.title || '❌ MISSING');
        console.log('      Company:', doc.jobId.company || '❌ MISSING');
        console.log('      Location:', doc.jobId.location || '❌ MISSING');
      } else {
        console.log('   ❌ Job not populated!');
      }
      
      console.log('\n   Approvals:');
      console.log('      Mentor:', doc.mentorApproval?.status || 'pending');
      console.log('      HOD:', doc.hodApproval?.status || 'pending');
      console.log('      Dean:', doc.deanApproval?.status || 'pending');
    });
    
    console.log('\n' + '='.repeat(70) + '\n');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

diagnose();
