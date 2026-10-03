import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import mongoose from 'mongoose';
import User from './models/User.js';

async function testApiRegistration() {
  console.log('=== Step 1: Testing missing name field ===');
  const failRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test_noname_${Date.now()}@example.com`,
      phone: '9876543210',
      password: 'Password123!',
      role: 'seeker',
    }),
  });

  const failData = await failRes.json();
  console.log('Status code:', failRes.status);
  console.log('Response body:', failData);

  if (failRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for missing name, got ${failRes.status}`);
  }
  const nameError = failData.errors?.find(e => e.field === 'name');
  if (!nameError || !nameError.message.includes('Name as in Aadhaar Card is required')) {
    throw new Error(`Expected "Name as in Aadhaar Card is required" error message, got: ${JSON.stringify(failData)}`);
  }
  console.log('✓ Validation correctly rejected missing name with message:', nameError.message);

  console.log('\n=== Step 2: Testing registration with Aadhaar name ===');
  const timestamp = Date.now();
  const testAadhaarName = 'Santosh Kumar Shetty';
  const testEmail = `santosh_${timestamp}@example.com`;

  const successRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testAadhaarName,
      email: testEmail,
      phone: '9876543210',
      password: 'Password123!',
      role: 'seeker',
    }),
  });

  const successData = await successRes.json();
  console.log('Status code:', successRes.status);
  console.log('Registration response user:', successData.user);

  if (successRes.status !== 201) {
    throw new Error(`Expected 201 Created, got ${successRes.status}: ${JSON.stringify(successData)}`);
  }
  if (successData.user.name !== testAadhaarName) {
    throw new Error(`Expected user.name to be "${testAadhaarName}", got "${successData.user.name}"`);
  }
  console.log('✓ User registered and returned with name:', successData.user.name);

  const token = successData.token;
  const userId = successData.user.id;

  console.log('\n=== Step 3: Verifying GET /api/auth/me ===');
  const meRes = await fetch('http://localhost:5000/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  console.log('GET /api/auth/me user.name:', meData.user?.name);
  if (meData.user?.name !== testAadhaarName) {
    throw new Error(`Expected /me user.name to be "${testAadhaarName}", got "${meData.user?.name}"`);
  }
  console.log('✓ /api/auth/me verified successfully');

  console.log('\n=== Step 4: Verifying POST /api/auth/login ===');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
    }),
  });
  const loginData = await loginRes.json();
  console.log('Login response user.name:', loginData.user?.name);
  if (loginData.user?.name !== testAadhaarName) {
    throw new Error(`Expected login user.name to be "${testAadhaarName}", got "${loginData.user?.name}"`);
  }
  console.log('✓ Login verified successfully');

  // Verify in MongoDB directly
  await mongoose.connect(process.env.MONGO_URI);
  const userInDb = await User.findById(userId);
  console.log('\n=== Step 5: Direct MongoDB verification ===');
  console.log('Database document name field:', userInDb.name);
  if (userInDb.name !== testAadhaarName) {
    throw new Error(`Expected MongoDB document name to be "${testAadhaarName}", got "${userInDb.name}"`);
  }

  // Cleanup
  await User.findByIdAndDelete(userId);
  console.log('Test user cleaned up from database.');
  await mongoose.disconnect();

  console.log('\n🎉 ALL REGISTRATION API CHECKS PASSED SUCCESSFULLY!');
}

testApiRegistration().catch(err => {
  console.error('API Test Error:', err);
  process.exit(1);
});
