import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import mongoose from 'mongoose';
import User from './models/User.js';
import Job from './models/Job.js';

const API_BASE = 'http://localhost:5000/api';

async function testFullPostJobFlow() {
  console.log('=== Step 1: Connecting to MongoDB Atlas ===');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas.');

  const ts = Date.now();
  const empEmail = `emp_postjob_${ts}@test.com`;
  const seekEmail = `seek_postjob_${ts}@test.com`;
  const password = 'Password@123';

  console.log('\n=== Step 2: Registering Verified Employer ===');
  const empRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Apex Catering Services',
      email: empEmail,
      phone: '9876543210',
      password,
      role: 'employer'
    })
  });
  const empData = await empRegRes.json();
  if (!empData.token) throw new Error('Employer registration failed: ' + JSON.stringify(empData));
  const empToken = empData.token;
  const empId = empData.user._id || empData.user.id;
  console.log(`✓ Employer created (ID: ${empId}) with token.`);

  // Mark employer as verified in DB
  await User.findByIdAndUpdate(empId, { isVerified: true, verificationStatus: 'approved' });
  console.log('✓ Employer marked as verified.');

  console.log('\n=== Step 3: Posting a New Job via POST /api/jobs ===');
  const jobPayload = {
    title: 'Senior Event Catering Assistant',
    department: 'Catering',
    type: 'Part-time',
    location: 'Bengaluru, Whitefield',
    pay: '₹600/hr',
    description: 'Responsible for setting up luxury banquet dining tables, serving high-end guests, and handling food stations.',
    tags: ['Catering', 'Hospitality', 'Events']
  };

  const postRes = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${empToken}`
    },
    body: JSON.stringify(jobPayload)
  });

  const postData = await postRes.json();
  console.log('POST Response status:', postRes.status);
  console.log('POST Response body:', postData);

  if (postRes.status !== 201 || !postData.success || !postData.job) {
    throw new Error('Post job failed: ' + JSON.stringify(postData));
  }
  const createdJobId = postData.job._id;
  console.log(`✓ Job posted successfully! Created Job ID: ${createdJobId}`);

  console.log('\n=== Step 4: Verifying document saved in MongoDB Atlas `jobs` collection ===');
  const dbJob = await Job.findById(createdJobId).lean();
  if (!dbJob) throw new Error(`Job ${createdJobId} not found in MongoDB Atlas!`);
  console.log('MongoDB Atlas Job Document:', {
    _id: dbJob._id,
    employer: dbJob.employer,
    title: dbJob.title,
    department: dbJob.department,
    type: dbJob.type,
    location: dbJob.location,
    pay: dbJob.pay,
    status: dbJob.status,
    createdAt: dbJob.createdAt
  });
  if (String(dbJob.employer) !== String(empId)) {
    throw new Error(`Employer ID mismatch in DB job. Expected ${empId}, got ${dbJob.employer}`);
  }
  console.log('✓ MongoDB Atlas record verified successfully!');

  console.log('\n=== Step 5: Verifying Employer GET /api/jobs (Employer Dashboard) ===');
  const empGetRes = await fetch(`${API_BASE}/jobs`, {
    headers: { 'Authorization': `Bearer ${empToken}` }
  });
  const empGetData = await empGetRes.json();
  if (!empGetData.success || !Array.isArray(empGetData.jobs)) {
    throw new Error('Employer GET jobs failed: ' + JSON.stringify(empGetData));
  }
  const foundEmpJob = empGetData.jobs.find(j => String(j._id) === String(createdJobId));
  if (!foundEmpJob) throw new Error('Newly created job missing from Employer GET /api/jobs listing!');
  console.log(`✓ Employer Dashboard GET /api/jobs contains newly posted job "${foundEmpJob.title}".`);

  console.log('\n=== Step 6: Verifying Worker/Seeker GET /api/jobs (Worker Dashboard / Browse Jobs) ===');
  const seekRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Priya Seeker',
      email: seekEmail,
      phone: '9876543211',
      password,
      role: 'seeker'
    })
  });
  const seekData = await seekRegRes.json();
  const seekToken = seekData.token;

  const seekGetRes = await fetch(`${API_BASE}/jobs`, {
    headers: { 'Authorization': `Bearer ${seekToken}` }
  });
  const seekGetData = await seekGetRes.json();
  if (!seekGetData.success || !Array.isArray(seekGetData.jobs)) {
    throw new Error('Worker GET jobs failed: ' + JSON.stringify(seekGetData));
  }
  const foundSeekJob = seekGetData.jobs.find(j => String(j._id) === String(createdJobId));
  if (!foundSeekJob) throw new Error('Newly created job missing from Worker/Seeker GET /api/jobs listing!');
  console.log(`✓ Worker Dashboard GET /api/jobs contains newly posted job "${foundSeekJob.title}" posted by "${foundSeekJob.employer?.name}".`);

  console.log('\n=== Step 7: Verifying Error Handling (e.g. invalid role, missing fields) ===');
  const badPostRes = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${seekToken}` // Seeker trying to post job
    },
    body: JSON.stringify(jobPayload)
  });
  const badPostData = await badPostRes.json();
  console.log('Seeker post job response status (expected 403):', badPostRes.status, badPostData);
  if (badPostRes.status !== 403 || badPostData.success !== false) {
    throw new Error('Expected 403 for seeker posting job');
  }
  console.log('✓ Seeker job posting correctly blocked with message:', badPostData.message);

  const missingFieldsRes = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${empToken}`
    },
    body: JSON.stringify({ title: '' }) // missing required fields
  });
  const missingFieldsData = await missingFieldsRes.json();
  console.log('Missing fields response status (expected 400):', missingFieldsRes.status, missingFieldsData);
  if (missingFieldsRes.status !== 400 || !missingFieldsData.message) {
    throw new Error('Expected 400 with message for missing fields');
  }
  console.log('✓ Missing fields correctly rejected with error message:', missingFieldsData.message);

  await mongoose.disconnect();
  console.log('\n🎉 ALL 12 VERIFICATION STEPS PASSED SUCCESSFULLY! 🎉');
}

testFullPostJobFlow().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
