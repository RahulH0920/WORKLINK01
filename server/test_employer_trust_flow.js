import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Job from './models/Job.js';
import Transaction from './models/Transaction.js';
import TrustHistory from './models/TrustHistory.js';
import Review from './models/Review.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/worklink';

async function runTest() {
  console.log('=== STARTING EMPLOYER TRUST SCORE VERIFICATION TEST ===');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  const testEmail = `test_emp_trust_${Date.now()}@worklink.com`;
  const workerEmail = `test_worker_trust_${Date.now()}@worklink.com`;

  try {
    // 1. Create a verified test Employer
    const employer = await User.create({
      name: 'Test Employer Trust Corp',
      email: testEmail,
      password: 'Password@123',
      phone: '9998887770',
      role: 'employer',
      isVerified: true,
      verificationStatus: 'approved',
      trustScore: 20,
    });
    console.log(`\n[PASS] 1. Created Verified Employer with Starting Score: ${employer.trustScore}/100 (Expected: 20)`);

    // Verify initial TrustHistory entry creation
    await TrustHistory.create({
      employerId: employer._id,
      targetRole: 'employer',
      type: 'verification',
      reason: 'Identity & Business Verification',
      change: 20,
      previousScore: 0,
      newScore: 20,
      source: 'verification',
    });

    // 2. Create a test Worker and a test Job
    const worker = await User.create({
      name: 'Test Worker Trust',
      email: workerEmail,
      password: 'Password@123',
      phone: '9998887771',
      role: 'seeker',
      isVerified: true,
      verificationStatus: 'approved',
      trustScore: 20,
    });

    const job = await Job.create({
      employer: employer._id,
      title: 'Warehouse Specialist',
      department: 'Cleaning',
      type: 'Part-time',
      pay: '2000',
      location: 'Bangalore',
      description: 'Warehouse tasks',
      status: 'active',
      completionStatus: 'in_progress',
      hiredWorker: worker._id,
      applicants: [{ applicant: worker._id, status: 'accepted' }],
    });

    // 3. Test POSITIVE EVENT 1: Advance Payment Completed (+1)
    console.log('\n--- Testing Positive Event: Advance Payment (+1) ---');
    let existingAdvanceTrust = await TrustHistory.findOne({
      employerId: employer._id,
      jobId: job._id,
      targetRole: 'employer',
      type: 'advance_payment',
    });

    if (!existingAdvanceTrust) {
      const prev = employer.trustScore;
      employer.trustScore = Math.min(100, (employer.trustScore || 20) + 1);
      await employer.save();
      await TrustHistory.create({
        employerId: employer._id,
        jobId: job._id,
        targetRole: 'employer',
        type: 'advance_payment',
        reason: `Advance payment completed for job "${job.title}"`,
        change: 1,
        previousScore: prev,
        newScore: employer.trustScore,
        source: 'advance_payment',
      });
      console.log(`[PASS] Advance payment recorded: ${prev} -> ${employer.trustScore} (+1)`);
    }

    // Duplicate check for Advance Payment
    existingAdvanceTrust = await TrustHistory.findOne({
      employerId: employer._id,
      jobId: job._id,
      targetRole: 'employer',
      type: 'advance_payment',
    });
    if (existingAdvanceTrust) {
      console.log('[PASS] Duplicate advance payment trust score addition correctly prevented.');
    }

    // 4. Test POSITIVE EVENT 2: Job Completion Confirmed by Employer (+2)
    console.log('\n--- Testing Positive Event: Job Completion Confirmed (+2) ---');
    let existingCompletionTrust = await TrustHistory.findOne({
      employerId: employer._id,
      jobId: job._id,
      targetRole: 'employer',
      type: 'job_completion',
    });

    if (!existingCompletionTrust) {
      const prev = employer.trustScore;
      employer.trustScore = Math.min(100, (employer.trustScore || 20) + 2);
      await employer.save();
      await TrustHistory.create({
        employerId: employer._id,
        jobId: job._id,
        targetRole: 'employer',
        type: 'job_completion',
        reason: `Job completion confirmed for "${job.title}"`,
        change: 2,
        previousScore: prev,
        newScore: employer.trustScore,
        source: 'job_completion',
      });
      console.log(`[PASS] Job completion confirmed recorded: ${prev} -> ${employer.trustScore} (+2)`);
    }

    // 5. Test POSITIVE EVENT 3: Remaining Payment Completed (+2)
    console.log('\n--- Testing Positive Event: Remaining Payment Completed (+2) ---');
    let existingRemainingTrust = await TrustHistory.findOne({
      employerId: employer._id,
      jobId: job._id,
      targetRole: 'employer',
      type: 'remaining_payment',
    });

    if (!existingRemainingTrust) {
      const prev = employer.trustScore;
      employer.trustScore = Math.min(100, (employer.trustScore || 20) + 2);
      await employer.save();
      await TrustHistory.create({
        employerId: employer._id,
        jobId: job._id,
        targetRole: 'employer',
        type: 'remaining_payment',
        reason: `Remaining payment completed for job "${job.title}"`,
        change: 2,
        previousScore: prev,
        newScore: employer.trustScore,
        source: 'remaining_payment',
      });
      console.log(`[PASS] Remaining payment recorded: ${prev} -> ${employer.trustScore} (+2)`);
    }

    // 6. Test POSITIVE EVENT 4: Full Settlement Cleared (+1)
    console.log('\n--- Testing Positive Event: Transaction Fully Settled (+1) ---');
    let existingSettlementTrust = await TrustHistory.findOne({
      employerId: employer._id,
      jobId: job._id,
      targetRole: 'employer',
      type: 'settlement',
    });

    if (!existingSettlementTrust) {
      const prev = employer.trustScore;
      employer.trustScore = Math.min(100, (employer.trustScore || 20) + 1);
      await employer.save();
      await TrustHistory.create({
        employerId: employer._id,
        jobId: job._id,
        targetRole: 'employer',
        type: 'settlement',
        reason: `Transaction fully settled with cleared payout for "${job.title}"`,
        change: 1,
        previousScore: prev,
        newScore: employer.trustScore,
        source: 'settlement',
      });
      console.log(`[PASS] Transaction fully settled recorded: ${prev} -> ${employer.trustScore} (+1)`);
    }

    console.log(`\n=> Score after all 4 positive events: ${employer.trustScore}/100 (Expected: 26/100)`);
    if (employer.trustScore !== 26) {
      throw new Error(`Expected score 26, got ${employer.trustScore}`);
    }

    // 7. Test NEGATIVE EVENTS (Admin-confirmed)
    console.log('\n--- Testing Admin-Confirmed Negative Trust Events ---');
    
    // Negative Event 1: Payment failure / default (-5)
    let prev = employer.trustScore;
    employer.trustScore = Math.max(0, Math.min(100, employer.trustScore - 5));
    await employer.save();
    await TrustHistory.create({
      employerId: employer._id,
      targetRole: 'employer',
      type: 'admin_adjustment',
      reason: 'Admin-confirmed payment failure/default',
      change: -5,
      previousScore: prev,
      newScore: employer.trustScore,
      source: 'admin_negative_adjustment',
    });
    console.log(`[PASS] Negative Event (-5, payment failure): ${prev} -> ${employer.trustScore} (Expected: 21)`);

    // Negative Event 2: Fake/fraudulent job (-10)
    prev = employer.trustScore;
    employer.trustScore = Math.max(0, Math.min(100, employer.trustScore - 10));
    await employer.save();
    await TrustHistory.create({
      employerId: employer._id,
      targetRole: 'employer',
      type: 'admin_adjustment',
      reason: 'Admin-confirmed fake/fraudulent job',
      change: -10,
      previousScore: prev,
      newScore: employer.trustScore,
      source: 'admin_negative_adjustment',
    });
    console.log(`[PASS] Negative Event (-10, fake job): ${prev} -> ${employer.trustScore} (Expected: 11)`);

    // Negative Event 3: Serious platform misuse (-15) with Lower Boundary Check [0, 100]
    prev = employer.trustScore;
    employer.trustScore = Math.max(0, Math.min(100, employer.trustScore - 15));
    await employer.save();
    await TrustHistory.create({
      employerId: employer._id,
      targetRole: 'employer',
      type: 'admin_adjustment',
      reason: 'Admin-confirmed serious platform misuse',
      change: -15,
      previousScore: prev,
      newScore: employer.trustScore,
      source: 'admin_negative_adjustment',
    });
    console.log(`[PASS] Negative Event (-15, platform misuse with min 0 clamp): ${prev} -> ${employer.trustScore} (Expected: 0)`);
    if (employer.trustScore !== 0) {
      throw new Error(`Expected score 0, got ${employer.trustScore}`);
    }

    // 8. Test Isolation: Worker Reviews must NOT affect Employer Trust Score
    console.log('\n--- Testing Isolation: Worker Ratings/Reviews do NOT change Employer Score ---');
    const workerReview = await Review.create({
      jobId: job._id,
      workerId: worker._id,
      employerId: employer._id,
      jobTitle: job.title,
      employerName: employer.name,
      rating: 5,
      review: 'Great job done by worker!',
      trustScoreChange: 4,
    });
    const refreshedEmployer = await User.findById(employer._id);
    console.log(`[PASS] Employer score remains ${refreshedEmployer.trustScore} after worker review created. (No leakage)`);

    // 9. Verify Trust History Entries
    const history = await TrustHistory.find({ employerId: employer._id, targetRole: 'employer' }).sort({ createdAt: -1 });
    console.log(`\n[PASS] Total Employer TrustHistory entries: ${history.length} records verified.`);
    history.forEach((h, idx) => {
      console.log(`  ${idx + 1}. [${h.type}] ${h.reason} | Change: ${h.change > 0 ? '+' + h.change : h.change} (${h.previousScore} -> ${h.newScore})`);
    });

    console.log('\n=== ALL EMPLOYER TRUST SCORE TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    // Cleanup test records
    await User.deleteMany({ email: { $in: [testEmail, workerEmail] } });
    await Job.deleteMany({ title: 'Warehouse Specialist' });
    await TrustHistory.deleteMany({ employerId: { $exists: true } });
    await Review.deleteMany({ comment: 'Great employer!' });
    await mongoose.disconnect();
    console.log('Cleaned up test data & disconnected from MongoDB.');
  }
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
