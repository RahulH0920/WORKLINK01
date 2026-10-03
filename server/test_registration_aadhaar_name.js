import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import mongoose from 'mongoose';
import User from './models/User.js';

async function testRegistrationFlow() {
  console.log('--- Connecting to MongoDB ---');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  // Test 1: Mongoose validation requires name
  console.log('\nTest 1: User model validation requires name');
  try {
    const invalidUser = new User({
      email: `test_noname_${Date.now()}@example.com`,
      phone: '9999999999',
      password: 'Password123!',
      role: 'seeker',
    });
    await invalidUser.validate();
    throw new Error('Expected validation error for missing name, but passed');
  } catch (err) {
    if (err.errors && err.errors.name) {
      console.log('✓ Validation error caught as expected:', err.errors.name.message);
    } else {
      throw err;
    }
  }

  // Test 2: User creation with Aadhaar name
  console.log('\nTest 2: Create User with Aadhaar full name');
  const testAadhaarName = 'Santosh Kumar Shetty';
  const testEmail = `test_aadhaar_${Date.now()}@example.com`;
  const user = await User.create({
    name: testAadhaarName,
    email: testEmail,
    phone: '9876543210',
    password: 'Password123!',
    role: 'seeker',
  });

  console.log('Created user in DB:');
  console.log('- ID:', user._id);
  console.log('- Name:', user.name);
  console.log('- Email:', user.email);
  console.log('- First Name (synced):', user.firstName);
  console.log('- Last Name (synced):', user.lastName);

  if (user.name !== testAadhaarName) {
    throw new Error(`Expected user.name to be "${testAadhaarName}", got "${user.name}"`);
  }

  // Verify toJSON output
  const jsonUser = user.toJSON();
  console.log('toJSON output contains name:', jsonUser.name);
  if (jsonUser.name !== testAadhaarName) {
    throw new Error('toJSON does not contain correct name');
  }

  // Cleanup
  await User.findByIdAndDelete(user._id);
  console.log('Cleaned up test user.');

  await mongoose.disconnect();
  console.log('MongoDB disconnected. Test 1 & 2 passed successfully!');
}

testRegistrationFlow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
