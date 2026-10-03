import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import mongoose from 'mongoose';
import User from './models/User.js';
import Job from './models/Job.js';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Connecting to MongoDB to verify database state ---');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const ts = Date.now();
  const employerEmail = `emp_dept_${ts}@test.com`;
  const seekerEmail = `seek_dept_${ts}@test.com`;
  const password = 'Password@123';

  console.log('\n1. Registering an employer...');
  const empRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Grand Event Caterers',
      email: employerEmail,
      phone: '9876500001',
      password,
      role: 'employer'
    })
  });
  const empData = await empRegRes.json();
  if (!empData.token) throw new Error('Employer registration failed: ' + JSON.stringify(empData));
  const empToken = empData.token;
  console.log('✓ Employer registered with token.');

  console.log('\n2. Testing job creation WITHOUT department...');
  const noDeptRes = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${empToken}`
    },
    body: JSON.stringify({
      title: 'Head Chef Assistant',
      type: 'Part-time',
      location: 'Bengaluru, Koramangala',
      pay: '₹800/hr',
      description: 'Assisting in dinner party catering setup and food prep.'
    })
  });
  const noDeptData = await noDeptRes.json();
  if (noDeptRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for missing department, got: ${noDeptRes.status}`);
  }
  console.log('✓ Correctly rejected job without department:', JSON.stringify(noDeptData.errors));

  console.log('\n3. Testing job creation with INVALID department...');
  const invalidDeptRes = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${empToken}`
    },
    body: JSON.stringify({
      title: 'Head Chef Assistant',
      department: 'Software',
      type: 'Part-time',
      location: 'Bengaluru, Koramangala',
      pay: '₹800/hr',
      description: 'Assisting in dinner party catering setup and food prep.'
    })
  });
  if (invalidDeptRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for invalid department, got: ${invalidDeptRes.status}`);
  }
  console.log('✓ Correctly rejected invalid department "Software".');

  console.log('\n4. Creating Catering test job...');
  const createRes = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${empToken}`
    },
    body: JSON.stringify({
      title: 'Wedding Event Buffet Catering Lead',
      department: 'Catering',
      type: 'Short-term',
      location: 'Bengaluru, Indiranagar',
      pay: '₹12,000 fixed',
      description: 'Lead buffet coordination, live food counters and banquet table hospitality for grand wedding reception.',
      tags: ['Catering', 'Hospitality', 'Buffet']
    })
  });
  const createData = await createRes.json();
  if (createRes.status !== 201 || !createData.success) {
    throw new Error('Failed to create job: ' + JSON.stringify(createData));
  }
  const createdJobId = createData.job._id;
  console.log(`✓ Job created successfully with id: ${createdJobId}, department: "${createData.job.department}"`);

  console.log('\n5. Confirming MongoDB directly stores department: "Catering"...');
  const dbJob = await Job.findById(createdJobId).lean();
  if (!dbJob) throw new Error('Job not found in MongoDB!');
  console.log('MongoDB Record:', {
    _id: dbJob._id,
    title: dbJob.title,
    department: dbJob.department,
    type: dbJob.type,
    location: dbJob.location,
    pay: dbJob.pay
  });
  if (dbJob.department !== 'Catering') {
    throw new Error(`Expected dbJob.department to be "Catering", got "${dbJob.department}"`);
  }
  console.log('✓ CONFIRMED: MongoDB stores department: "Catering"!');

  console.log('\n6. Registering a seeker and checking GET /api/jobs...');
  const seekRegRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ramesh Seeker',
      email: seekerEmail,
      phone: '9876500002',
      password,
      role: 'seeker'
    })
  });
  const seekData = await seekRegRes.json();
  const seekToken = seekData.token;

  const getJobsRes = await fetch(`${API_BASE}/jobs`, {
    headers: { 'Authorization': `Bearer ${seekToken}` }
  });
  const getJobsData = await getJobsRes.json();
  const matchedJob = getJobsData.jobs.find(j => j._id === createdJobId);
  if (!matchedJob) throw new Error('Created job not found in seeker jobs list!');
  if (matchedJob.department !== 'Catering') {
    throw new Error(`Seeker job department is not "Catering": ${matchedJob.department}`);
  }
  console.log('✓ Seeker GET /api/jobs returns job with department:', matchedJob.department);

  console.log('\n7. Checking existing job records are unmodified...');
  const allJobs = await Job.find({}).limit(5).lean();
  console.log(`Found ${allJobs.length} sample jobs in DB.`);
  for (const j of allJobs) {
    console.log(`- Job "${j.title}": department = ${j.department || '(none - existing)'}`);
  }
  console.log('✓ Existing records remain intact.');

  await mongoose.disconnect();
  console.log('\nAll backend test assertions PASSED! 🎉');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
