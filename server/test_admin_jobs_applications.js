import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('TESTING ADMIN JOBS & APPLICATIONS API ENDPOINTS');
  console.log('====================================================\n');

  // Step 1: Admin Login
  console.log('Step 1: Admin Login...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@worklink.com',
      password: 'Admin@123',
    }),
  });

  const loginData = await loginRes.json();
  if (!loginData.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(loginData));
  }
  const adminToken = loginData.token;
  console.log('✓ Admin login successful. Token acquired.\n');

  // Step 2: Fetch Admin Jobs
  console.log('Step 2: Testing GET /api/admin/jobs...');
  const jobsRes = await fetch(`${BASE_URL}/admin/jobs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const jobsData = await jobsRes.json();
  console.log(`✓ Admin Jobs Status: ${jobsRes.status}, Success: ${jobsData.success}`);
  if (!jobsData.success) {
    throw new Error('Failed to retrieve admin jobs: ' + JSON.stringify(jobsData));
  }
  console.log('Summary metrics for Jobs:');
  console.log(JSON.stringify(jobsData.summary, null, 2));
  console.log(`Total jobs returned: ${jobsData.jobs?.length}`);

  if (jobsData.jobs && jobsData.jobs.length > 0) {
    const sampleJob = jobsData.jobs[0];
    console.log('\nSample Job Record:');
    console.log(`- Title: ${sampleJob.title}`);
    console.log(`- Department: ${sampleJob.department}`);
    console.log(`- Pay: ${sampleJob.pay}`);
    console.log(`- Location: ${sampleJob.location}`);
    console.log(`- Status: ${sampleJob.status}`);
    console.log(`- Completion Status: ${sampleJob.completionStatus}`);
    console.log(`- Employer: ${sampleJob.employer?.name || sampleJob.employer?.email || 'N/A'}`);
    console.log(`- Hired Worker: ${sampleJob.hiredWorker?.name || 'None'}`);
    console.log(`- Applications Count: ${sampleJob.applications?.length || 0}`);
    console.log(`- Finances:`, sampleJob.finances);
  }

  // Step 3: Fetch Admin Applications
  console.log('\nStep 3: Testing GET /api/admin/applications...');
  const appsRes = await fetch(`${BASE_URL}/admin/applications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const appsData = await appsRes.json();
  console.log(`✓ Admin Applications Status: ${appsRes.status}, Success: ${appsData.success}`);
  if (!appsData.success) {
    throw new Error('Failed to retrieve admin applications: ' + JSON.stringify(appsData));
  }
  console.log('Summary metrics for Applications:');
  console.log(JSON.stringify(appsData.summary, null, 2));
  console.log(`Total applications returned: ${appsData.applications?.length}`);

  if (appsData.applications && appsData.applications.length > 0) {
    const sampleApp = appsData.applications[0];
    console.log('\nSample Application Record:');
    console.log(`- Applicant Worker: ${sampleApp.worker?.name} (Trust: ${sampleApp.worker?.trustScore}, Verified: ${sampleApp.worker?.isVerified})`);
    console.log(`- Target Job: ${sampleApp.job?.title} (Pay: ${sampleApp.job?.pay})`);
    console.log(`- Employer: ${sampleApp.employer?.name}`);
    console.log(`- App Status: ${sampleApp.status}`);
    console.log(`- Hiring Stage: ${sampleApp.hiringStage}`);
    console.log(`- Applied Date: ${sampleApp.appliedAt}`);
  }

  // Step 4: Test GET /api/jobs as Admin
  console.log('\nStep 4: Testing GET /api/jobs with Admin Token...');
  const regularJobsRes = await fetch(`${BASE_URL}/jobs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const regularJobsData = await regularJobsRes.json();
  console.log(`✓ GET /api/jobs status: ${regularJobsRes.status}, count: ${regularJobsData.jobs?.length}`);
  if (!regularJobsData.success) {
    throw new Error('Failed GET /api/jobs as admin: ' + JSON.stringify(regularJobsData));
  }

  console.log('\n====================================================');
  console.log('ALL ADMIN JOBS & APPLICATIONS TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
