import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import Job from '../models/Job.js';

const router = express.Router();

/* ── Create a new job (Employer only) ── */
router.post(
  '/',
  protect,
  [
    body('title').notEmpty().withMessage('Title is required'),
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
      return res.status(400).json({ success: false, errors: errors.array() });
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

/* ── Get jobs (Employer gets own, Seeker gets all active) ── */
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role === 'employer') {
      // Employer sees their own jobs with applicant details populated
      const jobs = await Job.find({ employer: req.userId })
        .populate('applications.applicant', 'firstName lastName email role trustScore isVerified')
        .sort({ createdAt: -1 });
      return res.json({ success: true, jobs });
    } else {
      // Seeker sees all active jobs
      const jobs = await Job.find({ status: 'active' })
        .populate('employer', 'firstName lastName trustScore isVerified')
        .sort({ createdAt: -1 });
      return res.json({ success: true, jobs });
    }
  } catch (err) {
    console.error('Get jobs error:', err);
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

export default router;
