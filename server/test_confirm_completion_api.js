import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from './models/User.js';
import Job from './models/Job.js';
import Transaction from './models/Transaction.js';

dotenv.config({ path: './.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'worklink_super_secret_key_change_in_production';

async function testConfirmCompletionAPI() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/worklink');
    console.log('Connected to MongoDB.');

    const employer = await User.findOne({ role: 'employer' });
    const worker = await User.findOne({ role: 'seeker' });

    if (!employer || !worker) throw new Error('Employer or worker not found');

    const employerToken = jwt.sign({ id: employer._id, role: 'employer' }, JWT_SECRET, { expiresIn: '1d' });
    const workerToken = jwt.sign({ id: worker._id, role: 'seeker' }, JWT_SECRET, { expiresIn: '1d' });

    // 1. Create a real hired job
    const job = await Job.create({
      title: 'Garden Maintenance #RealJobTest',
      description: 'Pruning trees and lawn mowing',
      department: 'Cleaning',
      type: 'Short-term',
      location: 'Bangalore',
      pay: '₹1500',
      status: 'active',
      employer: employer._id,
      hiredWorker: worker._id,
      completionStatus: 'in_progress',
      remainingPaymentReady: false,
      remainingPaymentPaid: false,
      workerSettled: false,
      applications: [{
        applicant: worker._id,
        status: 'accepted',
        appliedAt: new Date(),
      }],
    });

    console.log(`Created job for test: ${job._id}`);

    // 2. Worker calls /api/jobs/:jobId/mark-completed via HTTP
    console.log('Worker calling /api/jobs/:jobId/mark-completed...');
    const markRes = await fetch(`http://localhost:5000/api/jobs/${job._id}/mark-completed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerToken}`,
      },
    });

    const markData = await markRes.json();
    console.log('Mark completed response:', markData);
    if (!markData.success) throw new Error(`Mark completed failed: ${JSON.stringify(markData)}`);

    // 3. Employer calls /api/jobs/:jobId/confirm-completion via HTTP
    console.log('Employer calling /api/jobs/:jobId/confirm-completion...');
    const confirmRes = await fetch(`http://localhost:5000/api/jobs/${job._id}/confirm-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employerToken}`,
      },
    });

    const confirmData = await confirmRes.json();
    console.log('Confirm completion response:', confirmData);
    if (!confirmData.success) throw new Error(`Confirm completion failed: ${JSON.stringify(confirmData)}`);

    // Verify in database
    const updatedJob = await Job.findById(job._id);
    console.log('Updated Job in DB:', {
      completionStatus: updatedJob.completionStatus,
      employerConfirmedAt: updatedJob.employerConfirmedAt,
      remainingPaymentReady: updatedJob.remainingPaymentReady,
      applicationStatus: updatedJob.applications[0].status,
    });

    if (updatedJob.completionStatus !== 'completed') throw new Error('Job completionStatus not completed');
    if (!updatedJob.remainingPaymentReady) throw new Error('Job remainingPaymentReady not true');
    if (updatedJob.applications[0].status !== 'completed') throw new Error('Application status not completed');

    // Clean up
    await Job.deleteOne({ _id: job._id });
    await Transaction.deleteOne({ jobId: job._id });

    console.log('\n✅ 12E EMPLOYER CONFIRMATION API FULL E2E HTTP TEST PASSED WITH ZERO ERRORS!');
  } catch (err) {
    console.error('API Test Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testConfirmCompletionAPI();
