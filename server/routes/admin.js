import express from 'express';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/* ═══════════════════════════════════════════
   GET /api/admin/pending-verifications
   Get all users who have uploaded documents but aren't verified
   ═══════════════════════════════════════════ */
router.get('/pending-verifications', protect, authorize('admin'), async (req, res) => {
  try {
    const pendingUsers = await User.find({
      documentsUploaded: true,
      isVerified: false,
    }).select('-password').sort({ updatedAt: -1 });

    res.json({ success: true, users: pendingUsers });
  } catch (err) {
    console.error('Pending verifications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ═══════════════════════════════════════════
   POST /api/admin/verify/:userId
   Approve or reject a user's documents
   ═══════════════════════════════════════════ */
router.post('/verify/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (action === 'approve') {
      // Mark as verified, add 15 trust points, update all doc statuses to verified
      user.isVerified = true;
      user.trustScore = (user.trustScore || 0) + 15;
      user.documents = user.documents.map(doc => ({ ...doc.toObject(), status: 'verified' }));
    } else if (action === 'reject') {
      // Mark documents as rejected, reset documentsUploaded so they have to upload again
      user.documentsUploaded = false;
      user.documents = user.documents.map(doc => ({ ...doc.toObject(), status: 'rejected' }));
      // Optional: penalize trust score slightly or just keep it as is
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    console.error('Verify user error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
