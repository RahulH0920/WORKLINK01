import express from 'express';
import { validateAadhaar, validatePAN } from '../utils/validators.js';
import multer from 'multer';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

/* ═══════════════════════════════════════════════════════════════════════════
   MODE DETECTION
   ─────────────────────────────────────────────────────────────────────────
   If Cashfree credentials are configured → use real API (production/sandbox)
   If not configured → fall back to local algorithmic validation only:
     • Aadhaar → Verhoeff checksum algorithm (catches all substitution &
       transposition errors)
     • PAN → Format + entity type regex validation
   ═══════════════════════════════════════════════════════════════════════════ */

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

/* ── Step 1: Send OTP (or validate locally) ── */
router.post('/aadhaar/send-otp', async (req, res) => {
  try {
    const { aadhaarNumber } = req.body;

    // Always run local Verhoeff validation first
    const localCheck = validateAadhaar(aadhaarNumber);
    if (!localCheck.valid) {
      return res.status(400).json({ success: false, message: localCheck.message });
    }

    /* ── LOCAL MODE: Verhoeff passed → verified immediately ── */
    if (!Cashfree) {
      return res.json({
        success: true,
        verified: true,                             // ← directly verified
        ref_id: `local_${Date.now()}`,
        message: `Aadhaar verified — Verhoeff checksum passed (${localCheck.masked})`,
        method: 'verhoeff_checksum',
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
router.post('/aadhaar/verify-otp', async (req, res) => {
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

    // response.data contains: name, dob, gender, address, photo (base64)
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

router.post('/pan', async (req, res) => {
  try {
    const { panNumber } = req.body;

    // Always run local regex + entity type validation
    const localCheck = validatePAN(panNumber);
    if (!localCheck.valid) {
      return res.status(400).json({ success: false, message: localCheck.message });
    }

    /* ── LOCAL MODE: Regex + entity type passed → verified ── */
    if (!Cashfree) {
      return res.json({
        success: true,
        valid: true,
        message: `Valid PAN — ${localCheck.entityType} (${panNumber.toUpperCase()})`,
        entityType: localCheck.entityType,
        method: 'pan_regex_validation',
        localMode: true,
      });
    }

    /* ── API MODE: Check against govt database via Cashfree ── */
    const request = {
      verification_id: `pan_${Date.now()}`,
      pan: panNumber.toUpperCase(),
    };

    const response = await Cashfree.VrsPanVerification(request);

    // response.data contains: name_provided, registered_name, pan, status (VALID/INVALID)
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
      : 'Local validation — Verhoeff checksum (Aadhaar) + regex (PAN)',
  });
});

export default router;
