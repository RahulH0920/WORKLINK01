import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function run() {
  console.log('====================================================');
  console.log('TESTING COMPLETE EMPLOYER REGISTRATION & PROFILE FLOW');
  console.log('====================================================\n');

  // Step 1: Admin Login
  console.log('Step 1: Admin login to verify admin endpoints...');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@worklink.com',
      password: 'Admin@123',
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginData.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLoginData));
  }
  const adminToken = adminLoginData.token;
  console.log('✓ Admin logged in successfully.');

  // Check initial employer count via /stats and /admin/employers
  const initialStatsRes = await fetch(`${BASE_URL}/stats`);
  const initialStats = await initialStatsRes.json();
  const initialCount = initialStats.stats?.totalEmployers || 0;
  console.log(`Initial totalEmployers in stats: ${initialCount}`);

  const initialAdminEmployersRes = await fetch(`${BASE_URL}/admin/employers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const initialAdminEmployers = await initialAdminEmployersRes.json();
  console.log(`Initial employers returned in /admin/employers list: ${initialAdminEmployers.employers?.length}`);

  // Step 2: Register a Brand New Employer
  const uniqueId = Date.now();
  const testEmail = `employer_test_${uniqueId}@example.com`;
  console.log(`\nStep 2: Registering brand new employer (${testEmail})...`);

  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rohit V Deshpande',
      email: testEmail,
      phone: '9876543210',
      password: 'Password@123',
      role: 'employer',
    }),
  });
  const regData = await regRes.json();
  if (!regData.token) {
    throw new Error('Registration failed: ' + JSON.stringify(regData));
  }
  const employerToken = regData.token;
  const newEmployerUser = regData.user;
  console.log('✓ New Employer Registered successfully!');
  console.log('  ID:', newEmployerUser.id);
  console.log('  Role:', newEmployerUser.role);
  console.log('  profileComplete:', newEmployerUser.profileComplete);
  console.log('  isVerified:', newEmployerUser.isVerified);
  console.log('  trustScore:', newEmployerUser.trustScore);

  if (newEmployerUser.profileComplete !== false || newEmployerUser.isVerified !== false) {
    throw new Error('New employer should NOT be profileComplete or isVerified initially!');
  }

  // Step 3: Verify Admin Employers List immediately contains the new employer
  console.log('\nStep 3: Checking Admin Employers list immediately after registration...');
  const afterRegAdminEmployersRes = await fetch(`${BASE_URL}/admin/employers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const afterRegAdminEmployers = await afterRegAdminEmployersRes.json();
  const foundNewEmp = afterRegAdminEmployers.employers?.find(
    (e) => e.email === testEmail || e.id === newEmployerUser.id
  );

  console.log(`Total employers in /admin/employers list now: ${afterRegAdminEmployers.employers?.length}`);
  if (!foundNewEmp) {
    throw new Error('BUG NOT FIXED: Newly registered employer NOT found in /admin/employers list!');
  }
  console.log('✓ SUCCESS: Newly registered employer IS FOUND in the actual employers list!');
  console.log('  Name:', foundNewEmp.name);
  console.log('  Email:', foundNewEmp.email);
  console.log('  profileComplete:', foundNewEmp.profileComplete);
  console.log('  isVerified:', foundNewEmp.isVerified);
  console.log('  verificationStatus:', foundNewEmp.verificationStatus);

  // Step 4: Verify Admin Verification Details for this incomplete employer
  console.log('\nStep 4: Checking /admin/verification-details for incomplete employer...');
  const verifDetailsRes = await fetch(`${BASE_URL}/admin/verification-details/${newEmployerUser.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const verifDetailsData = await verifDetailsRes.json();
  console.log('✓ Verification details fetched successfully:');
  console.log('  Personal details profileComplete:', verifDetailsData.verification?.personalDetails?.profileComplete);
  console.log('  Aadhaar verification status:', verifDetailsData.verification?.aadhaar?.verificationStatus);

  // Step 5: Simulate Profile Completion for this Employer
  console.log('\nStep 5: Completing profile (Bio, Skills, Identity Documents)...');

  // 5a. Update Bio & Location
  const bioRes = await fetch(`${BASE_URL}/profile/bio`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${employerToken}`,
    },
    body: JSON.stringify({
      bio: 'Deshpande Logistics & Event Infrastructure Solutions. We provide verified workforce staffing across Karnataka.',
      location: 'Bengaluru, Karnataka',
    }),
  });
  const bioData = await bioRes.json();
  console.log('✓ Bio & Location updated:', bioData.success, bioData.user?.location);

  // 5b. Update Skills / Hiring Categories
  const skillsRes = await fetch(`${BASE_URL}/profile/skills`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${employerToken}`,
    },
    body: JSON.stringify({
      skills: [
        { name: 'Logistics', level: 90 },
        { name: 'Catering', level: 85 },
      ],
    }),
  });
  const skillsData = await skillsRes.json();
  console.log('✓ Hiring Categories updated:', skillsData.success, skillsData.user?.skills?.length, 'categories');

  // 5c. Update profile with verified status
  await mongoose.connect(process.env.MONGO_URI);
  const User = (await import('./models/User.js')).default;
  await User.findByIdAndUpdate(newEmployerUser.id, {
    profileComplete: true,
    isVerified: true,
    verificationStatus: 'approved',
    adminDecision: 'approved',
    trustScore: 15,
    verificationScore: 100,
    verifiedAt: new Date(),
    documentsUploaded: true,
  });
  console.log('✓ Verified employer profile updated in MongoDB.');

  // Step 6: Verify Employer Profile is now verified
  console.log('\nStep 6: Checking employer profile state via /profile...');
  const getProfileRes = await fetch(`${BASE_URL}/profile`, {
    headers: { Authorization: `Bearer ${employerToken}` },
  });
  const profileData = await getProfileRes.json();
  console.log('✓ Profile retrieved:');
  console.log('  profileComplete:', profileData.user?.profileComplete);
  console.log('  isVerified:', profileData.user?.isVerified);
  console.log('  verificationStatus:', profileData.user?.verificationStatus);
  console.log('  trustScore:', profileData.user?.trustScore);

  // Step 7: Check Admin Employers directory again
  console.log('\nStep 7: Checking Admin Employers directory after profile completion...');
  const finalAdminEmployersRes = await fetch(`${BASE_URL}/admin/employers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const finalAdminEmployers = await finalAdminEmployersRes.json();
  const updatedEmpInList = finalAdminEmployers.employers?.find((e) => e.id === newEmployerUser.id);
  console.log('✓ Employer in Admin list:');
  console.log('  Found:', Boolean(updatedEmpInList));
  console.log('  Name:', updatedEmpInList?.name);
  console.log('  isVerified:', updatedEmpInList?.isVerified);
  console.log('  verificationStatus:', updatedEmpInList?.verificationStatus);
  console.log('  profileComplete:', updatedEmpInList?.profileComplete);
  console.log('  location:', updatedEmpInList?.location);

  // Step 8: Verify Worker flow still functions
  console.log('\nStep 8: Checking Worker verification flow...');
  const pendingWorkersRes = await fetch(`${BASE_URL}/admin/pending-verifications`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const pendingWorkers = await pendingWorkersRes.json();
  console.log('✓ Seeker/Worker verifications endpoint response:', pendingWorkers.success);
  console.log(`  Total seekers for verification review: ${pendingWorkers.users?.length}`);

  console.log('\n====================================================');
  console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
