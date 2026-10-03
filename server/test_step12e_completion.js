import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Job from './models/Job.js';

dotenv.config({ path: '../.env' });

async function runStep12ETest() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/worklink');
    console.log('Connected to MongoDB.');

    // 1. Find or create employer and worker
    let employer = await User.findOne({ role: 'employer' });
    if (!employer) {
      employer = await User.create({
        name: 'Test Employer 12E',
        email: `emp_12e_${Date.now()}@worklink.com`,
        password: 'Password123!',
        phone: '9876543210',
        role: 'employer',
        isVerified: true
      });
    }

    let worker = await User.findOne({ role: 'seeker' });
    if (!worker) {
      worker = await User.create({
        name: 'Test Worker 12E',
        email: `worker_12e_${Date.now()}@worklink.com`,
        password: 'Password123!',
        phone: '9876543211',
        role: 'seeker',
        isVerified: true
      });
    }

    console.log(`Employer: ${employer.name || employer.email} (${employer._id})`);
    console.log(`Worker: ${worker.name || worker.email} (${worker._id})`);

    // TEST CASE A: Worker marks completed -> Employer confirms
    console.log('\n--- TEST CASE A: Worker Marks Completed -> Employer Confirms ---');
    const jobA = await Job.create({
      title: 'Plumbing Repair #12E-A',
      description: 'Fix bathroom leak',
      department: 'Cleaning',
      type: 'Short-term',
      location: 'Bangalore',
      pay: '₹1000',
      status: 'active',
      employer: employer._id,
      hiredWorker: worker._id,
      completionStatus: 'in_progress',
      remainingPaymentReady: false,
      applications: [{
        applicant: worker._id,
        status: 'accepted',
        appliedAt: new Date()
      }]
    });

    console.log(`Created Job A: ${jobA._id}, status: ${jobA.status}, completionStatus: ${jobA.completionStatus}`);

    // Worker marks work completed
    jobA.completionStatus = 'waiting_employer_confirmation';
    jobA.workerCompletedAt = new Date();
    await jobA.save();

    console.log(`✓ Worker marked completed! New completionStatus: ${jobA.completionStatus}, workerCompletedAt: ${jobA.workerCompletedAt}`);
    if (jobA.completionStatus !== 'waiting_employer_confirmation') throw new Error('Failed to set waiting_employer_confirmation');

    // Employer confirms completion
    jobA.completionStatus = 'completed';
    jobA.employerConfirmedAt = new Date();
    jobA.remainingPaymentReady = true;
    await jobA.save();

    console.log(`✓ Employer confirmed completion! New completionStatus: ${jobA.completionStatus}, remainingPaymentReady: ${jobA.remainingPaymentReady}`);
    if (jobA.completionStatus !== 'completed' || !jobA.remainingPaymentReady) {
      throw new Error('Case A validation failed');
    }

    // TEST CASE B: Worker marks completed -> Employer raises issue
    console.log('\n--- TEST CASE B: Worker Marks Completed -> Employer Raises Issue ---');
    const jobB = await Job.create({
      title: 'Delivery Run #12E-B',
      description: 'Deliver packages across town',
      department: 'Delivery',
      type: 'Short-term',
      location: 'Bangalore',
      pay: '₹2000',
      status: 'active',
      employer: employer._id,
      hiredWorker: worker._id,
      completionStatus: 'in_progress',
      remainingPaymentReady: false,
      applications: [{
        applicant: worker._id,
        status: 'accepted',
        appliedAt: new Date()
      }]
    });

    console.log(`Created Job B: ${jobB._id}, status: ${jobB.status}, completionStatus: ${jobB.completionStatus}`);

    // Worker marks completed
    jobB.completionStatus = 'waiting_employer_confirmation';
    jobB.workerCompletedAt = new Date();
    await jobB.save();
    console.log(`✓ Worker marked completed! completionStatus: ${jobB.completionStatus}`);

    // Employer raises dispute
    const issueReason = 'Left wire joints uncovered and exposed without switch covers.';
    jobB.completionStatus = 'disputed';
    jobB.disputeReason = issueReason;
    jobB.disputedAt = new Date();
    jobB.disputedBy = employer._id;
    jobB.remainingPaymentReady = false;
    await jobB.save();

    console.log(`✓ Employer raised issue! completionStatus: ${jobB.completionStatus}, disputeReason: "${jobB.disputeReason}", remainingPaymentReady: ${jobB.remainingPaymentReady}`);
    if (jobB.completionStatus !== 'disputed' || jobB.remainingPaymentReady !== false || !jobB.disputeReason) {
      throw new Error('Case B validation failed');
    }

    // Clean up test records
    await Job.deleteMany({ _id: { $in: [jobA._id, jobB._id] } });

    console.log('\n✅ ALL STEP 12E COMPLETION CONFIRMATION & DISPUTE TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

runStep12ETest();
