import express from 'express';
import { validateAadhaar, validatePAN } from '../utils/validators.js';
import { protect } from '../middleware/auth.js';
import DocumentRecord from '../models/DocumentRecord.js';
import multer from 'multer';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

const CASHFREE_CONFIGURED =
  process.env.CASHFREE_CLIENT_ID &&
  process.env.CASHFREE_CLIENT_ID !== 'dummy_client_id' &&
  process.env.CASHFREE_CLIENT_SECRET &&
  process.env.CASHFREE_CLIENT_SECRET !== 'dummy_secret';

// Lazy-load Cashfree SDK only when keys are configured
let Cashfree = null;
if (CASHFREE_CONFIGURED) {
  try {
    const module = await import('cashfree-verification');
    Cashfree = module.Cashfree;
    Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID;
    Cashfree.XClientSecret = process.env.CASHFREE_CLIENT_SECRET;
    Cashfree.XEnvironment = process.env.CASHFREE_ENV === 'PRODUCTION'
      ? Cashfree.Environment?.PRODUCTION || 'PRODUCTION'
      : Cashfree.Environment?.SANDBOX || 'SANDBOX';
    console.log('🔑 Cashfree verification SDK loaded (API mode)');
  } catch (err) {
    console.warn('⚠️  Cashfree SDK not installed — using local validation only');
  }
} else {
  console.log('🔧 Cashfree keys not configured — using local validation (Verhoeff + PAN regex)');
}


/* ═══════════════════════════════════════════════════════════════════════════
   AADHAAR VERIFICATION
   ═══════════════════════════════════════════════════════════════════════════ */

router.post('/aadhaar/send-otp', protect, async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;

    // Step 1: Always run Verhoeff checksum validation first
    const localCheck = validateAadhaar(aadhaarNumber);
    if (!localCheck.valid) {
      return res.status(400).json({ success: false, message: localCheck.message });
    }

    /* ── LOCAL MODE: Verhoeff passed → check against MongoDB records ── */
    if (!Cashfree) {
      const cleanNumber = aadhaarNumber.replace(/[\s-]/g, '');

      // Step 2: Look up in database
      const record = await DocumentRecord.findOne({ docType: 'aadhaar', docNumber: cleanNumber });

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Aadhaar number not found in records. Verhoeff checksum passed but no matching entry exists in the database.',
          method: 'database_lookup',
        });
      }

      // Step 3: Check if already used by another user
      if (record.usedBy && record.usedBy.toString() !== req.userId) {
        return res.status(409).json({
          success: false,
          message: 'This Aadhaar number is already linked to another account.',
          alreadyUsed: true,
          method: 'database_lookup',
        });
      }

      // Step 4: Mark as used by this user
      if (!record.usedBy) {
        record.usedBy = req.userId;
        await record.save();
      }

      return res.json({
        success: true,
        verified: true,
        ref_id: `local_${Date.now()}`,
        message: `Aadhaar verified — matches record for ${record.holderName} (${localCheck.masked})`,
        holderName: record.holderName,
        method: 'database_lookup',
        localMode: true,
      });
    }

    /* ── API MODE: Call Cashfree to send real OTP ── */
    const request = {
      verification_id: `aadhaar_${Date.now()}`,
      aadhaar_number: aadhaarNumber.replace(/[\s-]/g, ''),
    };

    const response = await Cashfree.VrsAadhaarOtpSendOtp(request);

    res.json({
      success: true,
      ref_id: response.data.ref_id,
      message: 'OTP sent to Aadhaar-linked mobile number',
      method: 'cashfree_otp_sent',
    });
  } catch (error) {
    console.error('Aadhaar verification error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Aadhaar verification failed.',
    });
  }
});


/* ── Step 2: Verify OTP (only needed in API mode) ── */
router.post('/aadhaar/verify-otp', protect, async (req, res) => {
  try {
    const { refId, otp } = req.body;

    /* ── LOCAL MODE: OTP step not needed, but handle gracefully ── */
    if (!Cashfree) {
      return res.json({
        success: true,
        verified: true,
        message: 'Aadhaar verified via local Verhoeff algorithm',
        method: 'verhoeff_checksum',
        localMode: true,
      });
    }

    /* ── API MODE: Verify OTP via Cashfree ── */
    const request = { ref_id: refId, otp: otp };
    const response = await Cashfree.VrsAadhaarOtpVerifyOtp(request);

    res.json({
      success: true,
      verified: true,
      data: response.data,
      message: 'Aadhaar identity verified successfully',
      method: 'cashfree_otp_verified',
    });
  } catch (error) {
    console.error('Aadhaar OTP verify error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Invalid OTP or verification failed.',
    });
  }
});


/* ═══════════════════════════════════════════════════════════════════════════
   PAN VERIFICATION
   ═══════════════════════════════════════════════════════════════════════════ */

router.post('/pan', protect, async (req, res) => {
  try {
    const { panNumber } = req.body;

    // Step 1: Always run PAN regex + entity type validation first
    const localCheck = validatePAN(panNumber);
    if (!localCheck.valid) {
      return res.status(400).json({ success: false, message: localCheck.message });
    }

    /* ── LOCAL MODE: Regex passed → check against MongoDB records ── */
    if (!Cashfree) {
      const cleanPAN = panNumber.toUpperCase().trim();

      // Step 2: Look up in database
      const record = await DocumentRecord.findOne({ docType: 'pan', docNumber: cleanPAN });

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'PAN not found in records. Format is valid but no matching entry exists in the database.',
          method: 'database_lookup',
        });
      }

      // Step 3: Check if already used by another user
      if (record.usedBy && record.usedBy.toString() !== req.userId) {
        return res.status(409).json({
          success: false,
          message: 'This PAN number is already linked to another account.',
          alreadyUsed: true,
          method: 'database_lookup',
        });
      }

      // Step 4: Mark as used by this user
      if (!record.usedBy) {
        record.usedBy = req.userId;
        await record.save();
      }

      return res.json({
        success: true,
        valid: true,
        message: `Valid PAN — ${record.holderName} (${cleanPAN})`,
        holderName: record.holderName,
        entityType: localCheck.entityType,
        method: 'database_lookup',
        localMode: true,
      });
    }

    /* ── API MODE: Check against govt database via Cashfree ── */
    const request = {
      verification_id: `pan_${Date.now()}`,
      pan: panNumber.toUpperCase(),
    };

    const response = await Cashfree.VrsPanVerification(request);

    res.json({
      success: true,
      valid: response.data.status === 'VALID',
      message: response.data.status === 'VALID' ? `Valid PAN — ${response.data.registered_name}` : 'Invalid PAN',
      data: response.data,
      entityType: localCheck.entityType,
      method: 'cashfree_pan',
    });
  } catch (error) {
    console.error('PAN verification error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'PAN verification failed.',
    });
  }
});


/* ═══════════════════════════════════════════════════════════════════════════
   FACE MATCH (API mode only — skipped in local mode)
   ═══════════════════════════════════════════════════════════════════════════ */

router.post('/face-match', upload.single('photo'), async (req, res) => {
  try {
    const { aadhaarPhoto } = req.body; // base64 from Aadhaar OTP response
    const selfie = req.file; // uploaded selfie

    /* ── LOCAL MODE: Accept photo upload, skip comparison ── */
    if (!Cashfree) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.json({
        success: true,
        match: true,
        score: 100,
        message: 'Face match skipped in local mode — photo accepted',
        method: 'local_accepted',
        localMode: true,
      });
    }

    /* ── API MODE: Compare selfie with Aadhaar photo via Cashfree ── */
    if (!selfie || !aadhaarPhoto) {
      return res.status(400).json({ success: false, message: 'Both Aadhaar photo and selfie are required' });
    }

    // Convert selfie to base64
    const selfieBase64 = fs.readFileSync(selfie.path, { encoding: 'base64' });

    const request = {
      verification_id: `face_${Date.now()}`,
      first_image: aadhaarPhoto,
      second_image: selfieBase64,
    };

    const response = await Cashfree.VrsFaceMatch(request);

    // Clean up uploaded file
    fs.unlinkSync(selfie.path);

    res.json({
      success: true,
      match: response.data.match_score > 70,
      score: response.data.match_score,
      method: 'cashfree_face',
    });
  } catch (error) {
    console.error('Face match error:', error.response?.data || error.message);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: error.message });
  }
});


/* ── Verification mode status endpoint ── */
router.get('/mode', (req, res) => {
  res.json({
    mode: Cashfree ? 'api' : 'local',
    description: Cashfree
      ? 'Cashfree API — real-time government database verification'
      : 'Local validation — Verhoeff checksum (Aadhaar) + regex (PAN) + MongoDB lookup',
  });
});

export default router;
