import mongoose from 'mongoose';
import User from './models/User.js';
import Job from './models/Job.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/worklink';

async function runTest() {
  console.log('--- Starting Employer Hiring & Worker Acceptance E2E Test ---');
  await mongoose.connect(MONGO_URI);

  // 1. Create test Employer and Worker users
  const employerEmail = `emp_test_${Date.now()}@example.com`;
  const workerEmail = `worker_test_${Date.now()}@example.com`;

  const employer = await User.create({
    name: 'Test Employer Corp',
    email: employerEmail,
    phone: '9876543210',
    password: 'Password@123',
    role: 'employer',
    isVerified: true,
    trustScore: 90
  });

  const worker = await User.create({
    name: 'Manjunath Test',
    firstName: 'Manjunath',
    lastName: 'Test',
    email: workerEmail,
    phone: '9123456789',
    password: 'Password@123',
    role: 'seeker',
    isVerified: true,
    trustScore: 85,
    location: 'Bangalore, India',
    skills: [{ name: 'Catering', level: 90 }]
  });

  console.log('✓ Created Employer & Worker users');

  // 2. Employer creates a job
  const job = await Job.create({
    employer: employer._id,
    title: 'Senior Catering Assistant',
    department: 'Catering',
    type: 'Part-time',
    location: 'Bangalore',
    pay: '₹800/day',
    description: 'Provide catering assistance for high profile corporate events.'
  });

  console.log(`✓ Employer created job: "${job.title}" (${job._id})`);

  // 3. Worker applies to the job
  job.applications.push({ applicant: worker._id, status: 'pending' });
  await job.save();
  console.log('✓ Worker applied to job. Application status: pending');

  // Verify applicant appears under employer's job query
  let empJobs = await Job.find({ employer: employer._id }).populate('applications.applicant');
  console.log(`✓ Employer sees ${empJobs[0].applications.length} applicant: ${empJobs[0].applications[0].applicant.name}`);

  // 4. Employer clicks "Accept & Hire"
  const appIndex = empJobs[0].applications.findIndex(a => String(a.applicant._id) === String(worker._id));
  empJobs[0].applications[appIndex].status = 'accepted';
  empJobs[0].hiredWorker = worker._id;
  await empJobs[0].save();

  console.log('✓ Employer clicked "Accept & Hire"');

  // Verify MongoDB document state
  const updatedJob = await Job.findById(job._id);
  console.log(`✓ MongoDB job application status: "${updatedJob.applications[0].status}"`);
  console.log(`✓ MongoDB job hiredWorker: "${updatedJob.hiredWorker}"`);

  if (updatedJob.applications[0].status !== 'accepted') {
    throw new Error('FAILED: MongoDB application status is not accepted!');
  }
  if (String(updatedJob.hiredWorker) !== String(worker._id)) {
    throw new Error('FAILED: hiredWorker does not match worker ID!');
  }

  // 5. Worker checks applications / dashboard
  const workerJobs = await Job.find({ 'applications.applicant': worker._id });
  const workerApp = workerJobs[0].applications.find(a => String(a.applicant) === String(worker._id));
  console.log(`✓ Worker sees job: "${workerJobs[0].title}", Application Status: "${workerApp.status}"`);

  if (workerApp.status !== 'accepted') {
    throw new Error('FAILED: Worker application status is not accepted!');
  }

  // 6. Test Reject Flow on a second job
  const job2 = await Job.create({
    employer: employer._id,
    title: 'Event Cleaner',
    department: 'Cleaning',
    type: 'Short-term',
    location: 'Bangalore',
    pay: '₹600/day',
    description: 'Post-event cleanup.'
  });
  job2.applications.push({ applicant: worker._id, status: 'pending' });
  await job2.save();

  // Employer rejects worker
  job2.applications[0].status = 'rejected';
  await job2.save();

  const rejectedJob = await Job.findById(job2._id);
  console.log(`✓ Employer rejected applicant on Job 2. Status: "${rejectedJob.applications[0].status}"`);

  if (rejectedJob.applications[0].status !== 'rejected') {
    throw new Error('FAILED: Rejected status not saved!');
  }

  // Clean up test records
  await User.deleteMany({ _id: { $in: [employer._id, worker._id] } });
  await Job.deleteMany({ _id: { $in: [job._id, job2._id] } });
  console.log('✓ Cleaned up test data');

  console.log('🎉 ALL HIRING & REJECTION FLOW TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
