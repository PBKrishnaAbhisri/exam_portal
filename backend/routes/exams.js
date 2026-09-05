const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin, requireStudent } = require('../middleware/auth');
const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const { upload } = require('../config/cloudinary');

const {
  getDomainCategoriesForBranch,
  getDomainCategoriesForBranches,
  getAllowedDomainsForBranches,
  DOMAIN_CATEGORIES,
} = require('../config/domains');

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────────────

/**
 * @route   GET /api/exams/domains
 * @desc    Get domain list (optionally filtered by single branch or comma-separated branches)
 * @access  Public
 */
router.get('/domains', async (req, res) => {
  const { branch, branches } = req.query;
  let categories = DOMAIN_CATEGORIES;
  if (branches) {
    const branchList = typeof branches === 'string' ? branches.split(',').map(b => b.trim()).filter(Boolean) : branches;
    categories = getDomainCategoriesForBranches(branchList);
  } else if (branch) {
    categories = getDomainCategoriesForBranch(branch);
  }
  res.status(200).json({ categories });
});

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
      eligibleDomains,
      shuffleQuestions,
      shuffleOptions,
      unlockCode,
      violationThreshold,
      isMultiSection,
      sections,
      questions,
      examType,
    } = req.body;

    if (!eligibleDomains || !Array.isArray(eligibleDomains) || eligibleDomains.length === 0) {
      return res.status(400).json({
        message: 'Domain selection is mandatory. Please select at least one eligible domain.',
      });
    }

    if (eligibleBranches && Array.isArray(eligibleBranches) && eligibleBranches.length > 0) {
      const allowed = getAllowedDomainsForBranches(eligibleBranches);
      const invalid = eligibleDomains.filter((d) => !allowed.includes(d));
      if (invalid.length > 0) {
        return res.status(400).json({
          message: `The following domains are not allowed for selected branches (${eligibleBranches.join(', ')}): ${invalid.join(', ')}`,
        });
      }
    }

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
      eligibleDomains: eligibleDomains || [],
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      unlockCode: unlockCode || '',
      violationThreshold: violationThreshold || 3,
      createdBy: req.user._id,
      isMultiSection: isMultiSection || false,
      sections: sections || [],
      questions: questions || [],
      examType: examType || null,
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
      'eligibleBranches', 'eligibleYears', 'eligibleDomains',
      'shuffleQuestions', 'shuffleOptions',
      'unlockCode', 'violationThreshold',
      'isMultiSection', 'sections', 'questions',
      'examType',
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
 * @route   POST /api/exams/:id/sections
 * @desc    Add a section to a multi-section exam
 * @access  Admin
 */
router.post('/:id/sections', authenticate, requireAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const { title, duration } = req.body;
    if (!title || !duration) {
      return res.status(400).json({ message: 'Section title and duration (mins) are required.' });
    }

    exam.isMultiSection = true;
    exam.sections.push({
      title,
      duration: Number(duration),
      questions: [],
    });

    // Recalculate total duration as sum of sections
    exam.duration = exam.sections.reduce((sum, s) => sum + (s.duration || 0), 0);

    await exam.save();
    res.status(201).json({ message: 'Section added successfully.', exam });
  } catch (error) {
    console.error('Add section error:', error);
    res.status(500).json({ message: 'Server error adding section.', error: error.message });
  }
});

/**
 * @route   PUT /api/exams/:id/sections/:sectionId
 * @desc    Update a section title or duration
 * @access  Admin
 */
router.put('/:id/sections/:sectionId', authenticate, requireAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const section = exam.sections.id(req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found.' });

    if (req.body.title !== undefined) section.title = req.body.title;
    if (req.body.duration !== undefined) section.duration = Number(req.body.duration);

    // Recalculate total duration
    exam.duration = exam.sections.reduce((sum, s) => sum + (s.duration || 0), 0);

    await exam.save();
    res.status(200).json({ message: 'Section updated successfully.', exam });
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({ message: 'Server error updating section.' });
  }
});

/**
 * @route   DELETE /api/exams/:id/sections/:sectionId
 * @desc    Delete a section from a multi-section exam
 * @access  Admin
 */
router.delete('/:id/sections/:sectionId', authenticate, requireAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    exam.sections = exam.sections.filter(
      (s) => s._id.toString() !== req.params.sectionId
    );

    // Update total duration
    if (exam.sections.length > 0) {
      exam.duration = exam.sections.reduce((sum, s) => sum + (s.duration || 0), 0);
    }

    await exam.save();
    res.status(200).json({ message: 'Section deleted successfully.', exam });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({ message: 'Server error deleting section.' });
  }
});

/**
 * @route   POST /api/exams/:id/questions
 * @desc    Add a question to exam or specific section (with optional image upload)
 * @access  Admin
 */
router.post('/:id/questions', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const {
      type, questionText, options, correctOptions,
      acceptedTexts, numericValue, numericTolerance, fillBlankType,
      subject, topic, sourceExamId, sectionId, sectionIndex,
    } = req.body;

    const newQuestion = {
      type,
      questionText,
      options: options ? (Array.isArray(options) ? options : JSON.parse(options)) : [],
      correctOptions: correctOptions ? (Array.isArray(correctOptions) ? correctOptions.map(Number) : JSON.parse(correctOptions).map(Number)) : [],
      acceptedTexts: acceptedTexts ? (Array.isArray(acceptedTexts) ? acceptedTexts : JSON.parse(acceptedTexts)) : [],
      numericValue: numericValue !== undefined && numericValue !== '' ? Number(numericValue) : null,
      numericTolerance: numericTolerance !== undefined && numericTolerance !== '' ? Number(numericTolerance) : 0,
      fillBlankType: fillBlankType || null,
      subject: subject || '',
      topic: topic || '',
      sourceExamId: sourceExamId || null,
      imageUrl: req.file ? req.file.path : null,
      imagePublicId: req.file ? req.file.filename : null,
    };

    let createdQuestion;

    if (exam.isMultiSection && exam.sections?.length > 0) {
      let targetSection;
      if (sectionId) {
        targetSection = exam.sections.id(sectionId);
      } else if (sectionIndex !== undefined && exam.sections[Number(sectionIndex)]) {
        targetSection = exam.sections[Number(sectionIndex)];
      } else {
        targetSection = exam.sections[0];
      }

      if (!targetSection) {
        return res.status(400).json({ message: 'Target section not found.' });
      }

      targetSection.questions.push(newQuestion);
      createdQuestion = targetSection.questions[targetSection.questions.length - 1];
    } else {
      exam.questions.push(newQuestion);
      createdQuestion = exam.questions[exam.questions.length - 1];
    }

    await exam.save();

    res.status(201).json({
      message: 'Question added successfully.',
      question: createdQuestion,
      exam,
    });
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({ message: 'Server error adding question.', error: error.message });
  }
});

/**
 * @route   PUT /api/exams/:id/questions/:questionId
 * @desc    Edit a specific question (supports flat and multi-section)
 * @access  Admin
 */
router.put('/:id/questions/:questionId', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    let question = exam.questions.id(req.params.questionId);

    // If not found in flat questions, search inside sections
    if (!question && exam.sections?.length > 0) {
      for (const s of exam.sections) {
        const found = s.questions.id(req.params.questionId);
        if (found) {
          question = found;
          break;
        }
      }
    }

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
    res.status(200).json({ message: 'Question updated successfully.', question, exam });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Server error updating question.', error: error.message });
  }
});

/**
 * @route   DELETE /api/exams/:id/questions/:questionId
 * @desc    Delete a question from exam (supports flat and multi-section)
 * @access  Admin
 */
router.delete('/:id/questions/:questionId', authenticate, requireAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    exam.questions = exam.questions.filter(
      (q) => q._id.toString() !== req.params.questionId
    );

    if (exam.sections?.length > 0) {
      exam.sections.forEach((s) => {
        s.questions = s.questions.filter(
          (q) => q._id.toString() !== req.params.questionId
        );
      });
    }

    await exam.save();
    res.status(200).json({ message: 'Question deleted successfully.', exam });
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
 * @desc    Publish/unpublish results — only allowed after exam.endTime has passed
 * @access  Admin
 */
const { sendExamPublishNotifications } = require('../utils/mailer');
const User = require('../models/User');

/**
 * @route   POST /api/exams/:id/notify
 * @desc    Stream email notifications with real-time progress via SSE
 * @access  Admin
 */
router.post('/:id/notify', authenticate, requireAdmin, async (req, res) => {
  // Set up SSE streaming headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      send({ error: 'Exam not found.' });
      return res.end();
    }

    // Find all eligible students
    const studentQuery = {};
    if (exam.eligibleBranches?.length > 0) studentQuery.branch = { $in: exam.eligibleBranches };
    if (exam.eligibleYears?.length > 0) studentQuery.year = { $in: exam.eligibleYears };
    if (exam.eligibleDomains?.length > 0) studentQuery.domains = { $in: exam.eligibleDomains };
    studentQuery.role = 'student';
    studentQuery.status = 'active';

    const students = await User.find(studentQuery).select('name email');

    // Emit initial state so client knows the total immediately
    send({ started: true, total: students.length, sent: 0, failed: 0 });

    // Stream progress after each email via onProgress callback
    const result = await sendExamPublishNotifications(exam, students, (progress) => {
      send(progress);
    });

    // Emit final summary
    if (result && result.sentCount > 0) {
      exam.notificationsSent = true;
      exam.notifiedAt = new Date();
      exam.notificationsSentCount = (exam.notificationsSentCount || 0) + result.sentCount;
      await exam.save();
    }

    send({ done: true, ...result, total: students.length, notificationsSent: exam.notificationsSent });
    res.end();
  } catch (error) {
    console.error('Notify students error:', error);
    send({ error: error.message || 'Server error sending email notifications.' });
    res.end();
  }
});

router.patch('/:id/publish', authenticate, requireAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    // ── Gating: cannot publish before exam ends (unless admin passes force=true) ─
    const now = new Date();
    const isForce = req.query.force === 'true' || req.query.force === true;
    if (!isForce && now < new Date(exam.endTime)) {
      return res.status(403).json({
        message: 'Results cannot be published before the exam has ended.',
        canPublishAt: exam.endTime,
      });
    }

    const wasPublished = Boolean(exam.publishResults);
    exam.publishResults = !wasPublished;
    await exam.save();

    // ── Send email notifications asynchronously (non-blocking) ────────────────
    if (exam.publishResults && !wasPublished) {
      (async () => {
        try {
          const studentQuery = {};
          if (exam.eligibleBranches?.length > 0) studentQuery.branch = { $in: exam.eligibleBranches };
          if (exam.eligibleYears?.length > 0) studentQuery.year = { $in: exam.eligibleYears };
          if (exam.eligibleDomains?.length > 0) studentQuery.domains = { $in: exam.eligibleDomains };
          studentQuery.role = 'student';
          studentQuery.status = 'active';

          const students = await User.find(studentQuery).select('name email');
          if (students.length > 0) {
            await sendExamPublishNotifications(exam, students);
          }
        } catch (mailErr) {
          console.warn('[Mailer] Background publish notification failed:', mailErr.message);
        }
      })();
    }

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

    // Cascade delete any submissions for this exam
    await Submission.deleteMany({ examId: req.params.id });

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
    const { branch, year, domains: studentDomains } = req.user;
    const now = new Date();

    // Build query: branch & year match or are unrestricted ([] / not set)
    const andConditions = [];
    if (branch) {
      andConditions.push({
        $or: [
          { eligibleBranches: { $size: 0 } },
          { eligibleBranches: { $exists: false } },
          { eligibleBranches: branch },
        ],
      });
    }
    if (year) {
      andConditions.push({
        $or: [
          { eligibleYears: { $size: 0 } },
          { eligibleYears: { $exists: false } },
          { eligibleYears: Number(year) },
        ],
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const exams = await Exam.find(query)
      .select('-questions.correctOptions -questions.acceptedTexts -questions.numericValue -questions.numericTolerance -unlockCode')
      .sort({ startTime: 1 });

    // Post-filter: if exam has eligibleDomains set, student needs a matching domain
    const filtered = exams.filter(e => {
      if (!e.eligibleDomains || e.eligibleDomains.length === 0) return true;
      return (studentDomains || []).some(d => e.eligibleDomains.includes(d));
    });

    // Classify exams into upcoming, live, completed
    const upcoming = filtered.filter((e) => new Date(e.startTime) > now);
    const live = filtered.filter(
      (e) => new Date(e.startTime) <= now && new Date(e.endTime) >= now
    );
    const completed = filtered.filter((e) => new Date(e.endTime) < now);

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
      const exam = await Exam.findById(examId).select(
        'title subject isMultiSection sections questions'
      );
      if (!exam) return res.status(404).json({ message: 'Exam not found.' });

      // Flatten questions if multi-section so callers get all questions
      const questions =
        exam.isMultiSection && exam.sections?.length > 0
          ? exam.sections.flatMap((s) => s.questions || [])
          : exam.questions || [];

      return res.status(200).json({
        exam: {
          ...exam.toObject(),
          questions,
        },
      });
    }

    // Return exam list for the bank selector
    const exams = await Exam.find()
      .select('title subject examCode createdAt isMultiSection sections questions')
      .sort({ createdAt: -1 });

    const formattedExams = exams.map((e) => {
      const qCount =
        (e.sections || []).reduce((sum, s) => sum + (s.questions?.length || 0), 0) +
        (e.questions?.length || 0);

      return {
        _id: e._id,
        title: e.title,
        subject: e.subject,
        examCode: e.examCode,
        createdAt: e.createdAt,
        isMultiSection: e.isMultiSection,
        questionsCount: qCount,
        questions: e.questions,
        sections: e.sections,
      };
    });

    res.status(200).json({ exams: formattedExams });
  } catch (error) {
    console.error('Question bank error:', error);
    res.status(500).json({ message: 'Server error fetching question bank.' });
  }
});

module.exports = router;
