const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    // Student-specific fields
    rollNumber: {
      type: String,
      sparse: true, // allows null for admins but unique for students
      uppercase: true,
      trim: true,
    },
    branch: {
      type: String,
      enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSD', 'OTHER'],
      trim: true,
    },
    year: {
      type: Number,
      enum: [1, 2, 3, 4],
    },
    cgpa: {
      type: Number,
      min: 0,
      max: 10,
    },
    // Domain interests (set at signup, editable by student)
    domains: {
      type: [String],
      default: [],
    },
    // Account status — updated by May 1st cron for graduating batches
    status: {
      type: String,
      enum: ['active', 'alumni'],
      default: 'active',
    },
    // Resume upload — stored in Cloudinary
    resumeUrl: { type: String, default: null },
    resumePublicId: { type: String, default: null },
    resumeOriginalName: { type: String, default: null },
    resumeUploadedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Ensure rollNumber is unique among students
userSchema.index(
  { rollNumber: 1 },
  { unique: true, sparse: true, partialFilterExpression: { role: 'student' } }
);

module.exports = mongoose.model('User', userSchema);
