import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import mongoose from 'mongoose';
import User from './models/User.js';
import DocumentRecord from './models/DocumentRecord.js';
import { verifyDocumentsWithAtlasDataset } from './utils/validators.js';

async function runTest() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  // Find a valid reference Aadhaar record
  const aadhaarRecord = await DocumentRecord.findOne({ docType: 'aadhaar' });
  if (!aadhaarRecord) {
    throw new Error('No Aadhaar reference record found in MongoDB.');
  }
  console.log(`Using reference Aadhaar: ${aadhaarRecord.docNumber}, Name: ${aadhaarRecord.holderName}`);

  // Create a unique test user
  const testEmail = `test_auto_approve_${Date.now()}@example.com`;
  const nameParts = aadhaarRecord.holderName.split(' ');
  const firstName = nameParts[0] || 'Santosh';
  const lastName = nameParts.slice(1).join(' ') || 'Shetty';

  const testUser = await User.create({
    name: aadhaarRecord.holderName || `${firstName} ${lastName}`,
    firstName,
    lastName,
    email: testEmail,
    phone: '9876543210',
    password: 'Password123!',
    role: 'seeker',
    isVerified: false,
    verificationStatus: 'not_submitted',
    profileComplete: false,
    adminDecision: 'pending',
  });

  console.log(`Created test user: ${testUser._id}, isVerified: ${testUser.isVerified}, status: ${testUser.verificationStatus}, profileComplete: ${testUser.profileComplete}`);

  // -------------------------------------------------------------
  // Test Case 1: VERIFICATION FAILURE (e.g. Mismatched Name / Record not found)
  // -------------------------------------------------------------
  console.log('\n--- Testing Verification Failure Branch ---');
  const failVerifResult = await verifyDocumentsWithAtlasDataset({
    aadhaarNumber: '111122223333', // non-existent Aadhaar
    panNumber: '',
    holderName: 'Mismatched Person',
  });

  console.log('Verification result for failure test:', failVerifResult.verified, failVerifResult.message);

  const failIsVerified = Boolean(failVerifResult.verified);
  const failDocStatus = failIsVerified ? 'verified' : 'rejected';

  // Simulating route updateData on failure
  const failUpdateData = {
    documents: [
      {
        docType: 'aadhaar',
        fileName: 'aadhaar.jpg',
        filePath: `documents/${testUser._id}/aadhaar.jpg`,
        uploadedAt: new Date(),
        status: failDocStatus,
        verificationMessage: failVerifResult.message,
      },
    ],
    documentsUploaded: true,
    profileComplete: failIsVerified ? true : false,
    isVerified: failIsVerified ? true : false,
    verificationStatus: failIsVerified ? 'approved' : 'rejected',
    adminDecision: failIsVerified ? 'approved' : 'pending',
    trustScore: testUser.trustScore || 0,
    verificationScore: failIsVerified ? 100 : 0,
    documentMatchScore: failIsVerified ? 100 : 0,
    faceMatchScore: 95,
    rejectionReason: failIsVerified ? '' : failVerifResult.message,
    verifiedAt: failIsVerified ? new Date() : null,
  };

  const userAfterFail = await User.findByIdAndUpdate(testUser._id, failUpdateData, { new: true });
  console.log('After failure check in MongoDB:');
  console.log(`- isVerified: ${userAfterFail.isVerified} (expected false)`);
  console.log(`- verificationStatus: "${userAfterFail.verificationStatus}" (expected "rejected")`);
  console.log(`- profileComplete: ${userAfterFail.profileComplete} (expected false)`);
  console.log(`- verifiedAt: ${userAfterFail.verifiedAt} (expected null)`);

  if (userAfterFail.isVerified === true || userAfterFail.verificationStatus === 'approved') {
    throw new Error('TEST FAILED: Failed check should NOT set isVerified=true or verificationStatus="approved"');
  }

  // -------------------------------------------------------------
  // Test Case 2: VERIFICATION SUCCESS (Exact matching reference record)
  // -------------------------------------------------------------
  console.log('\n--- Testing Verification Success Branch ---');
  const successVerifResult = await verifyDocumentsWithAtlasDataset({
    aadhaarNumber: aadhaarRecord.docNumber,
    panNumber: '',
    holderName: aadhaarRecord.holderName,
  });

  console.log('Verification result for success test:', successVerifResult.verified, successVerifResult.message);
  if (!successVerifResult.verified) {
    throw new Error('Expected dataset match to succeed.');
  }

  const successIsVerified = Boolean(successVerifResult.verified);
  const successDocStatus = successIsVerified ? 'verified' : 'rejected';

  let newTrustScore = userAfterFail.trustScore || 0;
  if (successIsVerified && !userAfterFail.isVerified) {
    newTrustScore = Math.min(100, newTrustScore + 15);
  }

  // Same updateData logic as profile.js
  const successUpdateData = {
    documents: [
      {
        docType: 'aadhaar',
        fileName: 'aadhaar.jpg',
        filePath: `documents/${testUser._id}/aadhaar.jpg`,
        uploadedAt: new Date(),
        status: successDocStatus,
        verificationMessage: 'Aadhaar matched in WorkLink reference dataset',
      },
      {
        docType: 'photo',
        fileName: 'photo.jpg',
        filePath: `documents/${testUser._id}/photo.jpg`,
        uploadedAt: new Date(),
        status: 'verified',
        verificationMessage: 'Photo registered with verified profile',
      },
    ],
    documentsUploaded: true,
    profileComplete: successIsVerified ? true : false,
    isVerified: successIsVerified ? true : false,
    verificationStatus: successIsVerified ? 'approved' : 'rejected',
    adminDecision: successIsVerified ? 'approved' : 'pending',
    trustScore: newTrustScore,
    verificationScore: successIsVerified ? 100 : 0,
    documentMatchScore: successIsVerified ? 100 : 0,
    faceMatchScore: 95,
    rejectionReason: successIsVerified ? '' : successVerifResult.message,
    verifiedAt: successIsVerified ? new Date() : null,
    verificationChecks: {
      aadhaarValid: successVerifResult.details?.aadhaarFound || false,
      panValid: false,
      crossDocumentMatch: successVerifResult.details?.nameMatched || false,
      ocrCompleted: true,
      faceMatchCompleted: true,
      livenessCompleted: true,
    },
    ocrResult: {
      aadhaar: {
        name: aadhaarRecord.holderName,
        documentNumber: aadhaarRecord.docNumber,
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        extracted: true,
      },
    },
  };

  const userAfterSuccess = await User.findByIdAndUpdate(testUser._id, successUpdateData, { new: true });

  console.log('\nFinal confirmation from MongoDB user document:');
  console.log(`isVerified: ${userAfterSuccess.isVerified}`);
  console.log(`verificationStatus: "${userAfterSuccess.verificationStatus}"`);
  console.log(`profileComplete: ${userAfterSuccess.profileComplete}`);
  console.log(`verifiedAt: ${userAfterSuccess.verifiedAt}`);
  console.log(`adminDecision: "${userAfterSuccess.adminDecision}"`);
  console.log(`trustScore: ${userAfterSuccess.trustScore}`);

  // Assertions
  if (userAfterSuccess.isVerified !== true) {
    throw new Error('Assertion failed: isVerified must be true');
  }
  if (userAfterSuccess.verificationStatus !== 'approved') {
    throw new Error('Assertion failed: verificationStatus must be "approved"');
  }
  if (userAfterSuccess.profileComplete !== true) {
    throw new Error('Assertion failed: profileComplete must be true');
  }
  if (!(userAfterSuccess.verifiedAt instanceof Date)) {
    throw new Error('Assertion failed: verifiedAt must be a Date');
  }

  console.log('\nAll assertions PASSED successfully!');

  // Cleanup test user
  await User.findByIdAndDelete(testUser._id);
  console.log('Test user cleaned up.');

  await mongoose.disconnect();
  console.log('MongoDB disconnected. Test complete.');
}

runTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
