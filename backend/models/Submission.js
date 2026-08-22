const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    questionType: {
      type: String,
      enum: ['MCQ', 'MSQ', 'FILL_BLANK'],
    },
    // For MCQ: array with 1 element; for MSQ: array with multiple elements (0-based indices)
    selectedOptions: {
      type: [Number],
      default: [],
    },
    // For FILL_BLANK
    textResponse: {
      type: String,
      default: '',
      trim: true,
    },
    // Grading outputs
    isCorrect: {
      type: Boolean,
      default: null, // null = not yet graded
    },
    score: {
      type: Number,
      default: 0,
    },
    isFlaggedForManualReview: {
      type: Boolean,
      default: false,
    },
    // Admin resolution for manual review
    manualScore: {
      type: Number,
      default: null,
    },
    manualReviewNote: {
      type: String,
      default: '',
    },
    isManuallyReviewed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const violationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'tab-switch',
        'fullscreen-exit',
        'copy-attempt',
        'paste-attempt',
        'right-click',
        'phone-detected',
        'multiple-persons',
        'no-face',
      ],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      default: '',
    },
    // Webcam snapshot (base64 data URL or Cloudinary URL)
    evidenceSnapshot: {
      type: String,
      default: null,
    },
  },
  { _id: true }
);

const submissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    answers: [answerSchema],
    violations: [violationSchema],
    violationCount: {
      type: Number,
      default: 0,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    unlockedAtViolationCount: {
      type: Number,
      default: 0,
    },
    unlockCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['started', 'submitted', 'locked', 'auto-submitted'],
      default: 'started',
    },
    // Score fields
    totalScore: {
      type: Number,
      default: 0,
    },
    maxPossibleScore: {
      type: Number,
      default: 0,
    },
    isGraded: {
      type: Boolean,
      default: false,
    },
    // Timing
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    // Optional: shuffled question order (stores question IDs in the shuffled order shown to student)
    questionOrder: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    // Section tracking for multi-section exams
    currentSection: {
      type: Number,
      default: 0,
    },
    sectionStartedAt: {
      type: Date,
      default: null,
    },
    sectionTimeRemaining: {
      type: [Number], // recorded remaining seconds when advancing/finishing sections
      default: [],
    },
    // Heartbeat for live disconnect detection — updated every ~20s by client
    lastHeartbeatAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One submission per student per exam
submissionSchema.index({ studentId: 1, examId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
