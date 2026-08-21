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
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
    body('branch').notEmpty().withMessage('Branch is required'),
    body('year').isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),
    body('cgpa').isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, rollNumber, branch, year, cgpa } = req.body;

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

      const user = await User.create({
        name,
        email,
        password,
        role: 'student',
        rollNumber: rollNumber.toUpperCase(),
        branch,
        year: Number(year),
        cgpa: Number(cgpa),
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
    body('email').isEmail().withMessage('Valid email is required'),
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
    body('email').isEmail().withMessage('Valid email is required'),
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
const { authenticate } = require('../middleware/auth');

router.get('/me', authenticate, async (req, res) => {
  res.status(200).json({ user: req.user });
});

module.exports = router;
