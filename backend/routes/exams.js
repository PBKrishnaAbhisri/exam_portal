const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, requireStudent } = require('../middleware/auth');
const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const { upload } = require('../config/cloudinary');

// ─── ADMIN ROUTES ───────────────────────────────────────────────────────────

/**
 * @route   POST /api/exams
 * @desc    Create a new exam (admin only)
 * @access  Admin
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      duration,
      startTime,
      endTime,
      marksPerQuestion,
      negativeMarking,
      negativeMarkValue,
      eligibleBranches,
      eligibleYears,
      shuffleQuestions,
      shuffleOptions,
      unlockCode,
      violationThreshold,
      questions,
    } = req.body;

    const exam = await Exam.create({
      title,
      description,
      subject,
      duration,
      startTime,
      endTime,
      marksPerQuestion,
      negativeMarking: negativeMarking || false,
      negativeMarkValue: negativeMarking ? (negativeMarkValue || 0) : 0,
      eligibleBranches: eligibleBranches || [],
      eligibleYears: eligibleYears || [],
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      unlockCode: unlockCode || '',
      violationThreshold: violationThreshold || 3,
      createdBy: req.user._id,
      questions: questions || [],
    });

    res.status(201).json({ message: 'Exam created successfully.', exam });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ message: 'Server error creating exam.', error: error.message });
  }
});

/**
 * @route   PUT /api/exams/:id
 * @desc    Edit exam info (admin only)
 * @access  Admin
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const allowedUpdates = [
      'title', 'description', 'subject', 'duration', 'startTime', 'endTime',
      'marksPerQuestion', 'negativeMarking', 'negativeMarkValue',
      'eligibleBranches', 'eligibleYears', 'shuffleQuestions', 'shuffleOptions',
      'unlockCode', 'violationThreshold', 'publishResults', 'questions',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        exam[field] = req.body[field];
      }
    });

    // Reset negativeMarkValue if negative marking is turned off
    if (exam.negativeMarking === false) {
      exam.negativeMarkValue = 0;
    }

    await exam.save();
    res.status(200).json({ message: 'Exam updated successfully.', exam });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ message: 'Server error updating exam.', error: error.message });
  }
});

/**
 * @route   POST /api/exams/:id/questions
 * @desc    Add a question to exam (with optional image upload)
 * @access  Admin
 */
router.post('/:id/questions', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const {
      type, questionText, options, correctOptions,
      acceptedTexts, numericValue, numericTolerance, fillBlankType,
      subject, topic, sourceExamId,
    } = req.body;

    const newQuestion = {
      type,
      questionText,
      options: options ? (Array.isArray(options) ? options : JSON.parse(options)) : [],
      correctOptions: correctOptions ? (Array.isArray(correctOptions) ? correctOptions.map(Number) : JSON.parse(correctOptions).map(Number)) : [],
      acceptedTexts: acceptedTexts ? (Array.isArray(acceptedTexts) ? acceptedTexts : JSON.parse(acceptedTexts)) : [],
      numericValue: numericValue !== undefined ? Number(numericValue) : null,
      numericTolerance: numericTolerance !== undefined ? Number(numericTolerance) : 0,
      fillBlankType: fillBlankType || null,
      subject: subject || '',
      topic: topic || '',
      sourceExamId: sourceExamId || null,
      imageUrl: req.file ? req.file.path : null,
      imagePublicId: req.file ? req.file.filename : null,
    };

    exam.questions.push(newQuestion);
    await exam.save();

    res.status(201).json({
      message: 'Question added successfully.',
      question: exam.questions[exam.questions.length - 1],
    });
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({ message: 'Server error adding question.', error: error.message });
  }
});

/**
 * @route   PUT /api/exams/:id/questions/:questionId
 * @desc    Edit a specific question (with optional new image)
 * @access  Admin
 */
router.put('/:id/questions/:questionId', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const question = exam.questions.id(req.params.questionId);
    if (!question) return res.status(404).json({ message: 'Question not found.' });

    const fields = [
      'type', 'questionText', 'fillBlankType', 'numericValue',
      'numericTolerance', 'subject', 'topic',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) question[field] = req.body[field];
    });

    if (req.body.options) {
      question.options = Array.isArray(req.body.options) ? req.body.options : JSON.parse(req.body.options);
    }
    if (req.body.correctOptions) {
      question.correctOptions = (Array.isArray(req.body.correctOptions) ? req.body.correctOptions : JSON.parse(req.body.correctOptions)).map(Number);
    }
    if (req.body.acceptedTexts) {
      question.acceptedTexts = Array.isArray(req.body.acceptedTexts) ? req.body.acceptedTexts : JSON.parse(req.body.acceptedTexts);
    }
    if (req.file) {
      question.imageUrl = req.file.path;
      question.imagePublicId = req.file.filename;
    }

    await exam.save();
    res.status(200).json({ message: 'Question updated successfully.', question });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Server error updating question.', error: error.message });
  }
});

/**
 * @route   DELETE /api/exams/:id/questions/:questionId
 * @desc    Delete a question from exam
 * @access  Admin
 */
router.delete('/:id/questions/:questionId', authenticate, requireAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    exam.questions = exam.questions.filter(
      (q) => q._id.toString() !== req.params.questionId
    );

    await exam.save();
    res.status(200).json({ message: 'Question deleted successfully.' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Server error deleting question.' });
  }
});

/**
 * @route   GET /api/exams/admin/all
 * @desc    Get all exams for admin (full details, all exams)
 * @access  Admin
 */
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ exams });
  } catch (error) {
    console.error('Get all exams error:', error);
    res.status(500).json({ message: 'Server error fetching exams.' });
  }
});

/**
 * @route   GET /api/exams/admin/:id
 * @desc    Get full exam details including correct answers (admin view)
 * @access  Admin
 */
router.get('/admin/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('createdBy', 'name email');
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    res.status(200).json({ exam });
  } catch (error) {
    console.error('Get exam admin error:', error);
    res.status(500).json({ message: 'Server error fetching exam.' });
  }
});

/**
 * @route   PATCH /api/exams/:id/publish
 * @desc    Toggle publish results for an exam
 * @access  Admin
 */
router.patch('/:id/publish', authenticate, requireAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    exam.publishResults = !exam.publishResults;
    await exam.save();

    res.status(200).json({
      message: `Results ${exam.publishResults ? 'published' : 'unpublished'} successfully.`,
      publishResults: exam.publishResults,
    });
  } catch (error) {
    console.error('Publish toggle error:', error);
    res.status(500).json({ message: 'Server error toggling publish.' });
  }
});

/**
 * @route   DELETE /api/exams/:id
 * @desc    Delete an exam (admin only)
 * @access  Admin
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    res.status(200).json({ message: 'Exam deleted successfully.' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ message: 'Server error deleting exam.' });
  }
});

// ─── STUDENT ROUTES ─────────────────────────────────────────────────────────

/**
 * @route   GET /api/exams/student/eligible
 * @desc    Get exams eligible for the logged-in student (branch+year filter)
 * @access  Student
 */
router.get('/student/eligible', authenticate, requireStudent, async (req, res) => {
  try {
    const { branch, year } = req.user;
    const now = new Date();

    const exams = await Exam.find({
      eligibleBranches: branch,
      eligibleYears: year,
    })
      .select('-questions.correctOptions -questions.acceptedTexts -questions.numericValue -questions.numericTolerance -unlockCode')
      .sort({ startTime: 1 });

    // Classify exams into upcoming, live, completed
    const upcoming = exams.filter((e) => new Date(e.startTime) > now);
    const live = exams.filter(
      (e) => new Date(e.startTime) <= now && new Date(e.endTime) >= now
    );
    const completed = exams.filter((e) => new Date(e.endTime) < now);

    res.status(200).json({ upcoming, live, completed });
  } catch (error) {
    console.error('Get eligible exams error:', error);
    res.status(500).json({ message: 'Server error fetching exams.' });
  }
});

/**
 * @route   GET /api/exams/student/:id
 * @desc    Get exam details for student (hides correct answers)
 * @access  Student
 */
router.get('/student/:id', authenticate, requireStudent, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).select(
      '-questions.correctOptions -questions.acceptedTexts -questions.numericValue -questions.numericTolerance -unlockCode'
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    // Verify eligibility
    const { branch, year } = req.user;
    if (
      !exam.eligibleBranches.includes(branch) ||
      !exam.eligibleYears.includes(year)
    ) {
      return res.status(403).json({ message: 'You are not eligible for this exam.' });
    }

    res.status(200).json({ exam });
  } catch (error) {
    console.error('Get exam student error:', error);
    res.status(500).json({ message: 'Server error fetching exam.' });
  }
});

/**
 * @route   GET /api/exams/bank/questions
 * @desc    Get all questions from all previous exams (for import during creation)
 * @access  Admin
 */
router.get('/bank/questions', authenticate, requireAdmin, async (req, res) => {
  try {
    const { examId } = req.query;

    if (examId) {
      const exam = await Exam.findById(examId).select('title subject questions');
      if (!exam) return res.status(404).json({ message: 'Exam not found.' });
      return res.status(200).json({ exam });
    }

    // Return exam list for the bank selector
    const exams = await Exam.find()
      .select('title subject examCode createdAt questions')
      .sort({ createdAt: -1 });

    res.status(200).json({ exams });
  } catch (error) {
    console.error('Question bank error:', error);
    res.status(500).json({ message: 'Server error fetching question bank.' });
  }
});

module.exports = router;
