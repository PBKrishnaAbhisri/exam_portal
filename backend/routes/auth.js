const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * @route   POST /api/auth/signup/student
 * @desc    Register a new student
 * @access  Public
 */
router.post(
  '/signup/student',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email')
      .isEmail().withMessage('Valid email is required')
      .matches(/^N\d{6}@rguktn\.ac\.in$/i)
      .withMessage('Student email must be in the format N######@rguktn.ac.in'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('rollNumber')
      .trim().notEmpty().withMessage('Roll number is required')
      .matches(/^N\d{6}/i).withMessage('Roll number must start with N followed by 6 digits (e.g. N210782)'),
    body('branch').notEmpty().withMessage('Branch is required'),
    body('year').isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),
    body('cgpa').isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
    body('domains').isArray({ min: 1 }).withMessage('Please select at least one domain of interest. Domain selection is mandatory.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, rollNumber, branch, year, cgpa, domains } = req.body;

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({
        message: 'Please select at least one domain of interest. Domain selection is mandatory.',
      });
    }

    try {
      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(409).json({ message: 'Email already registered.' });
      }

      // Check if roll number already exists
      const existingRoll = await User.findOne({ rollNumber: rollNumber.toUpperCase(), role: 'student' });
      if (existingRoll) {
        return res.status(409).json({ message: 'Roll number already registered.' });
      }

      // Validate domains against branch restriction
      const { getAllowedDomainsForBranch } = require('../config/domains');
      const allowedDomains = getAllowedDomainsForBranch(branch);
      const invalidDomains = (domains || []).filter(d => !allowedDomains.includes(d));
      if (invalidDomains.length > 0) {
        return res.status(400).json({
          message: `Invalid domain selection for your branch: ${invalidDomains.join(', ')}`,
        });
      }

      const user = await User.create({
        name,
        email,
        password,
        role: 'student',
        rollNumber: rollNumber.toUpperCase(),
        branch,
        year: Number(year),
        cgpa: Number(cgpa),
        domains: domains || [],
        status: 'active',
      });

      const token = generateToken(user);

      res.status(201).json({
        message: 'Student registered successfully.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          rollNumber: user.rollNumber,
          branch: user.branch,
          year: user.year,
          cgpa: user.cgpa,
          domains: user.domains || [],
          status: user.status || 'active',
        },
      });
    } catch (error) {
      console.error('Student signup error:', error);
      res.status(500).json({ message: 'Server error during registration.' });
    }
  }
);

/**
 * @route   POST /api/auth/signup/admin
 * @desc    Register a new admin
 * @access  Public
 */
router.post(
  '/signup/admin',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email')
      .isEmail().withMessage('Valid email is required')
      .matches(/@rguktn\.ac\.in$/i)
      .withMessage('Admin email must be a @rguktn.ac.in address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: 'Email already registered.' });
      }

      const user = await User.create({
        name,
        email,
        password,
        role: 'admin',
      });

      const token = generateToken(user);

      res.status(201).json({
        message: 'Admin registered successfully.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Admin signup error:', error);
      res.status(500).json({ message: 'Server error during registration.' });
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login for both students and admins
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail().withMessage('Valid email is required')
      .matches(/@rguktn\.ac\.in$/i)
      .withMessage('Only @rguktn.ac.in email addresses are allowed'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const token = generateToken(user);

      const userData = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      if (user.role === 'student') {
        userData.rollNumber = user.rollNumber;
        userData.branch = user.branch;
        userData.year = user.year;
        userData.cgpa = user.cgpa;
        userData.domains = user.domains || [];
        userData.status = user.status || 'active';
        userData.resumeUrl = user.resumeUrl || null;
        userData.resumeOriginalName = user.resumeOriginalName || null;
        userData.resumeUploadedAt = user.resumeUploadedAt || null;
      }

      res.status(200).json({
        message: 'Login successful.',
        token,
        user: userData,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login.' });
    }
  }
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user profile
 * @access  Private
 */
const { authenticate, requireStudent } = require('../middleware/auth');

router.get('/me', authenticate, async (req, res) => {
  res.status(200).json({ user: req.user });
});

/**
 * @route   PATCH /api/auth/profile
 * @desc    Student updates their own profile (name, cgpa, domains)
 * @access  Student
 */
const { getAllowedDomainsForBranch } = require('../config/domains');

router.patch('/profile', authenticate, requireStudent, async (req, res) => {
  try {
    const { name, cgpa, domains } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (name) user.name = name.trim();
    if (cgpa !== undefined) {
      const parsed = parseFloat(cgpa);
      if (isNaN(parsed) || parsed < 0 || parsed > 10) {
        return res.status(400).json({ message: 'CGPA must be between 0 and 10.' });
      }
      user.cgpa = parsed;
    }

    if (domains !== undefined) {
      if (!Array.isArray(domains) || domains.length === 0) {
        return res.status(400).json({
          message: 'Please select at least one domain. A student must have at least one domain selected.',
        });
      }
      // Validate domain selections against branch-specific allowed domains
      const allowedDomains = getAllowedDomainsForBranch(user.branch);
      const invalid = domains.filter(d => !allowedDomains.includes(d));
      if (invalid.length > 0) {
        return res.status(400).json({
          message: `These domains are not allowed for your branch (${user.branch}): ${invalid.join(', ')}`,
        });
      }
      user.domains = domains;
    }

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        branch: user.branch,
        year: user.year,
        cgpa: user.cgpa,
        domains: user.domains,
        status: user.status,
        resumeUrl: user.resumeUrl || null,
        resumeOriginalName: user.resumeOriginalName || null,
        resumeUploadedAt: user.resumeUploadedAt || null,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
});

/**
 * @route   POST /api/auth/student/reset-password
 * @desc    Reset student password via Email + Roll Number verification
 * @access  Public
 */
router.post(
  '/student/reset-password',
  [
    body('email')
      .isEmail().withMessage('Valid email is required')
      .matches(/@rguktn\.ac\.in$/i).withMessage('Student email must be a @rguktn.ac.in address'),
    body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, rollNumber, newPassword } = req.body;

    try {
      const student = await User.findOne({
        email: email.toLowerCase().trim(),
        rollNumber: rollNumber.toUpperCase().trim(),
        role: 'student',
      });

      if (!student) {
        return res.status(404).json({
          message: 'No student account matches the provided email and roll number.',
        });
      }

      student.password = newPassword;
      await student.save();

      res.status(200).json({
        message: 'Password reset successfully! You can now log in with your new password.',
      });
    } catch (error) {
      console.error('Student password reset error:', error);
      res.status(500).json({ message: 'Server error resetting password.' });
    }
  }
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for logged-in user
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findById(req.user._id).select('+password');
      if (!user) return res.status(404).json({ message: 'User not found.' });

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }

      user.password = newPassword;
      await user.save();

      res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Server error changing password.' });
    }
  }
);

// ─── OTP-BASED FORGOT PASSWORD ──────────────────────────────────────────────
const { sendPasswordResetOTP } = require('../utils/mailer');
const passwordResetOTPs = new Map(); // email -> { otp, expiresAt, name }

/**
 * @route   POST /api/auth/forgot-password/send-otp
 * @desc    Send 6-digit OTP to user's registered email for password reset
 * @access  Public
 */
router.post(
  '/forgot-password/send-otp',
  [
    body('email')
      .isEmail().withMessage('Valid email is required')
      .matches(/@rguktn\.ac\.in$/i).withMessage('Only @rguktn.ac.in email addresses are supported'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ message: 'No registered account found with this email address.' });
      }

      // Generate 6-digit numeric OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

      passwordResetOTPs.set(normalizedEmail, {
        otp,
        expiresAt,
        name: user.name,
      });

      // Send OTP via mailer asynchronously
      sendPasswordResetOTP(normalizedEmail, user.name, otp).catch((e) =>
        console.warn('[Mailer] OTP send error:', e.message)
      );

      res.status(200).json({
        message: 'A 6-digit verification code has been sent to your college email.',
        email: normalizedEmail,
        // In development/test if SMTP isn't set, provide helper hint
        devHint: !process.env.SMTP_USER || process.env.SMTP_USER.includes('your_gmail') ? otp : undefined,
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ message: 'Server error sending OTP.' });
    }
  }
);

/**
 * @route   POST /api/auth/forgot-password/reset
 * @desc    Verify OTP and reset password
 * @access  Public
 */
router.post(
  '/forgot-password/reset',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit OTP is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp, newPassword } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const record = passwordResetOTPs.get(normalizedEmail);
      if (!record) {
        return res.status(400).json({
          message: 'No OTP request found or it has expired. Please request a new OTP.',
        });
      }

      if (Date.now() > record.expiresAt) {
        passwordResetOTPs.delete(normalizedEmail);
        return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      }

      if (record.otp !== otp.trim()) {
        return res.status(400).json({ message: 'Invalid OTP. Please check the code sent to your email.' });
      }

      // Find user and update password
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ message: 'User account not found.' });
      }

      user.password = newPassword;
      await user.save();

      // Clear used OTP
      passwordResetOTPs.delete(normalizedEmail);

      res.status(200).json({
        message: 'Password reset successfully! You can now sign in with your new password.',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Server error resetting password.' });
    }
  }
);

// ─── RESUME UPLOAD ───────────────────────────────────────────────────────────
const cloudinaryV2 = require('cloudinary').v2;
const multer = require('multer');
// Note: authenticate and requireStudent already required at line ~238

cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — we upload manually via upload_stream for full control
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for resumes.'), false);
    }
  },
});

// Helper: upload buffer to Cloudinary as raw PDF
const uploadToCloudinary = (buffer, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinaryV2.uploader.upload_stream(
      {
        resource_type: 'raw',
        type: 'upload',
        folder: 'exam-portal/resumes',
        public_id: publicId,
        access_mode: 'public',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

/**
 * @route   POST /api/auth/upload-resume
 * @desc    Upload or replace student resume (PDF, max 2 MB)
 * @access  Student
 */
router.post(
  '/upload-resume',
  authenticate,
  requireStudent,
  (req, res, next) => {
    resumeUpload.single('resume')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'Resume must be smaller than 2 MB.' });
        }
        return res.status(400).json({ message: err.message || 'Resume upload failed.' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
      }

      const user = await User.findById(req.user._id);

      // Delete old resume from Cloudinary if exists
      if (user.resumePublicId) {
        try {
          await cloudinaryV2.uploader.destroy(user.resumePublicId, { resource_type: 'raw' });
        } catch (_) { /* ignore cleanup errors */ }
      }

      // Upload buffer to Cloudinary (include .pdf in publicId for raw file extension preservation)
      const publicId = `resume_${req.user._id}_${Date.now()}.pdf`;
      const result = await uploadToCloudinary(req.file.buffer, publicId);

      user.resumeUrl = result.secure_url;
      user.resumePublicId = result.public_id;
      user.resumeOriginalName = req.file.originalname;
      user.resumeUploadedAt = new Date();
      await user.save();

      res.json({
        message: 'Resume uploaded successfully.',
        resumeUrl: user.resumeUrl,
        resumeOriginalName: user.resumeOriginalName,
        resumeUploadedAt: user.resumeUploadedAt,
      });
    } catch (error) {
      console.error('Resume upload error:', error);
      res.status(500).json({ message: 'Server error uploading resume.' });
    }
  }
);

/**
 * @route   DELETE /api/auth/resume
 * @desc    Delete student's resume
 * @access  Student
 */
router.delete('/resume', authenticate, requireStudent, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.resumePublicId) {
      return res.status(404).json({ message: 'No resume found to delete.' });
    }

    try {
      await cloudinaryV2.uploader.destroy(user.resumePublicId, { resource_type: 'raw' });
    } catch (_) { /* ignore cleanup errors */ }

    user.resumeUrl = null;
    user.resumePublicId = null;
    user.resumeOriginalName = null;
    user.resumeUploadedAt = null;
    await user.save();

    res.json({ message: 'Resume deleted successfully.' });
  } catch (error) {
    console.error('Resume delete error:', error);
    res.status(500).json({ message: 'Server error deleting resume.' });
  }
});

module.exports = router;
