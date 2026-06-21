import express from 'express';
import User from '../models/User.js';

const router = express.Router();

/* ═══════════════════════════════════════════
   GET /api/stats
   Public endpoint — returns live platform stats
   ═══════════════════════════════════════════ */
router.get('/', async (req, res) => {
  try {
    // Count total users by role
    const totalSeekers = await User.countDocuments({ role: 'seeker' });
    const totalEmployers = await User.countDocuments({ role: 'employer' });
    const totalUsers = totalSeekers + totalEmployers;

    // Count verified users (profile completed with documents)
    const verifiedUsers = await User.countDocuments({ profileComplete: true });

    // Count users with documents uploaded
    const documentsUploaded = await User.countDocuments({ documentsUploaded: true });

    // Calculate average trust score (only for users who have done something)
    const trustAgg = await User.aggregate([
      { $group: { _id: null, avgTrust: { $avg: '$trustScore' } } },
    ]);
    const avgTrustScore = trustAgg.length > 0 ? Math.round(trustAgg[0].avgTrust) : 0;

    // Completion rate (profiles completed / total users)
    const completionRate = totalUsers > 0
      ? Math.round((verifiedUsers / totalUsers) * 100)
      : 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalSeekers,
        totalEmployers,
        verifiedUsers,
        documentsUploaded,
        avgTrustScore,
        completionRate,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
