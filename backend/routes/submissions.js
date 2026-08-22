const express = require('express');
const router = express.Router();
const { authenticate, requireStudent, requireAdmin } = require('../middleware/auth');
const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const { gradeSubmission } = require('../utils/gradingEngine');

/**
 * Helper: shuffle an array (Fisher-Yates)
 */
const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── STUDENT ROUTES ─────────────────────────────────────────────────────────

/**
 * @route   POST /api/submissions/start/:examId
 * @desc    Start an exam - creates a submission record
 * @access  Student
 */
router.post('/start/:examId', authenticate, requireStudent, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const now = new Date();
    // Validate exam window
    if (now < new Date(exam.startTime)) {
      return res.status(400).json({ message: 'Exam has not started yet.' });
    }
    if (now > new Date(exam.endTime)) {
      return res.status(400).json({ message: 'Exam has already ended.' });
    }

    // Validate eligibility
    const { branch, year } = req.user;
    if (!exam.eligibleBranches.includes(branch) || !exam.eligibleYears.includes(year)) {
      return res.status(403).json({ message: 'You are not eligible for this exam.' });
    }

    // Check for existing submission
    let submission = await Submission.findOne({
      studentId: req.user._id,
      examId: exam._id,
    });

    if (submission) {
      if (submission.status === 'submitted' || submission.status === 'auto-submitted') {
        return res.status(400).json({
          message: 'You have already submitted this exam.',
          alreadySubmitted: true,
          examId: exam._id,
          submission: {
            _id: submission._id,
            status: submission.status,
            totalScore: submission.totalScore,
            maxPossibleScore: submission.maxPossibleScore,
            submittedAt: submission.submittedAt,
          },
        });
      }
      // Return existing started submission (resume)
      return res.status(200).json({ message: 'Resuming exam.', submission, exam: sanitizeExamForStudent(exam) });
    }

    // Determine questions list: flattened across sections if multi-section, else flat questions
    const allQuestions =
      exam.isMultiSection && exam.sections?.length > 0
        ? exam.sections.flatMap((s) => s.questions || [])
        : exam.questions || [];

    // Determine question order (possibly shuffled within sections or flat)
    let questionOrder = allQuestions.map((q) => q._id);
    if (exam.shuffleQuestions) {
      questionOrder = shuffleArray(questionOrder);
    }

    // Create empty answer slots for each question
    const answers = allQuestions.map((q) => ({
      questionId: q._id,
      questionType: q.type,
      selectedOptions: [],
      textResponse: '',
      isCorrect: null,
      score: 0,
      isFlaggedForManualReview: false,
    }));

    submission = await Submission.create({
      studentId: req.user._id,
      examId: exam._id,
      answers,
      questionOrder,
      maxPossibleScore: allQuestions.length * exam.marksPerQuestion,
      currentSection: 0,
      sectionStartedAt: new Date(),
      sectionTimeRemaining: [],
    });

    res.status(201).json({
      message: 'Exam started successfully.',
      submission,
      exam: sanitizeExamForStudent(exam),
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ message: 'Server error starting exam.', error: error.message });
  }
});

/**
 * @route   PUT /api/submissions/:submissionId/answers
 * @desc    Auto-save answers (called periodically or on change)
 * @access  Student
 */
router.put('/:submissionId/answers', authenticate, requireStudent, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });
    if (submission.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (submission.status === 'submitted' || submission.status === 'auto-submitted') {
      return res.status(400).json({ message: 'Exam already submitted.' });
    }
    if (submission.isLocked) {
      return res.status(423).json({ message: 'Exam is locked due to violations.' });
    }

    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid answers format.' });
    }

    // Merge incoming answers with existing
    answers.forEach((incoming) => {
      const existingAnswer = submission.answers.find(
        (a) => a.questionId.toString() === incoming.questionId
      );
      if (existingAnswer) {
        if (incoming.selectedOptions !== undefined) {
          existingAnswer.selectedOptions = incoming.selectedOptions;
        }
        if (incoming.textResponse !== undefined) {
          existingAnswer.textResponse = incoming.textResponse;
        }
      }
    });

    await submission.save();
    res.status(200).json({ message: 'Answers saved.' });
  } catch (error) {
    console.error('Auto-save error:', error);
    res.status(500).json({ message: 'Server error saving answers.' });
  }
});

/**
 * @route   POST /api/submissions/:submissionId/violations
 * @desc    Log a violation and potentially lock the exam
 * @access  Student
 */
router.post('/:submissionId/violations', authenticate, requireStudent, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId).populate('examId');
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });
    if (submission.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (submission.status === 'submitted' || submission.status === 'auto-submitted') {
      return res.status(400).json({ message: 'Exam already submitted.' });
    }

    const { type, description, evidenceSnapshot } = req.body;

    const violation = {
      type,
      description: description || '',
      timestamp: new Date(),
      evidenceSnapshot: evidenceSnapshot || null,
    };

    submission.violations.push(violation);
    submission.violationCount = submission.violations.length;

    const threshold = submission.examId?.violationThreshold || 3;
    let locked = false;

    // Trigger lock:
    // If the exam was previously unlocked, any new violation beyond unlockedAtViolationCount locks it again (giving 1 chance per unlock)
    // If never unlocked, locks when total violationCount reaches the threshold
    const shouldLock =
      !submission.isLocked &&
      (submission.unlockedAtViolationCount > 0
        ? submission.violations.length > submission.unlockedAtViolationCount
        : submission.violationCount >= threshold);

    if (shouldLock) {
      submission.isLocked = true;
      submission.status = 'locked';
      locked = true;
    }

    await submission.save();

    res.status(200).json({
      message: locked ? 'Exam locked due to violations.' : 'Violation logged.',
      violationCount: submission.violationCount,
      isLocked: submission.isLocked,
      violations: submission.violations,
    });
  } catch (error) {
    console.error('Violation log error:', error);
    res.status(500).json({ message: 'Server error logging violation.' });
  }
});

/**
 * @route   POST /api/submissions/:submissionId/unlock
 * @desc    Unlock a locked exam with admin-provided unlock code
 * @access  Student
 */
router.post('/:submissionId/unlock', authenticate, requireStudent, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId).populate('examId');
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });
    if (submission.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (!submission.isLocked) {
      return res.status(400).json({ message: 'Exam is not locked.' });
    }

    const { unlockCode } = req.body;
    const exam = submission.examId;

    if (!exam.unlockCode || exam.unlockCode.trim() === '') {
      return res.status(400).json({ message: 'No unlock code has been set for this exam by admin.' });
    }

    if (!unlockCode || (unlockCode.trim() !== exam.unlockCode.trim() && unlockCode.trim().toLowerCase() !== exam.unlockCode.trim().toLowerCase())) {
      return res.status(400).json({ message: 'Incorrect unlock code. Please verify with your invigilator.' });
    }

    // Unlock: keep full accurate violationCount and record unlockedAtViolationCount
    submission.isLocked = false;
    submission.status = 'started';
    submission.violationCount = submission.violations.length;
    submission.unlockedAtViolationCount = submission.violations.length;
    submission.unlockCount = (submission.unlockCount || 0) + 1;

    await submission.save();

    res.status(200).json({
      message: 'Exam unlocked successfully. One more violation will lock the exam again.',
      violationCount: submission.violationCount,
      isLocked: false,
      violations: submission.violations,
    });
  } catch (error) {
    console.error('Unlock error:', error);
    res.status(500).json({ message: 'Server error unlocking exam.' });
  }
});

/**
 * @route   PATCH /api/submissions/:submissionId/next-section
 * @desc    Advance to the next section in a multi-section exam
 * @access  Student
 */
router.patch('/:submissionId/next-section', authenticate, requireStudent, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });
    if (submission.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (submission.status === 'submitted' || submission.status === 'auto-submitted') {
      return res.status(400).json({ message: 'Exam already submitted.' });
    }
    if (submission.isLocked) {
      return res.status(423).json({ message: 'Exam is locked due to violations.' });
    }

    const exam = await Exam.findById(submission.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });
    if (!exam.isMultiSection || !exam.sections || exam.sections.length === 0) {
      return res.status(400).json({ message: 'This exam is not a multi-section exam.' });
    }

    if (submission.currentSection >= exam.sections.length - 1) {
      return res.status(400).json({ message: 'Already on the final section.' });
    }

    // Save remaining seconds for the section just completed if sent from client
    const { timeRemaining } = req.body;
    submission.sectionTimeRemaining.push(
      timeRemaining !== undefined ? Number(timeRemaining) : 0
    );

    // Advance section
    submission.currentSection += 1;
    submission.sectionStartedAt = new Date();

    await submission.save();

    res.status(200).json({
      message: 'Advanced to next section.',
      currentSection: submission.currentSection,
      sectionStartedAt: submission.sectionStartedAt,
      submission,
    });
  } catch (error) {
    console.error('Next section error:', error);
    res.status(500).json({ message: 'Server error advancing section.' });
  }
});

/**
 * @route   POST /api/submissions/:submissionId/submit
 * @desc    Submit the exam (manual or auto-submit on timeout)
 * @access  Student
 */
router.post('/:submissionId/submit', authenticate, requireStudent, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });
    if (submission.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (submission.status === 'submitted' || submission.status === 'auto-submitted') {
      return res.status(400).json({ message: 'Exam already submitted.' });
    }

    const exam = await Exam.findById(submission.examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const isAutoSubmit = req.body.autoSubmit === true;

    // Run grading
    const { gradedAnswers, totalScore, maxPossibleScore } = gradeSubmission(submission, exam);

    submission.answers = gradedAnswers;
    submission.totalScore = totalScore;
    submission.maxPossibleScore = maxPossibleScore;
    submission.isGraded = true;
    submission.status = isAutoSubmit ? 'auto-submitted' : 'submitted';
    submission.submittedAt = new Date();
    submission.isLocked = false;

    await submission.save();

    res.status(200).json({
      message: isAutoSubmit ? 'Exam auto-submitted.' : 'Exam submitted successfully.',
      totalScore,
      maxPossibleScore,
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({ message: 'Server error submitting exam.', error: error.message });
  }
});

/**
 * @route   GET /api/submissions/my/:examId
 * @desc    Get student's own submission for an exam
 * @access  Student
 */
router.get('/my/:examId', authenticate, requireStudent, async (req, res) => {
  try {
    const submission = await Submission.findOne({
      studentId: req.user._id,
      examId: req.params.examId,
    });

    // Return 200 with null if no submission exists yet (clean REST response, avoids browser 404 console error)
    if (!submission) {
      return res.status(200).json({ submission: null, message: 'No submission found.' });
    }

    res.status(200).json({ submission });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ message: 'Server error fetching submission.' });
  }
});


/**
 * @route   GET /api/submissions/result/:examId
 * @desc    Get student result for an exam (only after publish)
 * @access  Student
 */
router.get('/result/:examId', authenticate, requireStudent, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.examId)) {
      return res.status(400).json({ message: 'Invalid exam ID.' });
    }
    const exam = await Exam.findById(req.params.examId).select(
      'title publishResults marksPerQuestion negativeMarking negativeMarkValue isMultiSection sections questions'
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const submission = await Submission.findOne({
      studentId: req.user._id,
      examId: req.params.examId,
    });

    if (!submission) {
      return res.status(200).json({
        published: false,
        notAttempted: true,
        examTitle: exam.title,
        message: 'No submission found for this exam.',
      });
    }

    if (!exam.publishResults) {
      return res.status(200).json({
        published: false,
        notAttempted: false,
        examTitle: exam.title,
        message: 'Results have not been published yet.',
        submission: {
          _id: submission._id,
          status: submission.status,
          submittedAt: submission.submittedAt,
          violationCount: submission.violationCount,
        },
      });
    }

    // Get all questions (flat or flattened from sections)
    const allQuestions =
      exam.isMultiSection && exam.sections?.length > 0
        ? exam.sections.flatMap((s) => s.questions || [])
        : exam.questions || [];

    // Build per-question breakdown (student sees their answer + correct status)
    // Do NOT expose correctOptions or other students' data
    const breakdown = submission.answers.map((answer) => {
      const question = allQuestions.find(
        (q) => q._id.toString() === answer.questionId.toString()
      );
      return {
        questionId: answer.questionId,
        questionText: question?.questionText || '',
        questionType: answer.questionType,
        imageUrl: question?.imageUrl || null,
        options: question?.options || [],
        selectedOptions: answer.selectedOptions,
        textResponse: answer.textResponse,
        isCorrect: answer.isCorrect,
        score: answer.score,
        isFlaggedForManualReview: answer.isFlaggedForManualReview,
      };
    });

    res.status(200).json({
      published: true,
      examTitle: exam.title,
      totalScore: submission.totalScore,
      maxPossibleScore: submission.maxPossibleScore,
      status: submission.status,
      submittedAt: submission.submittedAt,
      breakdown,
    });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ message: 'Server error fetching result.' });
  }
});


/**
 * @route   PATCH /api/submissions/:submissionId/heartbeat
 * @desc    Student pings to signal they are still active on the exam page
 * @access  Student
 */
router.patch('/:submissionId/heartbeat', authenticate, requireStudent, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });
    if (submission.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Only update heartbeat for active (non-submitted) sessions
    if (submission.status === 'started' || submission.status === 'locked') {
      submission.lastHeartbeatAt = new Date();
      await submission.save();
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────

/**
 * @route   GET /api/submissions/admin/exam/:examId
 * @desc    Get all submissions for an exam (admin view)
 * @access  Admin
 */
router.get('/admin/exam/:examId', authenticate, requireAdmin, async (req, res) => {
  try {
    const submissions = await Submission.find({ examId: req.params.examId })
      .populate('studentId', 'name email rollNumber branch year')
      .sort({ totalScore: -1 });

    res.status(200).json({ submissions });
  } catch (error) {
    console.error('Get exam submissions error:', error);
    res.status(500).json({ message: 'Server error fetching submissions.' });
  }
});

/**
 * @route   GET /api/submissions/admin/live
 * @desc    Get all currently active (started/locked) submissions across all exams
 * @access  Admin
 */
router.get('/admin/live', authenticate, requireAdmin, async (req, res) => {
  try {
    // A student is considered "live" only if they sent a heartbeat within the last 15 seconds.
    const HEARTBEAT_WINDOW_MS = 15 * 1000;
    const cutoff = new Date(Date.now() - HEARTBEAT_WINDOW_MS);

    const liveSubmissions = await Submission.find({
      status: { $in: ['started', 'locked'] },
      lastHeartbeatAt: { $gte: cutoff },
    })
      .populate('studentId', 'name email rollNumber branch year domains')
      .populate('examId', 'title subject examCode violationThreshold duration isMultiSection sections')
      .sort({ lastHeartbeatAt: -1 });

    res.status(200).json({ liveSubmissions });
  } catch (error) {
    console.error('Get live submissions error:', error);
    res.status(500).json({ message: 'Server error fetching live submissions.' });
  }
});

/**
 * @route   POST /api/submissions/admin/unlock/:submissionId
 * @desc    Directly unlock a locked student session from Live Monitor
 * @access  Admin
 */
router.post('/admin/unlock/:submissionId', authenticate, requireAdmin, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId).populate('examId');
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });

    submission.isLocked = false;
    submission.status = 'started';
    submission.violationCount = submission.violations.length;
    submission.unlockedAtViolationCount = submission.violations.length;
    submission.unlockCount = (submission.unlockCount || 0) + 1;

    await submission.save();

    res.status(200).json({
      message: 'Student session unlocked successfully.',
      submission,
    });
  } catch (error) {
    console.error('Admin unlock error:', error);
    res.status(500).json({ message: 'Server error unlocking student.' });
  }
});

/**
 * @route   GET /api/submissions/admin/review-queue
 * @desc    Get all submissions with flagged FILL_BLANK answers awaiting manual review
 * @access  Admin
 */
router.get('/admin/review-queue', authenticate, requireAdmin, async (req, res) => {
  try {
    const submissions = await Submission.find({
      'answers.isFlaggedForManualReview': true,
      'answers.isManuallyReviewed': { $ne: true },
    })
      .populate('studentId', 'name email rollNumber')
      .populate('examId', 'title examCode marksPerQuestion');

    // Filter to only the flagged answers
    const reviewItems = [];
    submissions.forEach((sub) => {
      sub.answers.forEach((answer) => {
        if (answer.isFlaggedForManualReview && !answer.isManuallyReviewed) {
          reviewItems.push({
            submissionId: sub._id,
            studentId: sub.studentId,
            examId: sub.examId,
            questionId: answer.questionId,
            textResponse: answer.textResponse,
            answerId: answer._id,
          });
        }
      });
    });

    res.status(200).json({ reviewItems });
  } catch (error) {
    console.error('Review queue error:', error);
    res.status(500).json({ message: 'Server error fetching review queue.' });
  }
});

/**
 * @route   PUT /api/submissions/admin/review/:submissionId/:questionId
 * @desc    Resolve a flagged FILL_BLANK answer (admin sets manual score)
 * @access  Admin
 */
router.put('/admin/review/:submissionId/:questionId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { manualScore, manualReviewNote, isCorrect } = req.body;
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });

    const answer = submission.answers.find(
      (a) => a.questionId.toString() === req.params.questionId
    );
    if (!answer) return res.status(404).json({ message: 'Answer not found.' });

    answer.manualScore = manualScore;
    answer.manualReviewNote = manualReviewNote || '';
    answer.isCorrect = isCorrect || false;
    answer.score = manualScore;
    answer.isManuallyReviewed = true;

    // Recalculate total score
    const totalScore = Math.max(
      0,
      submission.answers.reduce((sum, a) => sum + (a.score || 0), 0)
    );
    submission.totalScore = totalScore;

    await submission.save();

    res.status(200).json({ message: 'Answer reviewed successfully.', totalScore });
  } catch (error) {
    console.error('Manual review error:', error);
    res.status(500).json({ message: 'Server error resolving review.' });
  }
});

// ─── HELPER ─────────────────────────────────────────────────────────────────

/**
 * Remove sensitive fields from exam object for student view
 */
const sanitizeExamForStudent = (exam) => {
  const examObj = exam.toObject ? exam.toObject() : { ...exam };
  const sanitizeQ = (q) => {
    const { correctOptions, acceptedTexts, numericValue, numericTolerance, ...safe } = q;
    return safe;
  };
  if (examObj.questions) {
    examObj.questions = examObj.questions.map(sanitizeQ);
  }
  if (examObj.sections) {
    examObj.sections = examObj.sections.map((s) => ({
      ...s,
      questions: (s.questions || []).map(sanitizeQ),
    }));
  }
  delete examObj.unlockCode;
  return examObj;
};

module.exports = router;
