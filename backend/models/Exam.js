const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['MCQ', 'MSQ', 'FILL_BLANK'],
      required: true,
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    imagePublicId: {
      type: String,
      default: null,
    },
    // Options for MCQ and MSQ
    options: {
      type: [String],
      default: [],
    },
    // Correct option indices (0-based): length=1 for MCQ, length>=1 for MSQ
    correctOptions: {
      type: [Number],
      default: [],
    },
    // FILL_BLANK - text accepted answers (case-insensitive comparison after normalization)
    acceptedTexts: {
      type: [String],
      default: [],
    },
    // FILL_BLANK - numeric answer
    numericValue: {
      type: Number,
      default: null,
    },
    numericTolerance: {
      type: Number,
      default: 0,
    },
    // FILL_BLANK sub-type selector
    fillBlankType: {
      type: String,
      enum: ['text', 'number', null],
      default: null,
    },
    // Tagging
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    topic: {
      type: String,
      trim: true,
      default: '',
    },
    // Track which exam this question was originally from (for exam bank)
    sourceExamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      default: null,
    },
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    duration: {
      type: Number, // in minutes
      required: [true, 'Duration is required'],
      min: 1,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    marksPerQuestion: {
      type: Number,
      required: true,
      min: 0,
    },
    negativeMarking: {
      type: Boolean,
      default: false,
    },
    negativeMarkValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    eligibleBranches: {
      type: [String],
      enum: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSD', 'OTHER'],
      default: [],
    },
    eligibleYears: {
      type: [Number],
      enum: [1, 2, 3, 4],
      default: [],
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    shuffleOptions: {
      type: Boolean,
      default: false,
    },
    examCode: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },
    // Unlock code for proctoring violations
    unlockCode: {
      type: String,
      default: '',
    },
    // Violation threshold before locking
    violationThreshold: {
      type: Number,
      default: 3,
    },
    // Admin who created this exam
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    questions: [questionSchema],
    // Result publish flag
    publishResults: {
      type: Boolean,
      default: false,
    },
    // Status tracking
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'live', 'completed'],
      default: 'scheduled',
    },
    // Subject for exam storage categorization
    subject: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate unique exam code before saving
examSchema.pre('save', async function (next) {
  if (!this.examCode) {
    const { nanoid } = await import('nanoid');
    this.examCode = 'EXAM-' + nanoid(6).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Exam', examSchema);
