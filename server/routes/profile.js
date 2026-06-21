import express from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

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
    cb(new Error('Only PDF, JPG, and PNG files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.put(
  '/bio',
  protect,
  [
    body('bio')
      .trim()
      .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
    body('location')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Location cannot exceed 100 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const updateFields = { bio: req.body.bio };
      if (req.body.location !== undefined) {
        updateFields.location = req.body.location;
      }

      const user = await User.findByIdAndUpdate(
        req.userId,
        updateFields,
        { new: true }
      );
      res.json({ success: true, user });
    } catch (err) {
      console.error('Update bio error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.put(
  '/skills',
  protect,
  [
    body('skills')
      .isArray({ max: 10 }).withMessage('Maximum 10 skills allowed'),
    body('skills.*.name')
      .trim()
      .notEmpty().withMessage('Skill name is required')
      .isLength({ max: 30 }).withMessage('Skill name too long'),
    body('skills.*.level')
      .isInt({ min: 0, max: 100 }).withMessage('Level must be 0–100'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const user = await User.findByIdAndUpdate(
        req.userId,
        { skills: req.body.skills },
        { new: true }
      );
      res.json({ success: true, user });
    } catch (err) {
      console.error('Update skills error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);


router.post(
  '/complete',
  protect,
  upload.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'license', maxCount: 1 },
    { name: 'registration', maxCount: 1 },
    { name: 'taxId', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const isEmployer = req.user && req.user.role === 'employer';

      const aadhaar = req.files?.aadhaar?.[0];
      const pan = req.files?.pan?.[0];
      const photo = req.files?.photo?.[0];
      const license = req.files?.license?.[0];
      const registration = req.files?.registration?.[0];
      const taxId = req.files?.taxId?.[0];

      if (isEmployer) {
        if (!license || !registration || !taxId || !photo) {
          return res.status(400).json({
            success: false,
            message: 'All documents (License, Registration, Tax ID, Photo) are required for employers',
          });
        }
      } else {
        if (!aadhaar || !pan || !photo) {
          return res.status(400).json({
            success: false,
            message: 'All documents (Aadhaar, PAN, Photo) are required',
          });
        }
      }


      const documents = [];
      const keys = ['aadhaar', 'pan', 'photo', 'license', 'registration', 'taxId'];

      keys.forEach(key => {
        const file = req.files?.[key]?.[0];
        if (file) {
          documents.push({
            docType: key,
            fileName: file.originalname,
            filePath: `documents/${req.userId}/${file.filename}`,
            status: 'pending',
          });
        }
      });

      const user = await User.findByIdAndUpdate(
        req.userId,
        {
          documents,
          documentsUploaded: true,
          profileComplete: true,
        },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Profile completed successfully!',
        user,
      });
    } catch (err) {
      console.error('Profile complete error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
