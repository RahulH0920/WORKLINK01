import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import User from './models/User.js';

async function runAdminReviewTest() {
  console.log('====================================================');
  console.log('=== STARTING ADMIN PROFILE REVIEW FLOW E2E TEST  ===');
  console.log('====================================================\n');

  // Step 1: Register worker
  const timestamp = Date.now();
  const workerEmail = `admin_review_worker_${timestamp}@example.com`;
  const registerRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Manjunath Kyadagi',
      email: workerEmail,
      phone: '9888877777',
      password: 'Password123!',
      role: 'seeker',
    }),
  });

  const registerData = await registerRes.json();
  if (!registerRes.ok) throw new Error(`Worker registration failed: ${JSON.stringify(registerData)}`);
  const workerToken = registerData.token;
  const workerId = registerData.user.id;
  console.log(`✅ [1/6] Registered test worker (ID: ${workerId})`);

  // Login as admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@worklink.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });

  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
  const adminToken = adminLoginData.token;
  console.log(`✅ [1b/6] Logged in as system admin`);

  // Step 2: Complete Profile with automatic verification
  const aadhaarFilePath = path.resolve('./uploads/aadhaar_1788362177400.jpeg');
  const aadhaarBlob = new Blob([fs.readFileSync(aadhaarFilePath)], { type: 'image/jpeg' });

  const formData = new FormData();
  formData.append('aadhaar', aadhaarBlob, 'aadhaar_card.jpeg');
  formData.append('photo', aadhaarBlob, 'recent_photo.jpeg');
  formData.append('aadhaarNumber', '899186564762');
  formData.append('holderName', 'Manjunath H Kyadagi');
  formData.append('faceVerified', 'true');
  formData.append('faceMatchScore', '96');

  const completeRes = await fetch('http://localhost:5000/api/profile/complete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}` },
    body: formData,
  });

  const completeData = await completeRes.json();
  if (!completeRes.ok || !completeData.success || !completeData.verified) {
    throw new Error(`Profile completion failed: ${JSON.stringify(completeData)}`);
  }
  console.log(`✅ [2/6] Worker profile completed & automatically verified! (isVerified: ${completeData.user.isVerified})`);

  // Step 3: Admin GET /api/admin/pending-verifications
  const pendingRes = await fetch('http://localhost:5000/api/admin/pending-verifications', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const pendingData = await pendingRes.json();
  if (!pendingRes.ok || !pendingData.success) throw new Error(`Fetch pending verifications failed: ${JSON.stringify(pendingData)}`);

  const foundWorker = pendingData.users.find(u => u._id === workerId);
  if (!foundWorker) {
    throw new Error(`❌ FAIL: Automatically verified worker ID ${workerId} is missing from Admin Dashboard pending-verifications list!`);
  }

  console.log(`✅ [3/6] Verified worker APPEARS in Admin Dashboard review list!`);
  console.log(`   - Name: ${foundWorker.name}`);
  console.log(`   - isVerified: ${foundWorker.isVerified}`);
  console.log(`   - verificationStatus: ${foundWorker.verificationStatus}`);
  console.log(`   - trustScore: ${foundWorker.trustScore}`);
  console.log(`   - faceMatchScore: ${foundWorker.faceMatchScore}`);
  console.log(`   - verificationScore: ${foundWorker.verificationScore}`);

  // Step 4: Admin GET /api/admin/verification-details/:userId
  const detailsRes = await fetch(`http://localhost:5000/api/admin/verification-details/${workerId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const detailsData = await detailsRes.json();
  if (!detailsRes.ok || !detailsData.success) throw new Error(`Fetch verification details failed: ${JSON.stringify(detailsData)}`);
  
  const verif = detailsData.verification;
  if (!verif || !verif.personalDetails.isVerified) {
    throw new Error(`❌ FAIL: Verification details modal payload missing or invalid`);
  }
  console.log(`✅ [4/6] Verification details fetched successfully for modal review:`);
  console.log(`   - Aadhaar Status: ${verif.aadhaar.verificationStatus}`);
  console.log(`   - Face Status: ${verif.faceVerification.status}`);
  console.log(`   - Match Score: ${verif.faceVerification.matchScore}%`);
  console.log(`   - Admin Decision: ${verif.personalDetails.adminDecision}`);

  // Step 5: Admin POST /api/admin/verify/:userId with action 'reject'
  const rejectRes = await fetch(`http://localhost:5000/api/admin/verify/${workerId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ action: 'reject', reason: 'Document image too blurry for admin approval' }),
  });

  const rejectData = await rejectRes.json();
  if (!rejectRes.ok || !rejectData.success) throw new Error(`Reject action failed: ${JSON.stringify(rejectData)}`);
  console.log(`✅ [5/6] Admin reject action succeeded!`);

  // Verify MongoDB state after reject
  await mongoose.connect(process.env.MONGO_URI);
  const updatedUserInDb = await User.findById(workerId);
  console.log(`   - adminDecision in DB: "${updatedUserInDb.adminDecision}"`);
  console.log(`   - verificationStatus in DB: "${updatedUserInDb.verificationStatus}"`);
  console.log(`   - isVerified in DB: ${updatedUserInDb.isVerified}`);
  console.log(`   - profileComplete in DB: ${updatedUserInDb.profileComplete}`);
  console.log(`   - documentsUploaded in DB: ${updatedUserInDb.documentsUploaded}`);
  console.log(`   - rejectionReason in DB: "${updatedUserInDb.rejectionReason}"`);

  if (updatedUserInDb.adminDecision !== 'rejected' || updatedUserInDb.verificationStatus !== 'rejected' || updatedUserInDb.isVerified !== false) {
    throw new Error('❌ FAIL: Rejection fields were not properly updated in MongoDB!');
  }

  // Step 6: Verify rejected worker is removed from active review list
  const pendingAfterRes = await fetch('http://localhost:5000/api/admin/pending-verifications', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  const pendingAfterData = await pendingAfterRes.json();
  const foundWorkerAfter = pendingAfterData.users.find(u => u._id === workerId);
  if (foundWorkerAfter) {
    throw new Error(`❌ FAIL: Rejected worker should not remain in active review list!`);
  }
  console.log(`✅ [6/6] Rejected worker removed from active review list after rejection!`);

  // Cleanup
  await User.findByIdAndDelete(workerId);
  await mongoose.disconnect();
  console.log('\n🎉 ALL ADMIN REVIEW FLOW E2E TESTS PASSED SUCCESSFULLY!');
}

runAdminReviewTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
