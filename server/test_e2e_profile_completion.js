import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import User from './models/User.js';

async function testE2E() {
  console.log('=== Step 1: Registering Test User ===');
  const timestamp = Date.now();
  const testEmail = `manjunath_test_${timestamp}@example.com`;
  const registerRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Manjunath Kyadagi',
      email: testEmail,
      phone: '9888877777',
      password: 'Password123!',
      role: 'seeker',
    }),
  });

  const registerData = await registerRes.json();
  if (!registerRes.ok) {
    throw new Error(`Register failed: ${JSON.stringify(registerData)}`);
  }
  const token = registerData.token;
  const userId = registerData.user.id;
  console.log(`Registered user id: ${userId}, token received.`);

  // Connect to MongoDB to check initial state
  await mongoose.connect(process.env.MONGO_URI);
  let userInDb = await User.findById(userId);
  console.log('Initial MongoDB state:');
  console.log(`- isVerified: ${userInDb.isVerified}`);
  console.log(`- verificationStatus: "${userInDb.verificationStatus}"`);
  console.log(`- profileComplete: ${userInDb.profileComplete}`);
  console.log(`- verifiedAt: ${userInDb.verifiedAt}`);

  if (userInDb.isVerified !== false || userInDb.verificationStatus !== 'not_submitted') {
    throw new Error('Initial state invalid');
  }

  console.log('\n=== Step 2: Submitting Profile Completion (POST /api/profile/complete) ===');
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
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const completeData = await completeRes.json();
  console.log('Complete Profile API Response status:', completeRes.status);
  console.log('API Response data:', {
    success: completeData.success,
    verified: completeData.verified,
    message: completeData.message,
    user: completeData.user ? {
      id: completeData.user._id,
      isVerified: completeData.user.isVerified,
      verificationStatus: completeData.user.verificationStatus,
      profileComplete: completeData.user.profileComplete,
      verifiedAt: completeData.user.verifiedAt,
      trustScore: completeData.user.trustScore,
      adminDecision: completeData.user.adminDecision,
    } : null,
  });

  if (!completeRes.ok || !completeData.success || !completeData.verified) {
    throw new Error(`Profile completion failed: ${JSON.stringify(completeData)}`);
  }

  console.log('\n=== Step 3: Querying MongoDB directly to verify document state ===');
  userInDb = await User.findById(userId);

  console.log('MongoDB User Document:');
  console.log(`isVerified: ${userInDb.isVerified}`);
  console.log(`verificationStatus: "${userInDb.verificationStatus}"`);
  console.log(`profileComplete: ${userInDb.profileComplete}`);
  console.log(`verifiedAt: ${userInDb.verifiedAt}`);
  console.log(`adminDecision: "${userInDb.adminDecision}"`);
  console.log(`trustScore: ${userInDb.trustScore}`);

  // Assertions
  if (userInDb.isVerified !== true) {
    throw new Error('ASSERTION FAILED: isVerified must be true');
  }
  if (userInDb.verificationStatus !== 'approved') {
    throw new Error('ASSERTION FAILED: verificationStatus must be "approved"');
  }
  if (userInDb.profileComplete !== true) {
    throw new Error('ASSERTION FAILED: profileComplete must be true');
  }
  if (!(userInDb.verifiedAt instanceof Date)) {
    throw new Error('ASSERTION FAILED: verifiedAt must be a valid Date object');
  }

  console.log('\n🎉 ALL CHECKS PASSED: Profile was automatically verified and approved upon completion!');

  // Cleanup
  await User.findByIdAndDelete(userId);
  console.log('Test user cleaned up from database.');
  await mongoose.disconnect();
}

testE2E().catch((err) => {
  console.error('E2E Test Error:', err);
  process.exit(1);
});
