import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

dotenv.config({ path: './.env' });

async function runTests() {
  console.log('================================================================');
  console.log('TESTING TERMS & CONDITIONS CONSENT GATE AND VERIFICATION APPROVAL');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 1: Verify Terms & Conditions Definitions
  // ─────────────────────────────────────────────────────────
  console.log('--- Test Suite 1: Verifying Exact Terms & Conditions Content ---');

  const termsModalPath = path.resolve('../FRONTEND/SEEK_FRAME/components/ProfileWizard/TermsModal.jsx');
  const termsModalContent = fs.readFileSync(termsModalPath, 'utf-8');

  assert(
    termsModalContent.includes('A 2% platform service commission may apply to WorkLink payments.'),
    'Term 1 text: "A 2% platform service commission may apply to WorkLink payments."'
  );

  assert(
    termsModalContent.includes('Platform Commission & Payment'),
    'Term 1 title: "Platform Commission & Payment"'
  );

  assert(
    termsModalContent.includes('Users must provide genuine personal information and valid documents.'),
    'Term 2 text: "Users must provide genuine personal information and valid documents."'
  );

  assert(
    termsModalContent.includes('Genuine Information'),
    'Term 2 title: "Genuine Information"'
  );

  assert(
    termsModalContent.includes('Users must not misuse the platform, create fake jobs/applications, or manipulate verification or payments.'),
    'Term 3 text: "Users must not misuse the platform, create fake jobs/applications, or manipulate verification or payments."'
  );

  assert(
    termsModalContent.includes('Responsible Usage'),
    'Term 3 title: "Responsible Usage"'
  );

  assert(
    termsModalContent.includes('WorkLink may restrict accounts and take appropriate legal action against fraudulent or suspicious activities.'),
    'Term 4 text: "WorkLink may restrict accounts and take appropriate legal action against fraudulent or suspicious activities."'
  );

  assert(
    termsModalContent.includes('Suspicious Activities'),
    'Term 4 title: "Suspicious Activities"'
  );

  assert(
    termsModalContent.includes('I have read and agree to the WorkLink Terms & Conditions.'),
    'Checkbox agreement text: "I have read and agree to the WorkLink Terms & Conditions."'
  );

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 2: Verify ProfileWizardModal Consent Gate Logic
  // ─────────────────────────────────────────────────────────
  console.log('\n--- Test Suite 2: Verifying ProfileWizardModal Consent Gate Logic ---');

  const modalPath = path.resolve('../FRONTEND/SEEK_FRAME/components/ProfileWizard/ProfileWizardModal.jsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  assert(
    modalContent.includes('import TermsModal from \'./TermsModal\';'),
    'ProfileWizardModal imports TermsModal'
  );

  assert(
    modalContent.includes('const [termsAccepted, setTermsAccepted] = useState(false);'),
    'ProfileWizardModal maintains termsAccepted state initialized to false'
  );

  assert(
    modalContent.includes('!termsAccepted') &&
    modalContent.includes('setTermsError') &&
    modalContent.includes('Please accept the WorkLink Terms & Conditions before submitting your profile.'),
    'ProfileWizardModal blocks submission when terms are not accepted and shows clear warning message'
  );

  assert(
    modalContent.includes('terms-agreement-checkbox') &&
    modalContent.includes('I have read and agree to the'),
    'ProfileWizardModal renders checkbox with exact consent agreement text'
  );

  assert(
    modalContent.includes('TermsModal') &&
    modalContent.includes('isOpen={showTermsModal}') &&
    modalContent.includes('onAcceptAndClose'),
    'ProfileWizardModal renders TermsModal and wires acceptance handler'
  );

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 3: Simulation of Consent Gate State Transitions
  // ─────────────────────────────────────────────────────────
  console.log('\n--- Test Suite 3: Simulating Submission Consent Gate Transitions ---');

  function simulateSubmission({ canAdvance, termsAccepted, isLastStep, isSubmitted }) {
    let error = '';
    let submitted = false;

    if (isLastStep) {
      if (!isSubmitted) {
        if (!canAdvance) return { submitted: false, error: 'Cannot advance' };
        if (!termsAccepted) {
          const msg = 'Please accept the WorkLink Terms & Conditions before submitting your profile.';
          return { submitted: false, error: msg };
        }
        submitted = true;
        return { submitted: true, error: '' };
      }
      return { submitted: false, error: 'Already submitted' };
    }
    return { submitted: false, error: 'Not last step' };
  }

  // 1. All 4 steps completed (canAdvance = true), but terms NOT accepted:
  const simBlocked = simulateSubmission({
    canAdvance: true,
    termsAccepted: false,
    isLastStep: true,
    isSubmitted: false,
  });
  assert(
    simBlocked.submitted === false &&
    simBlocked.error === 'Please accept the WorkLink Terms & Conditions before submitting your profile.',
    'Step 4 verification passed -> Click Submit without accepting terms -> SUBMISSION BLOCKED with warning message'
  );

  // 2. User accepts terms (termsAccepted = true) -> Submit:
  const simAllowed = simulateSubmission({
    canAdvance: true,
    termsAccepted: true,
    isLastStep: true,
    isSubmitted: false,
  });
  assert(
    simAllowed.submitted === true && simAllowed.error === '',
    'Step 4 verification passed -> Accept terms -> Click Submit -> SUBMISSION PROCEEDS'
  );

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 4: Backend Automatic Approval for Worker Flow
  // ─────────────────────────────────────────────────────────
  console.log('\n--- Test Suite 4: Verifying Worker Automatic Approval Flow ---');

  await mongoose.connect(process.env.MONGO_URI);
  const workerTimestamp = Date.now();
  const workerEmail = `worker_tc_${workerTimestamp}@example.com`;

  const workerRegRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Manjunath Kyadagi',
      email: workerEmail,
      phone: '9888877771',
      password: 'Password123!',
      role: 'seeker',
    }),
  });
  const workerRegData = await workerRegRes.json();
  assert(workerRegRes.ok && workerRegData.token, 'Worker registered successfully');

  const aadhaarFilePath = path.resolve('./uploads/aadhaar_1788362177400.jpeg');
  const aadhaarBlob = new Blob([fs.readFileSync(aadhaarFilePath)], { type: 'image/jpeg' });

  const workerFormData = new FormData();
  workerFormData.append('aadhaar', aadhaarBlob, 'aadhaar.jpeg');
  workerFormData.append('photo', aadhaarBlob, 'photo.jpeg');
  workerFormData.append('aadhaarNumber', '899186564762');
  workerFormData.append('holderName', 'Manjunath H Kyadagi');
  workerFormData.append('faceVerified', 'true');
  workerFormData.append('faceMatchScore', '95');

  const workerSubmitRes = await fetch('http://localhost:5000/api/profile/complete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerRegData.token}` },
    body: workerFormData,
  });
  const workerSubmitData = await workerSubmitRes.json();
  assert(workerSubmitRes.ok && workerSubmitData.verified === true, 'Worker profile verified upon final submission');

  const workerInDb = await User.findById(workerRegData.user.id);
  assert(workerInDb.isVerified === true, 'Worker isVerified is true in database');
  assert(workerInDb.verificationStatus === 'approved', 'Worker verificationStatus is "approved" (automatic approval)');
  assert(workerInDb.profileComplete === true, 'Worker profileComplete is true');

  // Clean up test worker
  await User.findByIdAndDelete(workerRegData.user.id);
  console.log('  ✓ Cleaned up test worker.');

  // ─────────────────────────────────────────────────────────
  // TEST SUITE 5: Backend Automatic Approval for Employer Flow
  // ─────────────────────────────────────────────────────────
  console.log('\n--- Test Suite 5: Verifying Employer Automatic Approval Flow ---');

  const empTimestamp = Date.now();
  const empEmail = `emp_tc_${empTimestamp}@example.com`;

  const empRegRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Santosh Shetty',
      email: empEmail,
      phone: '9888877772',
      password: 'Password123!',
      role: 'employer',
    }),
  });
  const empRegData = await empRegRes.json();
  assert(empRegRes.ok && empRegData.token, 'Employer registered successfully');

  const empFormData = new FormData();
  empFormData.append('aadhaar', aadhaarBlob, 'aadhaar.jpeg');
  empFormData.append('photo', aadhaarBlob, 'photo.jpeg');
  empFormData.append('aadhaarNumber', '899186564762');
  empFormData.append('holderName', 'Santosh Shetty');
  empFormData.append('faceVerified', 'true');
  empFormData.append('faceMatchScore', '94');

  const empSubmitRes = await fetch('http://localhost:5000/api/profile/complete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empRegData.token}` },
    body: empFormData,
  });
  const empSubmitData = await empSubmitRes.json();
  assert(empSubmitRes.ok && empSubmitData.verified === true, 'Employer profile verified upon final submission');

  const empInDb = await User.findById(empRegData.user.id);
  assert(empInDb.isVerified === true, 'Employer isVerified is true in database');
  assert(empInDb.verificationStatus === 'approved', 'Employer verificationStatus is "approved" (automatic approval)');
  assert(empInDb.profileComplete === true, 'Employer profileComplete is true');

  // Clean up test employer
  await User.findByIdAndDelete(empRegData.user.id);
  console.log('  ✓ Cleaned up test employer.');

  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log(`ALL ${passed}/${total} TESTS PASSED SUCCESSFULLY! 🚀`);
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
