/**
 * SEED TEST JOBS - Add sample jobs with future deadlines for demonstration
 * Usage: node seedTestJobs.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/streamlit-success';

const testJobs = [
  {
    title: 'Jr. Software Engineer',
    company: 'TechCorp Solutions',
    description: 'We are looking for passionate junior software engineers to join our growing team...',
    domain: 'Software Development',
    requiredSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
    stipend: '₹50,000 - ₹80,000 per month',
    location: 'Bangalore, India',
    companyAddress: '123 Tech Street, Bangalore, Karnataka 560001',
    companyCity: 'Bangalore',
    companyState: 'Karnataka',
    companyWebsite: 'www.techcorp.com',
    companyTechDomain: 'SaaS / Cloud Services',
    duration: '6 months',
    type: 'internship',
    approvalStatus: 'approved',
    status: 'open',
  },
  {
    title: 'Full Stack Developer',
    company: 'InnovateLabs',
    description: 'Join our innovation labs as a full stack developer and build cutting-edge applications...',
    domain: 'Web Development',
    requiredSkills: ['JavaScript', 'React', 'Python', 'AWS'],
    stipend: '₹60,000 - ₹100,000 per month',
    location: 'Hyderabad, India',
    companyAddress: '456 Innovation Drive, Hyderabad, Telangana 500081',
    companyCity: 'Hyderabad',
    companyState: 'Telangana',
    companyWebsite: 'www.innovatelabs.io',
    companyTechDomain: 'AI/ML / Analytics',
    duration: '3 months',
    type: 'internship',
    approvalStatus: 'approved',
    status: 'open',
  },
  {
    title: 'Data Analyst',
    company: 'DataDriven Analytics',
    description: 'Help us analyze complex datasets and provide actionable insights...',
    domain: 'Data Analytics',
    requiredSkills: ['Python', 'SQL', 'Tableau', 'Statistics'],
    stipend: '₹40,000 - ₹70,000 per month',
    location: 'Delhi, India',
    companyAddress: '789 Analytics Plaza, Delhi 110001',
    companyCity: 'Delhi',
    companyState: 'Delhi',
    companyWebsite: 'www.datadriven.com',
    companyTechDomain: 'Data Science / Analytics',
    duration: '4 months',
    type: 'internship',
    approvalStatus: 'approved',
    status: 'open',
  },
  {
    title: 'DevOps Engineer',
    company: 'CloudFirst Systems',
    description: 'Build and maintain cloud infrastructure for our global applications...',
    domain: 'DevOps',
    requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
    stipend: '₹55,000 - ₹90,000 per month',
    location: 'Mumbai, India',
    companyAddress: '321 Cloud Street, Mumbai, Maharashtra 400001',
    companyCity: 'Mumbai',
    companyState: 'Maharashtra',
    companyWebsite: 'www.cloudfirst.io',
    companyTechDomain: 'Cloud Infrastructure',
    duration: '6 months',
    type: 'internship',
    approvalStatus: 'approved',
    status: 'open',
  },
  {
    title: 'Mobile App Developer',
    company: 'AppVenture Studios',
    description: 'Create amazing mobile experiences for millions of users worldwide...',
    domain: 'Mobile Development',
    requiredSkills: ['React Native', 'JavaScript', 'Firebase', 'REST APIs'],
    stipend: '₹45,000 - ₹75,000 per month',
    location: 'Pune, India',
    companyAddress: '654 Mobile Lane, Pune, Maharashtra 411001',
    companyCity: 'Pune',
    companyState: 'Maharashtra',
    companyWebsite: 'www.appventure.com',
    companyTechDomain: 'Mobile / Apps',
    duration: '5 months',
    type: 'internship',
    approvalStatus: 'approved',
    status: 'open',
  },
];

const seedJobs = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find a recruiter user to associate with the jobs
    const recruiter = await User.findOne({ role: 'recruiter' });
    if (!recruiter) {
      console.error('❌ No recruiter found. Please create a recruiter user first.');
      await mongoose.connection.close();
      process.exit(1);
    }
    console.log(`✅ Found recruiter: ${recruiter.email}`);

    // Check existing jobs
    const existingJobCount = await Job.countDocuments();
    console.log(`📊 Existing jobs in database: ${existingJobCount}`);

    // Calculate deadline (30 days from now)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    // Prepare jobs to insert
    const jobsToInsert = testJobs.map(job => ({
      ...job,
      postedBy: recruiter._id,
      deadline: deadline,
    }));

    // Insert jobs
    const insertedJobs = await Job.insertMany(jobsToInsert);
    console.log(`✅ Successfully seeded ${insertedJobs.length} test jobs`);

    // Display inserted jobs
    console.log('\n📋 Inserted Jobs:');
    insertedJobs.forEach((job, index) => {
      console.log(`  ${index + 1}. ${job.title} @ ${job.company} (Deadline: ${job.deadline.toDateString()})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedJobs();
