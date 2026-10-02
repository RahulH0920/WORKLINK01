import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { generateToken, protect } from '../middleware/auth.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('firstName')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
    body('lastName')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Enter a valid email address')
      .normalizeEmail(),
    body('phone')
      .trim()
      .notEmpty().withMessage('Phone number is required'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
      .matches(/\d/).withMessage('Password must contain a number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a special character'),
    body('role')
      .optional()
      .isIn(['seeker', 'employer']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    // validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
      });
    }

    try {
      const { firstName, lastName, email, phone, password, role } = req.body;

      // check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists',
          errors: [{ field: 'email', message: 'Email is already registered' }],
        });
      }

      // create user
      const user = await User.create({
        firstName,
        lastName,
        email,
        phone,
        password,
        role: role || 'seeker',
      });

      // generate token
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          trustScore: user.trustScore,
          isVerified: user.isVerified,
          bio: user.bio,
          skills: user.skills,
          location: user.location,
          profileComplete: user.profileComplete,
          documentsUploaded: user.documentsUploaded,
          createdAt: user.createdAt,
        },
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/* ═══════════════════════════════════════════
   POST /api/auth/login
   ═══════════════════════════════════════════ */
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Enter a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
      });
    }

    try {
      const { email, password } = req.body;

      // Special case: fixed admin login (credentials from .env)
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
        let adminUser = await User.findOne({ email });
        if (!adminUser) {
          adminUser = await User.create({
            firstName: 'System',
            lastName: 'Admin',
            email: adminEmail,
            phone: '9999999999',
            password: adminPassword,
            role: 'admin',
            isVerified: true,
            profileComplete: true,
            documentsUploaded: true,
            trustScore: 100,
          });
        }
      }

      // find user with password
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // compare password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // generate token
      const token = generateToken(user._id);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          trustScore: user.trustScore,
          isVerified: user.isVerified,
          bio: user.bio,
          skills: user.skills,
          location: user.location,
          profileComplete: user.profileComplete,
          documentsUploaded: user.documentsUploaded,
          createdAt: user.createdAt,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
