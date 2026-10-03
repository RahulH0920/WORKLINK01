import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import Job from '../models/Job.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import TrustHistory from '../models/TrustHistory.js';
import Review from '../models/Review.js';

const router = express.Router();

/**
 * Helper to parse dynamic numeric job pay amount
 */
export function parseJobAmount(payStr) {
  if (typeof payStr === 'number') return payStr;
  if (!payStr) return 1000;
  const match = payStr.toString().replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 1000;
}

/**
 * Dynamic financial calculator
 */
export function calculateJobFinances(payInput) {
  const jobAmount = parseJobAmount(payInput);
  const employerFee = +(jobAmount * 0.02).toFixed(2);
  const employerTotal = +(jobAmount + employerFee).toFixed(2);
  const advanceAmount = +(employerTotal * 0.5).toFixed(2);
  const remainingAmount = +(employerTotal - advanceAmount).toFixed(2);
  const workerFee = +(jobAmount * 0.02).toFixed(2);
  const workerNetEarning = +(jobAmount - workerFee).toFixed(2);
  const platformRevenue = +(employerFee + workerFee).toFixed(2);

  return {
    jobAmount,
    employerFee,
    employerTotal,
    advanceAmount,
    remainingAmount,
    workerFee,
    workerNetEarning,
    platformRevenue,
  };
}

/* ── Create a new job (Employer only) ── */
router.post(
  '/',
  protect,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('department').isIn(['Catering', 'Driving', 'Cleaning', 'Delivery']).withMessage('Department must be Catering, Driving, Cleaning, or Delivery'),
    body('type').isIn(['Part-time', 'Short-term', 'Freelance', 'Full-time']).withMessage('Invalid job type'),
    body('location').notEmpty().withMessage('Location is required'),
    body('pay').notEmpty().withMessage('Pay is required'),
    body('description').notEmpty().withMessage('Description is required'),
  ],
  async (req, res) => {
    if (req.user.role !== 'employer') {
      return res.status(403).json({ success: false, message: 'Only employers can post jobs' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.array().map(e => e.msg).join(', ');
      return res.status(400).json({ success: false, message: msg, errors: errors.array() });
    }

    try {
      const job = await Job.create({
        employer: req.userId,
        ...req.body,
      });
      res.status(201).json({ success: true, job });
    } catch (err) {
      console.error('Job creation error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/* ── Edit an existing job (Employer only) ── */
router.put('/:id', protect, async (req, res) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ success: false, message: 'Only employers can edit jobs' });
  }

  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (String(job.employer) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this job' });
    }

    const { title, department, type, location, pay, description, tags, status } = req.body;
    if (title) job.title = title;
    if (department) job.department = department;
    if (type) job.type = type;
    if (location) job.location = location;
    if (pay) job.pay = pay;
    if (description) job.description = description;
    if (Array.isArray(tags)) job.tags = tags;
    if (status && ['active', 'closed'].includes(status)) job.status = status;

    await job.save();

    const updated = await Job.findById(job._id).populate(
      'applications.applicant',
      'name firstName lastName email phone role trustScore isVerified verificationStatus verificationScore riskScore faceMatchScore documentMatchScore skills location documents verificationChecks'
    );

    res.json({ success: true, message: 'Job updated successfully', job: updated });
  } catch (err) {
    console.error('Job update error:', err);
    res.status(500).json({ success: false, message: 'Server error updating job' });
  }
});

/* ── Delete a job (Employer only) ── */
router.delete('/:id', protect, async (req, res) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ success: false, message: 'Only employers can delete jobs' });
  }

  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (String(job.employer) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this job' });
    }

    await Job.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Job delete error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting job' });
  }
});

/* ── Get jobs (Employer gets own, Seeker gets all active, Admin gets all) ── */
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      // Admin sees all jobs with full employer, hired worker, applicant, and dispute details
      const jobs = await Job.find({})
        .populate('employer', 'name firstName lastName email phone location trustScore isVerified verificationStatus profileComplete bio')
        .populate('hiredWorker', 'name firstName lastName email phone location trustScore isVerified verificationStatus profileComplete bio')
        .populate('disputedBy', 'name firstName lastName email')
        .populate('applications.applicant', 'name firstName lastName email phone role trustScore isVerified verificationStatus verificationScore riskScore faceMatchScore documentMatchScore skills location documents verificationChecks bio')
        .sort({ createdAt: -1 });
      return res.json({ success: true, jobs });
    } else if (req.user.role === 'employer') {
      // Employer sees their own jobs with applicant details populated
      const jobs = await Job.find({ employer: req.userId })
        .populate('applications.applicant', 'name firstName lastName email phone role trustScore isVerified verificationStatus verificationScore riskScore faceMatchScore documentMatchScore skills location documents verificationChecks')
        .sort({ createdAt: -1 });
      return res.json({ success: true, jobs });
    } else {
      // Seeker sees all active jobs scheduled for today or future dates
      const jobs = await Job.find({ status: 'active' })
        .populate('employer', 'name firstName lastName trustScore isVerified')
        .sort({ createdAt: -1 });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const availableJobs = jobs.filter(j => {
        const dateVal = j.startDate || j.scheduledDate || j.date || j.createdAt;
        if (!dateVal) return true;

        let jDate;
        if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
          const [year, month, day] = dateVal.trim().split('-').map(Number);
          jDate = new Date(year, month - 1, day);
        } else {
          jDate = new Date(dateVal);
        }

        if (isNaN(jDate.getTime())) return true;
        jDate.setHours(0, 0, 0, 0);

        return jDate.getTime() >= today.getTime();
      });

      return res.json({ success: true, jobs: availableJobs });
    }
  } catch (err) {
    console.error('Get jobs error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ── Get seeker's applied jobs (Seeker only) ── */
router.get('/my-applications', protect, async (req, res) => {
  try {
    const jobs = await Job.find({ 'applications.applicant': req.userId })
      .populate('employer', 'name firstName lastName email trustScore isVerified')
      .sort({ updatedAt: -1 });

    const applications = jobs.map(j => {
      const app = j.applications.find(a => String(a.applicant) === String(req.userId));
      return {
        job: {
          _id: j._id,
          id: j._id,
          title: j.title,
          department: j.department,
          type: j.type,
          location: j.location,
          pay: j.pay,
          description: j.description,
          employer: j.employer,
          status: j.status,
          completionStatus: j.completionStatus || 'in_progress',
          workerCompletedAt: j.workerCompletedAt,
          employerConfirmedAt: j.employerConfirmedAt,
          disputeReason: j.disputeReason,
          disputedAt: j.disputedAt,
          remainingPaymentReady: j.remainingPaymentReady || false,
          remainingPaymentPaid: j.remainingPaymentPaid || false,
          remainingPaidAt: j.remainingPaidAt,
          workerSettled: j.workerSettled || false,
          workerSettledAt: j.workerSettledAt,
          transactionId: j.transactionId,
          hiredWorker: j.hiredWorker,
          createdAt: j.createdAt,
        },
        applicationId: app?._id,
        status: (j.completionStatus === 'completed' || j.status === 'completed')
          ? 'completed'
          : (app?.status || 'pending'),
        completionStatus: j.completionStatus || 'in_progress',
        appliedAt: app?.appliedAt,
      };
    });

    res.json({ success: true, applications });
  } catch (err) {
    console.error('Get my applications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ── Apply for a job (Seeker only) ── */
router.post('/:id/apply', protect, async (req, res) => {
  if (req.user.role !== 'seeker') {
    return res.status(403).json({ success: false, message: 'Only seekers can apply' });
  }

  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    
    // Check if already applied
    const alreadyApplied = job.applications.some(a => a.applicant.toString() === req.userId);
    if (alreadyApplied) {
      return res.status(400).json({ success: false, message: 'You have already applied to this job' });
    }

    job.applications.push({ applicant: req.userId });
    await job.save();

    res.json({ success: true, message: 'Application submitted successfully' });
  } catch (err) {
    console.error('Apply job error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ── Update application status (Accept/Reject hiring action by Employer) ── */
router.post('/:jobId/applications/:applicantId/status', protect, async (req, res) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ success: false, message: 'Only employers can update application status' });
  }

  const { status, transactionId } = req.body;
  if (!['accepted', 'rejected', 'hired', 'shortlisted'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (String(job.employer) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this job' });
    }

    const appIndex = job.applications.findIndex(a => {
      const id = typeof a.applicant === 'object' ? a.applicant._id : a.applicant;
      return String(id) === String(req.params.applicantId) || String(a._id) === String(req.params.applicantId);
    });

    if (appIndex === -1) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const currentStatus = job.applications[appIndex].status;
    const targetStatus = status === 'hired' ? 'accepted' : status;

    // Prevent duplicate actions
    if (currentStatus === targetStatus) {
      return res.status(400).json({
        success: false,
        message: `Application is already ${targetStatus}.`,
      });
    }

    job.applications[appIndex].status = targetStatus;

    if (targetStatus === 'accepted') {
      const workerId = job.applications[appIndex].applicant;
      job.hiredWorker = workerId;
      job.completionStatus = 'in_progress';

      // ── Step 12C/12D/12F: Create/Link Transaction Record in MongoDB ──
      const finances = calculateJobFinances(job.pay);
      const generatedTxnId = transactionId || `WL-TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      let txn = await Transaction.findOne({ jobId: job._id });
      if (!txn) {
        txn = await Transaction.create({
          transactionId: generatedTxnId,
          jobId: job._id,
          applicationId: job.applications[appIndex]._id,
          employerId: job.employer,
          workerId: workerId,
          jobTitle: job.title,
          ...finances,
          advancePaid: finances.advanceAmount,
          advancePaidAt: new Date(),
          remainingPaid: 0,
          completionStatus: 'in_progress',
          paymentStatus: 'advance_paid',
          settlementStatus: 'pending',
        });
      }
      job.transactionId = txn.transactionId;

      // ── Employer Trust Score Event: Advance Payment Completed (+1) ──
      try {
        const existingAdvanceTrust = await TrustHistory.findOne({
          employerId: job.employer,
          jobId: job._id,
          targetRole: 'employer',
          type: 'advance_payment',
        });

        if (!existingAdvanceTrust) {
          const employerUser = await User.findById(job.employer);
          if (employerUser) {
            const prevScore = employerUser.trustScore || (employerUser.isVerified ? 20 : 0);
            const newScore = Math.min(100, Math.max(0, prevScore + 1));
            employerUser.trustScore = newScore;
            await employerUser.save();

            await TrustHistory.create({
              employerId: employerUser._id,
              targetRole: 'employer',
              type: 'advance_payment',
              reason: 'Advance Payment Completed',
              change: 1,
              previousScore: prevScore,
              newScore: newScore,
              jobId: job._id,
              jobTitle: job.title || 'Work Assignment',
              transactionId: txn.transactionId || '',
              source: 'advance_payment',
            });
          }
        }
      } catch (trustErr) {
        console.error('Error awarding employer advance payment trust points:', trustErr);
      }
    }

    await job.save();


    const updatedJob = await Job.findById(job._id).populate(
      'applications.applicant',
      'name firstName lastName email phone role trustScore isVerified verificationStatus verificationScore riskScore faceMatchScore documentMatchScore skills location documents verificationChecks'
    );

    res.json({
      success: true,
      message: targetStatus === 'accepted' ? 'Candidate accepted and hired successfully!' : 'Application rejected successfully.',
      job: updatedJob,
      application: updatedJob.applications[appIndex],
    });
  } catch (err) {
    console.error('Update application status error:', err);
    res.status(500).json({ success: false, message: 'Server error updating status' });
  }
});

/* ── STEP 12E: Worker marks work as completed (Worker only) ── */
router.post('/:jobId/mark-completed', protect, async (req, res) => {
  if (req.user.role !== 'seeker') {
    return res.status(403).json({ success: false, message: 'Only hired workers can mark work completed' });
  }

  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Validate that the requester is the hired worker or has an accepted application
    const isHired = String(job.hiredWorker) === String(req.userId) ||
      job.applications.some(a => String(a.applicant) === String(req.userId) && (a.status === 'accepted' || a.status === 'hired'));

    if (!isHired) {
      return res.status(403).json({ success: false, message: 'You are not the hired worker for this job' });
    }

    // Prevent duplicate submissions
    if (job.completionStatus === 'waiting_employer_confirmation') {
      return res.status(400).json({ success: false, message: 'Work is already awaiting employer confirmation' });
    }
    if (job.completionStatus === 'completed') {
      return res.status(400).json({ success: false, message: 'Work has already been confirmed as completed' });
    }

    job.completionStatus = 'waiting_employer_confirmation';
    job.workerCompletedAt = new Date();
    await job.save();

    // Update Transaction status
    await Transaction.findOneAndUpdate(
      { jobId: job._id },
      { completionStatus: 'waiting_employer_confirmation' }
    );

    res.json({
      success: true,
      message: 'Work marked as completed. Waiting for employer confirmation.',
      job,
    });
  } catch (err) {
    console.error('Mark work completed error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error marking work completed',
      details: err.toString(),
    });
  }
});

/* ── STEP 12E: Employer confirms job completion (Employer only) ── */
router.post('/:jobId/confirm-completion', protect, async (req, res) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ success: false, message: 'Only employers can confirm completion' });
  }

  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (String(job.employer) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this job' });
    }

    // Cannot confirm before worker marks completed
    if (job.completionStatus !== 'waiting_employer_confirmation') {
      return res.status(400).json({
        success: false,
        message: 'Cannot confirm completion before the worker marks the job completed.',
      });
    }

    job.completionStatus = 'completed';
    job.employerConfirmedAt = new Date();
    job.remainingPaymentReady = true;

    // Mark hired application as completed
    const workerId = job.hiredWorker || (job.applications.find(a => a.status === 'accepted' || a.status === 'hired')?.applicant);
    if (workerId) {
      const appIndex = job.applications.findIndex(a => {
        const id = typeof a.applicant === 'object' ? a.applicant._id : a.applicant;
        return String(id) === String(workerId);
      });
      if (appIndex !== -1) {
        job.applications[appIndex].status = 'completed';
      }
    }

    await job.save();

    // ── Employer Trust Score Event: Job Completion Confirmed (+2) ──
    if (job.completionStatus !== 'disputed') {
      try {
        const existingCompletionTrust = await TrustHistory.findOne({
          employerId: job.employer,
          jobId: job._id,
          targetRole: 'employer',
          type: 'job_completion',
        });

        if (!existingCompletionTrust) {
          const employerUser = await User.findById(job.employer);
          if (employerUser) {
            const prevScore = employerUser.trustScore || (employerUser.isVerified ? 20 : 0);
            const newScore = Math.min(100, Math.max(0, prevScore + 2));
            employerUser.trustScore = newScore;
            await employerUser.save();

            await TrustHistory.create({
              employerId: employerUser._id,
              targetRole: 'employer',
              type: 'job_completion',
              reason: 'Job Completion Confirmed',
              change: 2,
              previousScore: prevScore,
              newScore: newScore,
              jobId: job._id,
              jobTitle: job.title || 'Work Assignment',
              transactionId: job.transactionId || '',
              source: 'confirm_completion',
            });
          }
        }
      } catch (trustErr) {
        console.error('Error awarding employer job completion trust points:', trustErr);
      }
    }

    // Update Transaction status
    await Transaction.findOneAndUpdate(
      { jobId: job._id },
      { completionStatus: 'completed' }
    );


    res.json({
      success: true,
      message: 'Job completion confirmed successfully! Remaining 50% payment is now available.',
      job,
    });
  } catch (err) {
    console.error('Confirm completion error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error confirming completion',
      details: err.toString(),
    });
  }
});

/* ── STEP 12E: Employer raises an issue regarding completion (Employer only) ── */
router.post('/:jobId/raise-issue', protect, async (req, res) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ success: false, message: 'Only employers can raise an issue' });
  }

  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: 'Issue reason is required' });
  }

  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (String(job.employer) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this job' });
    }

    // Must be in waiting_employer_confirmation or in_progress
    if (job.completionStatus !== 'waiting_employer_confirmation') {
      return res.status(400).json({
        success: false,
        message: 'An issue can only be raised for a job awaiting completion confirmation.',
      });
    }

    job.completionStatus = 'disputed';
    job.disputeReason = reason.trim();
    job.disputedAt = new Date();
    job.disputedBy = req.userId;
    job.remainingPaymentReady = false; // Lock remaining payment

    await job.save();

    // Update Transaction status
    await Transaction.findOneAndUpdate(
      { jobId: job._id },
      {
        completionStatus: 'disputed',
        disputeReason: reason.trim(),
        disputedAt: new Date(),
        disputedBy: req.userId,
      }
    );

    res.json({
      success: true,
      message: 'Issue raised successfully. Work status set to disputed.',
      job,
    });
  } catch (err) {
    console.error('Raise issue error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error raising issue',
      details: err.toString(),
    });
  }
});

/* ── STEP 12F: Employer pays remaining 50% & executes worker settlement ── */
router.post('/:jobId/pay-remaining', protect, async (req, res) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ success: false, message: 'Only employers can process remaining payment' });
  }

  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (String(job.employer) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this job' });
    }

    // Validation 1: Must be in completed status (employer confirmed completion)
    if (job.completionStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Remaining payment is only allowed after employer confirms completion.',
      });
    }

    // Validation 2: Cannot pay for disputed job
    if (job.completionStatus === 'disputed') {
      return res.status(400).json({
        success: false,
        message: 'Remaining payment is locked because this job is in dispute.',
      });
    }

    // Validation 3: Prevent duplicate payment
    if (job.remainingPaymentPaid) {
      return res.status(400).json({
        success: false,
        message: 'Remaining payment has already been paid for this job.',
      });
    }

    // Calculate finances dynamically
    const finances = calculateJobFinances(job.pay);

    // Find or create transaction
    let txn = await Transaction.findOne({ jobId: job._id });
    if (!txn) {
      const generatedTxnId = job.transactionId || `WL-TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      txn = new Transaction({
        transactionId: generatedTxnId,
        jobId: job._id,
        employerId: job.employer,
        workerId: job.hiredWorker,
        jobTitle: job.title,
        ...finances,
        advancePaid: finances.advanceAmount,
        advancePaidAt: job.createdAt,
      });
    }

    if (txn.paymentStatus === 'completed' || txn.paymentStatus === 'fully_paid') {
      return res.status(400).json({
        success: false,
        message: 'Remaining payment has already been settled on this transaction.',
      });
    }

    // Process remaining payment and worker settlement
    const now = new Date();
    txn.remainingPaid = txn.remainingAmount;
    txn.remainingPaidAt = now;
    txn.paymentStatus = 'completed';
    txn.settlementStatus = 'settled';
    txn.settledAt = now;
    await txn.save();

    // Update Job
    job.remainingPaymentPaid = true;
    job.remainingPaidAt = now;
    job.workerSettled = true;
    job.workerSettledAt = now;
    job.status = 'closed';
    job.transactionId = txn.transactionId;
    await job.save();

    // Add +2 Trust Points for worker on successful job completion & settlement (once per job)
    if (job.hiredWorker) {
      try {
        const existingJobCompletionTrust = await TrustHistory.findOne({
          workerId: job.hiredWorker,
          jobId: job._id,
          type: 'job_completion',
        });

        if (!existingJobCompletionTrust) {
          const worker = await User.findById(job.hiredWorker);
          if (worker) {
            const prevScore = worker.trustScore || (worker.isVerified ? 20 : 0);
            const newScore = Math.min(100, Math.max(0, prevScore + 2));
            worker.trustScore = newScore;
            await worker.save();

            const employerObj = await User.findById(job.employer).select('name firstName lastName');
            const employerName = employerObj
              ? (employerObj.name || `${employerObj.firstName || ''} ${employerObj.lastName || ''}`.trim() || 'Employer')
              : 'Employer';

            await TrustHistory.create({
              workerId: worker._id,
              targetRole: 'seeker',
              type: 'job_completion',
              reason: 'Job Completed',
              change: 2,
              previousScore: prevScore,
              newScore: newScore,
              jobId: job._id,
              jobTitle: job.title || 'Completed Job',
              transactionId: txn.transactionId || '',
              employerId: job.employer,
              employerName: employerName,
            });
          }
        }
      } catch (trustErr) {
        console.error('Error awarding job completion trust points:', trustErr);
      }
    }

    // ── Employer Trust Score Event: Remaining Payment Completed (+2) ──
    try {
      const existingRemainingTrust = await TrustHistory.findOne({
        employerId: job.employer,
        jobId: job._id,
        targetRole: 'employer',
        type: 'remaining_payment',
      });

      if (!existingRemainingTrust) {
        const employerUser = await User.findById(job.employer);
        if (employerUser) {
          const prevScore = employerUser.trustScore || (employerUser.isVerified ? 20 : 0);
          const newScore = Math.min(100, Math.max(0, prevScore + 2));
          employerUser.trustScore = newScore;
          await employerUser.save();

          await TrustHistory.create({
            employerId: employerUser._id,
            targetRole: 'employer',
            type: 'remaining_payment',
            reason: 'Remaining Payment Completed',
            change: 2,
            previousScore: prevScore,
            newScore: newScore,
            jobId: job._id,
            jobTitle: job.title || 'Completed Job',
            transactionId: txn.transactionId || '',
            source: 'pay_remaining',
          });
        }
      }
    } catch (trustErr) {
      console.error('Error awarding employer remaining payment trust points:', trustErr);
    }

    // ── Employer Trust Score Event: Transaction Fully Settled (+1) ──
    try {
      const existingSettlementTrust = await TrustHistory.findOne({
        employerId: job.employer,
        jobId: job._id,
        targetRole: 'employer',
        type: 'settlement',
      });

      if (!existingSettlementTrust) {
        const employerUser = await User.findById(job.employer);
        if (employerUser) {
          const prevScore = employerUser.trustScore || (employerUser.isVerified ? 20 : 0);
          const newScore = Math.min(100, Math.max(0, prevScore + 1));
          employerUser.trustScore = newScore;
          await employerUser.save();

          await TrustHistory.create({
            employerId: employerUser._id,
            targetRole: 'employer',
            type: 'settlement',
            reason: 'Transaction Fully Settled',
            change: 1,
            previousScore: prevScore,
            newScore: newScore,
            jobId: job._id,
            jobTitle: job.title || 'Completed Job',
            transactionId: txn.transactionId || '',
            source: 'settlement',
          });
        }
      }
    } catch (trustErr) {
      console.error('Error awarding employer settlement trust points:', trustErr);
    }

    res.json({
      success: true,
      message: `🎉 Remaining payment of ₹${txn.remainingAmount} paid! Worker settlement of ₹${txn.workerNetEarning} processed successfully.`,

      job,
      transaction: txn,
    });
  } catch (err) {
    console.error('Pay remaining error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error processing remaining payment',
      details: err.toString(),
    });
  }
});

/* ── STEP 12G: Employer rates worker performance & writes review ── */
router.post('/:jobId/rate-worker', protect, async (req, res) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ success: false, message: 'Only employers can rate worker performance.' });
  }

  try {
    const { rating, review = '' } = req.body;
    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Please provide a valid rating between 1 and 5 stars.' });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    if (String(job.employer) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'You are not authorized to rate this job.' });
    }

    if (!job.hiredWorker) {
      return res.status(400).json({ success: false, message: 'No worker was hired for this job.' });
    }

    if (String(job.hiredWorker) === String(req.userId)) {
      return res.status(400).json({ success: false, message: 'Workers cannot rate themselves.' });
    }

    // Must be completed & settled / remaining payment paid
    const isCompletedAndSettled = (job.completionStatus === 'completed' && job.remainingPaymentPaid) || job.workerSettled;
    if (!isCompletedAndSettled) {
      return res.status(400).json({
        success: false,
        message: 'Rating is only available after job completion is confirmed and payment is settled.',
      });
    }

    if (job.completionStatus === 'disputed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot rate a job while in dispute.',
      });
    }

    // Check if review already exists (One review per completed job)
    const existingReview = await Review.findOne({
      workerId: job.hiredWorker,
      employerId: req.userId,
      jobId: job._id,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this completed job.',
      });
    }

    const worker = await User.findById(job.hiredWorker);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found.' });
    }

    // Trust score changes based on star rating:
    // 5 stars -> +3
    // 4 stars -> +2
    // 3 stars -> 0
    // 2 stars -> -2
    // 1 star -> -4
    const scoreMap = { 5: 3, 4: 2, 3: 0, 2: -2, 1: -4 };
    const scoreChange = scoreMap[numRating] !== undefined ? scoreMap[numRating] : 0;

    const prevScore = worker.trustScore || (worker.isVerified ? 20 : 0);
    const newScore = Math.max(0, Math.min(100, prevScore + scoreChange));

    worker.trustScore = newScore;
    await worker.save();

    const employerName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Employer';

    // Create Review document
    const newReview = await Review.create({
      workerId: worker._id,
      employerId: req.userId,
      jobId: job._id,
      transactionId: job.transactionId || '',
      jobTitle: job.title || 'Completed Job',
      employerName,
      rating: numRating,
      review: review.trim(),
      trustScoreChange: scoreChange,
    });

    // Create TrustHistory document
    await TrustHistory.create({
      workerId: worker._id,
      type: 'employer_rating',
      reason: `${numRating}-Star Employer Rating`,
      change: scoreChange,
      previousScore: prevScore,
      newScore: newScore,
      jobId: job._id,
      jobTitle: job.title || 'Completed Job',
      transactionId: job.transactionId || '',
      employerId: req.userId,
      employerName,
      rating: numRating,
      review: review.trim(),
    });

    return res.json({
      success: true,
      message: 'Worker performance rating & review submitted successfully.',
      review: newReview,
      trustScore: newScore,
      trustScoreChange: scoreChange,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this completed job.',
      });
    }
    console.error('Rate worker error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error submitting rating',
    });
  }
});

/* ── STEP 12G.1: Check if employer already rated this completed job ── */
router.get('/:jobId/worker-review', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    const review = await Review.findOne({
      jobId: job._id,
      employerId: req.userId,
    });

    const isCompletedAndSettled = (job.completionStatus === 'completed' && job.remainingPaymentPaid) || job.workerSettled;

    res.json({
      success: true,
      reviewed: Boolean(review),
      canReview: isCompletedAndSettled && !review && String(job.employer) === String(req.userId),
      review: review || null,
    });
  } catch (err) {
    console.error('Get worker review error:', err);
    res.status(500).json({ success: false, message: 'Server error checking review status' });
  }
});

/* ── STEP 12H: Worker Earnings Summary & Transaction History ── */
router.get('/worker/earnings', protect, async (req, res) => {
  if (req.user.role !== 'seeker') {
    return res.status(403).json({ success: false, message: 'Only workers can access earnings summary' });
  }

  try {
    // 1. Fetch transactions for this worker
    const txns = await Transaction.find({ workerId: req.userId })
      .populate('employerId', 'name firstName lastName email')
      .populate('jobId', 'title department location pay status completionStatus')
      .sort({ createdAt: -1 });

    // 2. Fetch jobs where this worker was hired/applied
    const jobs = await Job.find({
      'applications.applicant': req.userId,
      $or: [
        { hiredWorker: req.userId },
        { 'applications.status': { $in: ['accepted', 'hired', 'completed'] } },
      ],
    }).populate('employer', 'name firstName lastName email');

    const jobTxnMap = new Map();
    txns.forEach(t => {
      jobTxnMap.set(String(t.jobId?._id || t.jobId), t);
    });

    const allWorkerTransactions = [];

    // Process stored transactions
    txns.forEach(t => {
      const employerName = t.employerId?.name || (t.employerId?.firstName ? `${t.employerId.firstName} ${t.employerId.lastName || ''}`.trim() : 'WorkLink Employer');
      const isSettled = t.settlementStatus === 'settled' || t.paymentStatus === 'completed';
      const isDisputed = t.completionStatus === 'disputed';
      
      const statusLabel = isSettled
        ? 'Settled'
        : isDisputed
        ? 'Disputed'
        : t.completionStatus === 'completed'
        ? 'Completed'
        : 'Pending';

      allWorkerTransactions.push({
        transactionId: t.transactionId,
        jobId: t.jobId?._id || t.jobId,
        jobTitle: t.jobTitle || t.jobId?.title || 'Service Work',
        employerName,
        jobAmount: t.jobAmount,
        workLinkFee: t.workerFee,
        netEarning: t.workerNetEarning,
        status: statusLabel,
        settlementStatus: t.settlementStatus,
        completionStatus: t.completionStatus,
        paymentStatus: t.paymentStatus,
        date: new Date(t.settledAt || t.createdAt).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        time: new Date(t.settledAt || t.createdAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        settledAt: t.settledAt,
        createdAt: t.createdAt,
      });
    });

    // Process any jobs without transaction records yet
    jobs.forEach(j => {
      if (!jobTxnMap.has(String(j._id))) {
        const finances = calculateJobFinances(j.pay);
        const employerName = j.employer?.name || (j.employer?.firstName ? `${j.employer.firstName} ${j.employer.lastName || ''}`.trim() : 'WorkLink Employer');
        const isSettled = j.workerSettled || (j.completionStatus === 'completed' && j.remainingPaymentPaid);
        const isDisputed = j.completionStatus === 'disputed';
        const statusLabel = isSettled
          ? 'Settled'
          : isDisputed
          ? 'Disputed'
          : j.completionStatus === 'completed'
          ? 'Completed'
          : 'Pending';

        allWorkerTransactions.push({
          transactionId: j.transactionId || `WL-TXN-${j._id.toString().slice(-8).toUpperCase()}`,
          jobId: j._id,
          jobTitle: j.title,
          employerName,
          jobAmount: finances.jobAmount,
          workLinkFee: finances.workerFee,
          netEarning: finances.workerNetEarning,
          status: statusLabel,
          settlementStatus: isSettled ? 'settled' : 'pending',
          completionStatus: j.completionStatus || 'in_progress',
          paymentStatus: isSettled ? 'completed' : 'pending',
          date: new Date(j.workerSettledAt || j.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          time: new Date(j.workerSettledAt || j.createdAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          settledAt: j.workerSettledAt,
          createdAt: j.createdAt,
        });
      }
    });

    // Compute Worker Summary Metrics
    let totalEarnings = 0;
    let completedJobs = 0;
    let pendingEarnings = 0;
    let workLinkFees = 0;

    allWorkerTransactions.forEach(item => {
      if (item.status === 'Settled' || item.status === 'Completed') {
        totalEarnings += Number(item.netEarning) || 0;
        workLinkFees += Number(item.workLinkFee) || 0;
        completedJobs += 1;
      } else if (item.status === 'Pending') {
        pendingEarnings += Number(item.netEarning) || 0;
      }
    });

    res.json({
      success: true,
      summary: {
        totalEarnings: +totalEarnings.toFixed(2),
        completedJobs,
        pendingEarnings: +pendingEarnings.toFixed(2),
        workLinkFees: +workLinkFees.toFixed(2),
      },
      transactions: allWorkerTransactions,
    });
  } catch (err) {
    console.error('Worker earnings summary error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error retrieving worker earnings',
      details: err.toString(),
    });
  }
});

/* ── STEP 12I: Employer Payment History Summary & Ledger ── */
router.get('/employer/payments', protect, async (req, res) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ success: false, message: 'Only employers can access payment ledger' });
  }

  try {
    // 1. Fetch transactions where employerId is req.userId
    const txns = await Transaction.find({ employerId: req.userId })
      .populate('workerId', 'name firstName lastName email')
      .populate('jobId', 'title department location pay status completionStatus')
      .sort({ createdAt: -1 });

    // 2. Fetch jobs posted by employer that have hired workers
    const jobs = await Job.find({ employer: req.userId, hiredWorker: { $ne: null } })
      .populate('hiredWorker', 'name firstName lastName email')
      .populate('applications.applicant', 'name firstName lastName email');

    const jobTxnMap = new Map();
    txns.forEach(t => {
      jobTxnMap.set(String(t.jobId?._id || t.jobId), t);
    });

    const allEmployerTransactions = [];

    // Process stored transactions
    txns.forEach(t => {
      const workerName = t.workerId?.name || (t.workerId?.firstName ? `${t.workerId.firstName} ${t.workerId.lastName || ''}`.trim() : 'Hired Candidate');
      const isCompleted = t.paymentStatus === 'completed' || t.remainingPaid > 0;
      const isDisputed = t.completionStatus === 'disputed';
      const isAdvancePaid = t.advancePaid > 0 && !isCompleted;

      const paymentStatusLabel = isCompleted
        ? 'Completed'
        : isDisputed
        ? 'Disputed'
        : isAdvancePaid
        ? 'Advance Paid (50%)'
        : 'Pending';

      const totalPaid = +(t.advancePaid + (t.remainingPaid || 0)).toFixed(2);

      allEmployerTransactions.push({
        transactionId: t.transactionId,
        jobId: t.jobId?._id || t.jobId,
        jobTitle: t.jobTitle || t.jobId?.title || 'Job Position',
        workerName,
        jobAmount: t.jobAmount,
        employerFee: t.employerFee,
        employerTotal: t.employerTotal,
        advancePaid: t.advancePaid,
        remainingPaid: t.remainingPaid || 0,
        remainingAmount: t.remainingAmount,
        totalPaid,
        paymentStatus: paymentStatusLabel,
        completionStatus: t.completionStatus,
        date: new Date(t.remainingPaidAt || t.advancePaidAt || t.createdAt).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        time: new Date(t.remainingPaidAt || t.advancePaidAt || t.createdAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAt: t.createdAt,
      });
    });

    // Process any jobs without transaction records yet
    jobs.forEach(j => {
      if (!jobTxnMap.has(String(j._id))) {
        const finances = calculateJobFinances(j.pay);
        const hiredApp = j.applications?.find(a => a.status === 'accepted' || a.status === 'hired');
        const candidate = j.hiredWorker || hiredApp?.applicant;
        const workerName = candidate?.name || (candidate?.firstName ? `${candidate.firstName} ${candidate.lastName || ''}`.trim() : 'Hired Candidate');
        const isCompleted = j.remainingPaymentPaid || (j.status === 'closed' && j.completionStatus === 'completed');
        const isDisputed = j.completionStatus === 'disputed';

        const totalPaid = isCompleted ? finances.employerTotal : finances.advanceAmount;

        allEmployerTransactions.push({
          transactionId: j.transactionId || `WL-TXN-${j._id.toString().slice(-8).toUpperCase()}`,
          jobId: j._id,
          jobTitle: j.title,
          workerName,
          jobAmount: finances.jobAmount,
          employerFee: finances.employerFee,
          employerTotal: finances.employerTotal,
          advancePaid: finances.advanceAmount,
          remainingPaid: isCompleted ? finances.remainingAmount : 0,
          remainingAmount: finances.remainingAmount,
          totalPaid,
          paymentStatus: isCompleted ? 'Completed' : isDisputed ? 'Disputed' : 'Advance Paid (50%)',
          completionStatus: j.completionStatus || 'in_progress',
          date: new Date(j.remainingPaidAt || j.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          time: new Date(j.remainingPaidAt || j.createdAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          createdAt: j.createdAt,
        });
      }
    });

    // Compute Employer Summary Metrics
    let totalPaid = 0;
    let advancePayments = 0;
    let remainingPayments = 0;
    let pendingPayments = 0;

    allEmployerTransactions.forEach(item => {
      totalPaid += Number(item.totalPaid) || 0;
      advancePayments += Number(item.advancePaid) || 0;
      remainingPayments += Number(item.remainingPaid) || 0;
      if (item.paymentStatus !== 'Completed' && item.paymentStatus !== 'Disputed') {
        pendingPayments += Number(item.remainingAmount) || 0;
      }
    });

    res.json({
      success: true,
      summary: {
        totalPaid: +totalPaid.toFixed(2),
        advancePayments: +advancePayments.toFixed(2),
        remainingPayments: +remainingPayments.toFixed(2),
        pendingPayments: +pendingPayments.toFixed(2),
      },
      transactions: allEmployerTransactions,
    });
  } catch (err) {
    console.error('Employer payment ledger error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Server error retrieving payment ledger',
      details: err.toString(),
    });
  }
});

/* ── STEP 12G: Get Final Transaction Receipts (Role-separated) ── */
router.get('/:jobId/transaction', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId)
      .populate('employer', 'name firstName lastName email')
      .populate('hiredWorker', 'name firstName lastName email');

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    let txn = await Transaction.findOne({ jobId: job._id })
      .populate('employerId', 'name firstName lastName email')
      .populate('workerId', 'name firstName lastName email');

    const finances = calculateJobFinances(job.pay);
    const employerUser = typeof job.employer === 'object' ? job.employer : await User.findById(job.employer);
    const workerUser = typeof job.hiredWorker === 'object' ? job.hiredWorker : (job.hiredWorker ? await User.findById(job.hiredWorker) : null);

    const employerName = employerUser?.name || `${employerUser?.firstName || ''} ${employerUser?.lastName || ''}`.trim() || 'WorkLink Employer';
    const workerName = workerUser?.name || `${workerUser?.firstName || ''} ${workerUser?.lastName || ''}`.trim() || 'WorkLink Worker';

    // Fallback transaction object if queried before advance record was persisted
    const txnData = txn || {
      transactionId: job.transactionId || `WL-TXN-${job._id.toString().substring(18).toUpperCase()}`,
      jobId: job._id,
      jobTitle: job.title,
      ...finances,
      advancePaid: finances.advanceAmount,
      remainingPaid: job.remainingPaymentPaid ? finances.remainingAmount : 0,
      paymentStatus: job.remainingPaymentPaid ? 'completed' : 'advance_paid',
      settlementStatus: job.workerSettled ? 'settled' : 'pending',
      completionStatus: job.completionStatus,
      advancePaidAt: job.createdAt,
      remainingPaidAt: job.remainingPaidAt,
      settledAt: job.workerSettledAt,
      createdAt: job.createdAt,
    };

    if (req.user.role === 'seeker') {
      // ── Worker sees ONLY Worker-side information (NO employer fee shown) ──
      return res.json({
        success: true,
        view: 'worker',
        receipt: {
          transactionId: txnData.transactionId,
          jobId: job._id,
          jobTitle: job.title,
          employerName,
          jobAmount: finances.jobAmount,
          workerFee: finances.workerFee,
          netEarning: finances.workerNetEarning,
          settlementStatus: job.workerSettled ? 'Settled' : 'Pending Settlement',
          completionStatus: job.completionStatus,
          date: new Date(txnData.settledAt || txnData.createdAt || Date.now()).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          time: new Date(txnData.settledAt || txnData.createdAt || Date.now()).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      });
    } else if (req.user.role === 'employer') {
      // ── Employer sees ONLY Employer-side information (NO worker fee shown) ──
      const totalPaid = +(txnData.advancePaid + (job.remainingPaymentPaid ? txnData.remainingAmount : 0)).toFixed(2);
      return res.json({
        success: true,
        view: 'employer',
        receipt: {
          transactionId: txnData.transactionId,
          jobId: job._id,
          jobTitle: job.title,
          workerName,
          jobAmount: finances.jobAmount,
          platformFee: finances.employerFee,
          employerTotal: finances.employerTotal,
          advancePaid: txnData.advancePaid || finances.advanceAmount,
          remainingPaid: job.remainingPaymentPaid ? finances.remainingAmount : 0,
          totalPaid: job.remainingPaymentPaid ? finances.employerTotal : finances.advanceAmount,
          paymentStatus: job.remainingPaymentPaid ? 'Completed' : 'Advance Paid (50%)',
          completionStatus: job.completionStatus,
          remainingPaymentReady: job.remainingPaymentReady && !job.remainingPaymentPaid,
          date: new Date(txnData.remainingPaidAt || txnData.createdAt || Date.now()).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          time: new Date(txnData.remainingPaidAt || txnData.createdAt || Date.now()).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      });
    }

    // Admin default
    res.json({ success: true, transaction: txnData });
  } catch (err) {
    console.error('Get transaction receipt error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving transaction' });
  }
});

export default router;

