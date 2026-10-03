import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Transaction from '../models/Transaction.js';
import DocumentRecord from '../models/DocumentRecord.js';
import TrustHistory from '../models/TrustHistory.js';
import Review from '../models/Review.js';
import { protect } from '../middleware/auth.js';
import { validateAadhaar, validatePAN, verifyDocumentsWithAtlasDataset } from '../utils/validators.js';
import { processUploadedDocumentsOCR } from '../utils/ocr.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '..', 'uploads', 'documents');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadsDir, req.userId);

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    cb(null, userDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${file.fieldname}_${Date.now()}${ext}`;

    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, JPEG and PNG files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/* ─────────────────────────────────────────────
   UPDATE BIO
───────────────────────────────────────────── */

router.put(
  '/bio',
  protect,
  [
    body('bio')
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),

    body('location')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Location cannot exceed 100 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    try {
      const updateFields = {
        bio: req.body.bio,
      };

      if (req.body.location !== undefined) {
        updateFields.location = req.body.location;
      }

      const user = await User.findByIdAndUpdate(
        req.userId,
        updateFields,
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (err) {
      console.error('Update bio error:', err);

      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

/* ─────────────────────────────────────────────
   UPDATE SKILLS
───────────────────────────────────────────── */

router.put(
  '/skills',
  protect,
  [
    body('skills')
      .isArray({ max: 10 })
      .withMessage('Maximum 10 skills allowed'),

    body('skills.*.name')
      .trim()
      .notEmpty()
      .withMessage('Skill name is required')
      .isLength({ max: 30 })
      .withMessage('Skill name too long'),

    body('skills.*.level')
      .isInt({ min: 0, max: 100 })
      .withMessage('Level must be between 0 and 100'),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    try {
      const user = await User.findByIdAndUpdate(
        req.userId,
        {
          skills: req.body.skills,
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (err) {
      console.error('Update skills error:', err);

      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

/* ─────────────────────────────────────────────
   COMPLETE PROFILE & VERIFY IDENTITY WITH OCR
   Runs local OCR extraction on uploaded Aadhaar & PAN files,
   then validates against the WorkLink reference dataset.
───────────────────────────────────────────── */

router.post(
  '/complete',
  protect,
  upload.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const aadhaar = req.files?.aadhaar?.[0];
      const pan = req.files?.pan?.[0];
      const photo = req.files?.photo?.[0];
      const selfie = req.files?.selfie?.[0];
      const isFaceVerified = req.body.faceVerified === 'true' || req.body.faceVerified === true;
      const faceMatchScore = Number(req.body.faceMatchScore) || 0;

      if (!aadhaar || !photo) {
        return res.status(400).json({
          success: false,
          message: 'Aadhaar and Photo files are required.',
        });
      }

      if (!isFaceVerified) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'Live face verification failed or is missing. Please complete live webcam selfie verification before submitting.',
        });
      }

      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // ── Step 1: Run Local OCR on Uploaded Aadhaar & (optional) PAN Files ──
      const ocrResults = await processUploadedDocumentsOCR({
        aadhaarPath: aadhaar.path,
        panPath: pan?.path,
      });

      // ── Step 2: Determine Effective Document Data ──
      // Prioritize OCR-extracted data, with fallback to user-entered inputs
      // OCR is mandatory for Aadhaar: never trust manually entered numbers when OCR fails
      const enteredAadhaar = (req.body.aadhaarNumber || '').trim();
      const enteredPAN = (req.body.panNumber || '').trim().toUpperCase();

      const extractedAadhaar = (ocrResults.aadhaar.docNumber || '').trim();
      const extractedPAN = (ocrResults.pan?.docNumber || '').trim().toUpperCase();

      if (!extractedAadhaar) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'Verification Not Confirmed: Aadhaar number could not be detected from the uploaded Aadhaar document.',
        });
      }

      if (extractedAadhaar !== enteredAadhaar) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: 'Verification Not Confirmed: Aadhaar number in the uploaded document does not match the entered Aadhaar number.',
        });
      }

      // ── Handle PAN (Optional) ──
      let effectivePAN = '';
      if (pan) {
        if (!extractedPAN) {
          return res.status(400).json({
            success: false,
            verified: false,
            message: 'Verification Not Confirmed: PAN number could not be detected from the uploaded PAN document.',
          });
        }
        if (enteredPAN && extractedPAN !== enteredPAN) {
          return res.status(400).json({
            success: false,
            verified: false,
            message: 'Verification Not Confirmed: PAN number in the uploaded document does not match the entered PAN number.',
          });
        }
        effectivePAN = extractedPAN;
      } else if (enteredPAN) {
        const panCheck = validatePAN(enteredPAN);
        if (!panCheck.valid) {
          return res.status(400).json({
            success: false,
            verified: false,
            message: `Verification Not Confirmed: ${panCheck.message}`,
          });
        }
        effectivePAN = enteredPAN;
      }

      const effectiveAadhaar = extractedAadhaar;

      let effectiveHolderName = (
        ocrResults.aadhaar.holderName ||
        ocrResults.pan?.holderName ||
        req.body.holderName ||
        user.name ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim()
      ).trim();

      // ── Step 3: Verify against WorkLink Reference Dataset ──
      let verifResult = await verifyDocumentsWithAtlasDataset({
        aadhaarNumber: effectiveAadhaar,
        panNumber: effectivePAN,
        holderName: effectiveHolderName,
      });

      // If OCR-extracted name had noise but user candidate name matches the reference record, verify against candidate name
      if (!verifResult.verified && verifResult.details?.aadhaarFound) {
        const candidateName = (req.body.holderName || user.name || `${user.firstName || ''} ${user.lastName || ''}`).trim();
        if (candidateName && candidateName !== effectiveHolderName) {
          const fallbackResult = await verifyDocumentsWithAtlasDataset({
            aadhaarNumber: effectiveAadhaar,
            panNumber: effectivePAN,
            holderName: candidateName,
          });
          if (fallbackResult.verified) {
            verifResult = fallbackResult;
            effectiveHolderName = candidateName;
          }
        }
      }

      const isVerified = Boolean(verifResult.verified);
      const docStatus = isVerified ? 'verified' : 'rejected';

      const documents = [
        {
          docType: 'aadhaar',
          fileName: aadhaar.originalname,
          filePath: `documents/${req.userId}/${aadhaar.filename}`,
          uploadedAt: new Date(),
          status: docStatus,
          verificationMessage: isVerified
            ? 'Aadhaar matched in WorkLink reference dataset'
            : (verifResult.details?.aadhaarFound ? 'Aadhaar number found but name mismatch' : 'Aadhaar record not found in WorkLink reference dataset'),
        },
      ];

      if (pan) {
        documents.push({
          docType: 'pan',
          fileName: pan.originalname,
          filePath: `documents/${req.userId}/${pan.filename}`,
          uploadedAt: new Date(),
          status: docStatus,
          verificationMessage: isVerified
            ? 'PAN matched in WorkLink reference dataset'
            : (verifResult.details?.panFound ? 'PAN number found but name mismatch' : 'PAN record not found in WorkLink reference dataset'),
        });
      }

      documents.push({
        docType: 'photo',
        fileName: photo.originalname,
        filePath: `documents/${req.userId}/${photo.filename}`,
        uploadedAt: new Date(),
        status: isVerified ? 'verified' : 'pending',
        verificationMessage: isVerified ? 'Photo registered with verified profile' : 'Pending verification',
      });

      // Initial Trust Score upon successful identity verification = 20 / 100
      let newTrustScore = user.trustScore || 0;
      if (isVerified && !user.isVerified) {
        newTrustScore = 20;
        try {
          const hasVerifHistory = await TrustHistory.findOne({ workerId: user._id, type: 'verification' });
          if (!hasVerifHistory) {
            await TrustHistory.create({
              workerId: user._id,
              type: 'verification',
              reason: 'Identity Verification',
              change: 20,
              previousScore: 0,
              newScore: 20,
            });
          }
        } catch (e) {
          console.error('Failed to log verification TrustHistory:', e);
        }
      }

      const updateData = {
        documents,
        documentsUploaded: true,
        profileComplete: isVerified ? true : false,
        isVerified: isVerified ? true : false,
        verificationStatus: isVerified ? 'approved' : 'rejected',
        adminDecision: isVerified ? 'approved' : (user.adminDecision || 'pending'),
        trustScore: newTrustScore,
        verificationScore: isVerified ? 100 : 0,
        documentMatchScore: isVerified ? 100 : 0,
        faceMatchScore: isFaceVerified ? (faceMatchScore || 95) : 0,
        rejectionReason: isVerified ? '' : verifResult.message,
        verifiedAt: isVerified ? new Date() : null,
        verificationChecks: {
          aadhaarValid: verifResult.details?.aadhaarFound || false,
          panValid: effectivePAN ? (verifResult.details?.panFound || false) : false,
          crossDocumentMatch: verifResult.details?.nameMatched || false,
          ocrCompleted: true,
          faceMatchCompleted: isFaceVerified,
          livenessCompleted: isFaceVerified,
        },
        ocrResult: {
          aadhaar: {
            name: ocrResults.aadhaar.holderName || (verifResult.details?.aadhaarRecord?.holderName || effectiveHolderName),
            documentNumber: effectiveAadhaar,
            dateOfBirth: ocrResults.aadhaar.dob || '',
            gender: ocrResults.aadhaar.gender || '',
            extracted: Boolean(ocrResults.aadhaar.docNumber || ocrResults.aadhaar.holderName),
          },
          pan: {
            name: ocrResults.pan?.holderName || (verifResult.details?.panRecord?.holderName || (effectivePAN ? effectiveHolderName : '')),
            documentNumber: effectivePAN,
            dateOfBirth: ocrResults.pan?.dob || '',
            extracted: Boolean(ocrResults.pan?.docNumber || ocrResults.pan?.holderName),
          },
        },
      };

      const updatedUser = await User.findByIdAndUpdate(req.userId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!isVerified) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: verifResult.message || 'Verification Not Confirmed: Verification checks failed.',
          details: verifResult.details,
          ocr: ocrResults,
          user: updatedUser,
        });
      }

      res.json({
        success: true,
        verified: true,
        message: 'Profile completion and verification successful. Your profile has been automatically approved.',
        details: verifResult.details,
        ocr: ocrResults,
        user: updatedUser,
      });
    } catch (err) {
      console.error('Profile complete error:', err);

      res.status(500).json({
        success: false,
        message: 'Profile completion failed',
        error: err.message,
      });
    }
  }
);

/* ─────────────────────────────────────────────
   GET PROFILE
───────────────────────────────────────────── */

router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error('Get profile error:', err);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/* ─────────────────────────────────────────────
   FETCH AADHAAR RECORD FROM WORKLINK DATASET
───────────────────────────────────────────── */
router.get('/fetch-aadhaar/:aadhaarNumber', protect, async (req, res) => {
  try {
    const rawNumber = req.params.aadhaarNumber || '';
    const cleanAadhaar = rawNumber.replace(/[\s-]/g, '');

    // Verhoeff format check
    const localCheck = validateAadhaar(cleanAadhaar);
    if (!localCheck.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: localCheck.message || 'Invalid Aadhaar number format',
      });
    }

    const aadhaarRecord = await DocumentRecord.findOne({
      docType: 'aadhaar',
      docNumber: cleanAadhaar,
    });

    if (!aadhaarRecord) {
      return res.json({
        success: true,
        found: false,
        verified: true,
        message: 'Aadhaar verified, but matching record was not found in the WorkLink reference dataset.',
      });
    }

    const maskedAadhaar = `XXXX XXXX ${cleanAadhaar.slice(-4)}`;

    return res.json({
      success: true,
      found: true,
      verified: true,
      message: 'Aadhaar verified and reference record fetched successfully.',
      record: {
        docType: aadhaarRecord.docType,
        holderName: aadhaarRecord.holderName,
        maskedAadhaar,
      },
    });
  } catch (err) {
    console.error('Fetch Aadhaar record error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Aadhaar details from dataset',
      error: err.message,
    });
  }
});

/* ─────────────────────────────────────────────
   GET TRUST HISTORY & STATS (WORKER & EMPLOYER)
───────────────────────────────────────────── */
router.get('/trust-history', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isEmployer = user.role === 'employer';

    if (isEmployer) {
      // Ensure verified employer has at least 20 initial score & history entry
      if (user.isVerified) {
        const hasVerifHistory = await TrustHistory.findOne({
          employerId: user._id,
          targetRole: 'employer',
          type: 'verification',
        });

        if (!hasVerifHistory) {
          if (!user.trustScore || user.trustScore < 20) {
            user.trustScore = 20;
            await user.save();
          }
          try {
            await TrustHistory.create({
              employerId: user._id,
              targetRole: 'employer',
              type: 'verification',
              reason: 'Identity & Business Verification',
              change: 20,
              previousScore: 0,
              newScore: user.trustScore || 20,
              createdAt: user.verifiedAt || user.createdAt || new Date(),
              source: 'verification',
            });
          } catch (e) {
            console.error('Initial employer verif history creation error:', e);
          }
        }
      }

      const history = await TrustHistory.find({
        employerId: req.userId,
        targetRole: 'employer',
      }).sort({ createdAt: -1 });

      return res.json({
        success: true,
        trustScore: user.trustScore || (user.isVerified ? 20 : 0),
        isVerified: Boolean(user.isVerified),
        verificationStatus: user.verificationStatus || 'not_submitted',
        history,
        role: 'employer',
      });
    }

    // ── Seeker / Worker Trust History ──
    if (user.isVerified) {
      const hasVerifHistory = await TrustHistory.findOne({
        workerId: user._id,
        targetRole: { $ne: 'employer' },
        type: 'verification',
      });
      if (!hasVerifHistory) {
        if (!user.trustScore || user.trustScore < 20) {
          user.trustScore = 20;
          await user.save();
        }
        try {
          await TrustHistory.create({
            workerId: user._id,
            targetRole: 'seeker',
            type: 'verification',
            reason: 'Identity Verification',
            change: 20,
            previousScore: 0,
            newScore: user.trustScore || 20,
            createdAt: user.verifiedAt || user.createdAt || new Date(),
            source: 'verification',
          });
        } catch (e) {
          console.error('Initial verif history creation error:', e);
        }
      }
    }

    const history = await TrustHistory.find({
      workerId: req.userId,
      targetRole: { $ne: 'employer' },
    }).sort({ createdAt: -1 });

    const reviews = await Review.find({ workerId: req.userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      trustScore: user.trustScore || (user.isVerified ? 20 : 0),
      isVerified: Boolean(user.isVerified),
      verificationStatus: user.verificationStatus || 'not_submitted',
      history,
      reviews,
      role: 'seeker',
    });
  } catch (err) {
    console.error('Get trust history error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve trust score history',
      error: err.message,
    });
  }
});


/* ─────────────────────────────────────────────
   GET WORKER REVIEWS
───────────────────────────────────────────── */
router.get('/reviews', protect, async (req, res) => {
  try {
    const reviews = await Review.find({ workerId: req.userId }).sort({ createdAt: -1 });
    res.json({
      success: true,
      reviews,
    });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve reviews',
      error: err.message,
    });
  }
});

/* ─────────────────────────────────────────────
   GET PUBLIC WORKER PROFILE (INCLUDING REAL TRUST SCORE & REVIEWS)
───────────────────────────────────────────── */
router.get('/worker/:workerId', async (req, res) => {
  try {
    const worker = await User.findById(req.params.workerId).select('-password');
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found' });
    }

    const reviews = await Review.find({ workerId: worker._id }).sort({ createdAt: -1 });
    const history = await TrustHistory.find({ workerId: worker._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      worker,
      trustScore: worker.trustScore || 0,
      reviews,
      history,
    });
  } catch (err) {
    console.error('Get worker profile error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve worker profile',
      error: err.message,
    });
  }
});

/* ─────────────────────────────────────────────
   PROFILE PHOTO UPLOAD & REMOVE
───────────────────────────────────────────── */
router.post('/photo', protect, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    const photoUrl = `http://localhost:5000/uploads/documents/${req.userId}/${req.file.filename}`;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.photoUrl = photoUrl;

    const existingPhotoIndex = (user.documents || []).findIndex(d => d.docType === 'photo');
    if (existingPhotoIndex >= 0) {
      user.documents[existingPhotoIndex].fileName = req.file.originalname;
      user.documents[existingPhotoIndex].filePath = `documents/${req.userId}/${req.file.filename}`;
      user.documents[existingPhotoIndex].uploadedAt = new Date();
    } else {
      user.documents.push({
        docType: 'photo',
        fileName: req.file.originalname,
        filePath: `documents/${req.userId}/${req.file.filename}`,
        uploadedAt: new Date(),
        status: user.isVerified ? 'verified' : 'pending',
        verificationMessage: 'Profile photo uploaded',
      });
    }

    await user.save();
    res.json({
      success: true,
      message: 'Profile photo uploaded successfully.',
      photoUrl,
      user,
    });
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error uploading photo.' });
  }
});

router.delete('/photo', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.photoUrl = '';
    await user.save();
    res.json({ success: true, message: 'Profile photo removed.', user });
  } catch (err) {
    console.error('Remove photo error:', err);
    res.status(500).json({ success: false, message: 'Server error removing photo.' });
  }
});

/* ─────────────────────────────────────────────
   UPDATE COMPREHENSIVE PROFILE DETAILS
───────────────────────────────────────────── */
router.put('/details', protect, async (req, res) => {
  try {
    const {
      name,
      firstName,
      lastName,
      location,
      bio,
      languages,
      skills,
      workCategories,
      experience,
      preferredJobType,
      availability,
      preferredHours,
      maxDistance,
    } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (name !== undefined) user.name = name.trim();
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (location !== undefined) user.location = location.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (Array.isArray(languages)) user.languages = languages;
    if (Array.isArray(skills)) user.skills = skills;
    if (Array.isArray(workCategories)) user.workCategories = workCategories;
    if (experience !== undefined) user.experience = experience;
    if (preferredJobType !== undefined) user.preferredJobType = preferredJobType;
    if (availability !== undefined) user.availability = availability;
    if (preferredHours !== undefined) user.preferredHours = preferredHours;
    if (maxDistance !== undefined) user.maxDistance = Number(maxDistance) || user.maxDistance || 15;

    // Check profile completeness dynamically
    const hasBio = Boolean(user.bio && user.bio.trim());
    const hasSkills = Boolean(user.skills && user.skills.length > 0);
    const hasLocation = Boolean(user.location && user.location.trim());
    const hasPhoto = Boolean(user.photoUrl || (user.documents && user.documents.some(d => d.docType === 'photo')));
    const hasDocs = Boolean(user.documents && user.documents.length > 0);
    user.profileComplete = Boolean(hasBio && hasSkills && hasLocation && (hasDocs || user.isVerified));

    await user.save();
    res.json({
      success: true,
      message: 'Profile details updated successfully.',
      user,
    });
  } catch (err) {
    console.error('Update profile details error:', err);
    res.status(500).json({ success: false, message: 'Server error updating profile details.' });
  }
});

/* ─────────────────────────────────────────────
   NOTIFICATION PREFERENCES
───────────────────────────────────────────── */
router.get('/notifications', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({
      success: true,
      notificationPreferences: user.notificationPreferences || {
        newJobs: true,
        applicationUpdates: true,
        jobStatus: true,
        messages: true,
        payments: true,
        trustScore: true,
        reviews: true,
        system: true,
      },
    });
  } catch (err) {
    console.error('Get notification preferences error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving notification preferences.' });
  }
});

router.put('/notifications', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.notificationPreferences = {
      ...(user.notificationPreferences || {}),
      ...req.body,
    };

    await user.save();
    res.json({
      success: true,
      message: 'Notification preferences updated successfully.',
      notificationPreferences: user.notificationPreferences,
    });
  } catch (err) {
    console.error('Update notification preferences error:', err);
    res.status(500).json({ success: false, message: 'Server error updating notification preferences.' });
  }
});

/* ─────────────────────────────────────────────
   WORK PREFERENCES
───────────────────────────────────────────── */
router.put('/work-preferences', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { workCategories, location, maxDistance, availability, preferredHours, preferredJobType } = req.body;
    if (Array.isArray(workCategories)) user.workCategories = workCategories;
    if (location !== undefined) user.location = location;
    if (maxDistance !== undefined) user.maxDistance = Number(maxDistance) || 15;
    if (availability !== undefined) user.availability = availability;
    if (preferredHours !== undefined) user.preferredHours = preferredHours;
    if (preferredJobType !== undefined) user.preferredJobType = preferredJobType;

    await user.save();
    res.json({
      success: true,
      message: 'Work preferences updated successfully.',
      user,
    });
  } catch (err) {
    console.error('Update work preferences error:', err);
    res.status(500).json({ success: false, message: 'Server error updating work preferences.' });
  }
});

/* ─────────────────────────────────────────────
   GET WORKER REAL ACTIVITY STATS & ANALYTICS
───────────────────────────────────────────── */
router.get('/stats', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // 1. Fetch all jobs where this worker applied or was hired
    const jobs = await Job.find({
      $or: [
        { 'applications.applicant': req.userId },
        { hiredWorker: req.userId },
      ],
    }).populate('employer', 'name firstName lastName');

    // Calculate application status breakdown
    let totalApplications = 0;
    let appliedCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let completedCount = 0;
    const monthlyJobMap = {}; // 'YYYY-MM': { month: 'Aug 2026', applied: 0, accepted: 0, completed: 0 }

    jobs.forEach((job) => {
      const app = (job.applications || []).find(
        (a) => String(a.applicant) === String(req.userId)
      );

      const isHired = String(job.hiredWorker) === String(req.userId);
      const isCompleted = (job.completionStatus === 'completed' && job.remainingPaymentPaid) || job.workerSettled;

      if (app) {
        totalApplications += 1;
        const appDate = app.appliedAt || job.createdAt || new Date();
        const monthKey = new Date(appDate).toISOString().slice(0, 7);
        const monthLabel = new Date(appDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        if (!monthlyJobMap[monthKey]) {
          monthlyJobMap[monthKey] = { key: monthKey, month: monthLabel, applied: 0, accepted: 0, completed: 0, earnings: 0 };
        }
        monthlyJobMap[monthKey].applied += 1;

        if (isCompleted) {
          completedCount += 1;
          monthlyJobMap[monthKey].completed += 1;
        } else if (app.status === 'accepted' || app.status === 'hired' || isHired) {
          acceptedCount += 1;
          monthlyJobMap[monthKey].accepted += 1;
        } else if (app.status === 'rejected') {
          rejectedCount += 1;
        } else {
          appliedCount += 1;
        }
      } else if (isHired) {
        if (isCompleted) {
          completedCount += 1;
        } else {
          acceptedCount += 1;
        }
      }
    });

    // 2. Fetch settled transactions for earnings
    const transactions = await Transaction.find({
      workerId: req.userId,
      $or: [
        { settlementStatus: 'settled' },
        { paymentStatus: 'completed' },
      ],
    }).sort({ settledAt: 1, createdAt: 1 });

    let totalEarnings = 0;
    const monthlyEarningsMap = {};

    transactions.forEach((txn) => {
      const earning = Number(txn.workerNetEarning) || 0;
      totalEarnings += earning;

      const dateObj = new Date(txn.settledAt || txn.remainingPaidAt || txn.createdAt);
      const monthKey = dateObj.toISOString().slice(0, 7);
      const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthlyEarningsMap[monthKey]) {
        monthlyEarningsMap[monthKey] = { key: monthKey, month: monthLabel, earnings: 0 };
      }
      monthlyEarningsMap[monthKey].earnings += earning;

      if (monthlyJobMap[monthKey]) {
        monthlyJobMap[monthKey].earnings += earning;
      }
    });

    // 3. Fetch reviews
    const reviews = await Review.find({ workerId: req.userId }).sort({ createdAt: -1 });
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
      ? +(reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews).toFixed(1)
      : 0;

    // 4. Fetch trust history
    const trustHistory = await TrustHistory.find({ workerId: req.userId }).sort({ createdAt: -1 });

    // 5. Success rate calculation
    const totalAcceptedOrDone = acceptedCount + completedCount;
    const successRate = totalAcceptedOrDone > 0
      ? Math.round((completedCount / totalAcceptedOrDone) * 100)
      : (completedCount > 0 ? 100 : null);

    // 6. Sort monthly data chronologically
    const activityTimelineData = Object.values(monthlyJobMap).sort((a, b) => a.key.localeCompare(b.key));
    const earningsTimelineData = Object.values(monthlyEarningsMap).sort((a, b) => a.key.localeCompare(b.key));

    // 7. Recent Activity Timeline list (Chronological unified events)
    const recentActivities = [];

    if (user.isVerified) {
      recentActivities.push({
        id: 'verif',
        type: 'verification',
        icon: '🛡️',
        title: 'Identity Verified',
        desc: 'Successfully verified identity and documents.',
        date: user.verifiedAt || user.createdAt,
      });
    }

    trustHistory.slice(0, 5).forEach((th) => {
      recentActivities.push({
        id: th._id.toString(),
        type: th.type,
        icon: th.change >= 0 ? '📈' : '⚠️',
        title: th.reason || 'Trust Score Updated',
        desc: `Score: ${th.previousScore} → ${th.newScore} (${th.change >= 0 ? `+${th.change}` : th.change} pts)`,
        date: th.createdAt,
      });
    });

    reviews.slice(0, 5).forEach((rev) => {
      recentActivities.push({
        id: rev._id.toString(),
        type: 'review',
        icon: '⭐',
        title: `${rev.rating}★ Employer Review`,
        desc: rev.review ? `"${rev.review.slice(0, 60)}..."` : `Received ${rev.rating} stars for ${rev.jobTitle}`,
        date: rev.createdAt,
      });
    });

    transactions.slice(0, 5).forEach((t) => {
      recentActivities.push({
        id: t._id.toString(),
        type: 'payment',
        icon: '💰',
        title: `Payment Settled (₹${t.workerNetEarning})`,
        desc: `Net earnings received for ${t.jobTitle || 'completed job'}.`,
        date: t.settledAt || t.remainingPaidAt || t.createdAt,
      });
    });

    recentActivities.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Profile completion percentage calculation
    let completionPoints = 0;
    const missingFields = [];
    if (user.photoUrl || (user.documents && user.documents.some(d => d.docType === 'photo'))) completionPoints += 20;
    else missingFields.push('Profile Photo');

    if (user.name && user.name.trim().length > 2) completionPoints += 20;
    else missingFields.push('Full Name');

    if (user.bio && user.bio.trim().length >= 10) completionPoints += 20;
    else missingFields.push('About / Bio');

    if (user.skills && user.skills.length > 0) completionPoints += 20;
    else missingFields.push('Skills');

    if (user.isVerified) completionPoints += 20;
    else missingFields.push('Identity Verification');

    res.json({
      success: true,
      stats: {
        completedJobs: completedCount,
        totalApplications,
        acceptedJobs: acceptedCount + completedCount,
        totalEarnings: +totalEarnings.toFixed(2),
        avgRating,
        totalReviews,
        trustScore: user.trustScore || (user.isVerified ? 20 : 0),
        successRate,
        completionPercentage: completionPoints,
        missingFields,
      },
      statusDistribution: {
        applied: appliedCount,
        accepted: acceptedCount,
        completed: completedCount,
        rejected: rejectedCount,
      },
      activityTimelineData,
      earningsTimelineData,
      recentActivities: recentActivities.slice(0, 8),
    });
  } catch (err) {
    console.error('Get worker stats error:', err);
    res.status(500).json({ success: false, message: 'Server error retrieving worker stats.' });
  }
});

export default router;