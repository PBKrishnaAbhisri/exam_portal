const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { authenticate, requireAdmin } = require('../middleware/auth');
const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const User = require('../models/User');

/**
 * @route   GET /api/admin/analytics/:examId
 * @desc    Get full analytics for an exam (toppers, per-student scores, grade distribution, filterable by branch/year/domain)
 * @access  Admin
 */
router.get('/analytics/:examId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { branch, year, domain, search } = req.query;

    const exam = await Exam.findById(req.params.examId).select(
      'title subject examCode marksPerQuestion negativeMarking negativeMarkValue isMultiSection sections questions eligibleBranches eligibleYears eligibleDomains'
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const submissions = await Submission.find({
      examId: req.params.examId,
      status: { $in: ['submitted', 'auto-submitted'] },
    })
      .populate('studentId', 'name email rollNumber branch year cgpa domains status')
      .sort({ totalScore: -1 });

    const allQuestions =
      exam.isMultiSection && exam.sections?.length > 0
        ? exam.sections.flatMap((s) => s.questions || [])
        : (exam.questions || []);

    const totalQuestions = allQuestions.length;
    const maxPossible = totalQuestions * (exam.marksPerQuestion || 1);

    // Apply filtering on student attributes
    let filtered = submissions.filter((s) => s.studentId);
    if (branch && branch !== 'ALL') {
      filtered = filtered.filter((s) => s.studentId.branch === branch);
    }
    if (year && year !== 'ALL') {
      filtered = filtered.filter((s) => s.studentId.year === Number(year));
    }
    if (domain && domain !== 'ALL') {
      filtered = filtered.filter((s) => s.studentId.domains?.includes(domain));
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((s) => {
        const name = s.studentId?.name?.toLowerCase() || '';
        const roll = s.studentId?.rollNumber?.toLowerCase() || '';
        const email = s.studentId?.email?.toLowerCase() || '';
        return name.includes(q) || roll.includes(q) || email.includes(q);
      });
    }

    const totalStudents = filtered.length;

    // Build leaderboard with detailed breakdown and violations for each student
    const leaderboard = filtered.map((sub, idx) => {
      const breakdown = allQuestions.map((q, qIdx) => {
        const ans = (sub.answers || []).find(
          (a) => a.questionId?.toString() === q._id?.toString()
        );
        const isAttempted =
          !!ans &&
          ((ans.selectedOptions && ans.selectedOptions.length > 0) ||
            (ans.textResponse && ans.textResponse.trim() !== ''));

        return {
          questionIndex: qIdx + 1,
          questionId: q._id,
          questionText: q.questionText,
          questionType: q.type,
          options: q.options || [],
          correctOptions: q.correctOptions || [],
          correctAnswerText: q.correctAnswerText,
          imageUrl: q.imageUrl,
          selectedOptions: ans?.selectedOptions || [],
          textResponse: ans?.textResponse || '',
          isCorrect: ans?.isCorrect ?? false,
          score: ans?.score || 0,
          isAttempted,
        };
      });

      const actualViolationsCount =
        sub.violations && sub.violations.length > 0
          ? sub.violations.length
          : sub.violationCount || 0;

      return {
        _id: sub._id,
        rank: idx + 1,
        student: sub.studentId,
        totalScore: sub.totalScore,
        maxPossibleScore: sub.maxPossibleScore || maxPossible,
        percentage: maxPossible > 0 ? ((sub.totalScore / maxPossible) * 100).toFixed(2) : 0,
        submittedAt: sub.submittedAt,
        violationCount: actualViolationsCount,
        violations: sub.violations || [],
        breakdown,
      };
    });

    // Grade distribution buckets
    const distribution = { 'A (80-100%)': 0, 'B (60-79%)': 0, 'C (40-59%)': 0, 'D (<40%)': 0 };
    filtered.forEach((sub) => {
      const pct = maxPossible > 0 ? (sub.totalScore / maxPossible) * 100 : 0;
      if (pct >= 80) distribution['A (80-100%)']++;
      else if (pct >= 60) distribution['B (60-79%)']++;
      else if (pct >= 40) distribution['C (40-59%)']++;
      else distribution['D (<40%)']++;
    });

    const averageScore =
      totalStudents > 0
        ? (filtered.reduce((s, sub) => s + sub.totalScore, 0) / totalStudents).toFixed(2)
        : 0;
    const highestScore = filtered[0]?.totalScore || 0;

    res.status(200).json({
      exam: {
        _id: exam._id,
        title: exam.title,
        subject: exam.subject,
        examCode: exam.examCode,
        marksPerQuestion: exam.marksPerQuestion,
        negativeMarking: exam.negativeMarking,
        negativeMarkValue: exam.negativeMarkValue,
        eligibleBranches: exam.eligibleBranches || [],
        eligibleYears: exam.eligibleYears || [],
        eligibleDomains: exam.eligibleDomains || [],
        totalQuestions,
        maxPossibleScore: maxPossible,
      },
      totalStudents,
      averageScore,
      highestScore,
      leaderboard,
      distribution,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error fetching analytics.' });
  }
});

/**
 * @route   GET /api/admin/export/pdf/:examId
 * @desc    Export exam results as PDF
 * @access  Admin
 */
router.get('/export/pdf/:examId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { branch, year, domain } = req.query;

    const exam = await Exam.findById(req.params.examId).select(
      'title subject examCode marksPerQuestion isMultiSection sections questions'
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const submissions = await Submission.find({
      examId: req.params.examId,
      status: { $in: ['submitted', 'auto-submitted'] },
    })
      .populate('studentId', 'name email rollNumber branch year domains')
      .sort({ totalScore: -1 });

    const totalQuestions =
      exam.isMultiSection && exam.sections?.length > 0
        ? exam.sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)
        : (exam.questions?.length || 0);

    const maxPossible = totalQuestions * (exam.marksPerQuestion || 1);

    let filtered = submissions.filter((s) => s.studentId);
    if (branch && branch !== 'ALL') {
      filtered = filtered.filter((s) => s.studentId.branch === branch);
    }
    if (year && year !== 'ALL') {
      filtered = filtered.filter((s) => s.studentId.year === Number(year));
    }
    if (domain && domain !== 'ALL') {
      filtered = filtered.filter((s) => s.studentId.domains?.includes(domain));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.title}-results.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text(exam.title, { align: 'center' });
    doc.fontSize(11).font('Helvetica').text(`Subject: ${exam.subject || 'N/A'} | Exam Code: ${exam.examCode} | Total Questions: ${totalQuestions}`, { align: 'center' });
    doc.moveDown(1.5);

    // Summary
    const avg = filtered.length > 0 ? (filtered.reduce((s, sub) => s + sub.totalScore, 0) / filtered.length).toFixed(2) : 0;
    doc.fontSize(10).font('Helvetica-Bold').text(`Total Students: ${filtered.length} | Highest Score: ${filtered[0]?.totalScore || 0}/${maxPossible} | Avg Score: ${avg}/${maxPossible}`);
    doc.moveDown(1);

    // Table headers
    const cols = { rank: 40, name: 80, roll: 200, branch: 290, score: 360, pct: 430, violations: 490 };
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Rank', cols.rank);
    doc.text('Name', cols.name);
    doc.text('Roll No', cols.roll);
    doc.text('Branch/Yr', cols.branch);
    doc.text('Score', cols.score);
    doc.text('%', cols.pct);
    doc.text('Violations', cols.violations);
    doc.moveDown(0.3);
    doc.strokeColor('#aaaaaa').lineWidth(0.5).moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.4);

    doc.font('Helvetica').fontSize(8.5);
    filtered.forEach((sub, idx) => {
      if (doc.y > 750) doc.addPage();
      const s = sub.studentId;
      const pct = maxPossible > 0 ? ((sub.totalScore / maxPossible) * 100).toFixed(1) : 0;
      const y = doc.y;
      doc.text(`${idx + 1}`, cols.rank, y);
      doc.text(s.name || '', cols.name, y, { width: 110, ellipsis: true });
      doc.text(s.rollNumber || 'N/A', cols.roll, y);
      doc.text(`${s.branch || ''} Y${s.year || ''}`, cols.branch, y);
      doc.text(`${sub.totalScore}/${maxPossible}`, cols.score, y);
      doc.text(`${pct}%`, cols.pct, y);
      doc.text(`${sub.violationCount}`, cols.violations, y);
      doc.moveDown(0.6);
    });

    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ message: 'Server error generating PDF.' });
  }
});

/**
 * @route   GET /api/admin/export/excel/:examId
 * @desc    Export exam results as Excel XLSX
 * @access  Admin
 */
router.get('/export/excel/:examId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { branch, year, domain } = req.query;

    const exam = await Exam.findById(req.params.examId).select(
      'title subject examCode marksPerQuestion isMultiSection sections questions'
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const submissions = await Submission.find({
      examId: req.params.examId,
      status: { $in: ['submitted', 'auto-submitted'] },
    })
      .populate('studentId', 'name email rollNumber branch year cgpa domains')
      .sort({ totalScore: -1 });

    const totalQuestions =
      exam.isMultiSection && exam.sections?.length > 0
        ? exam.sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)
        : (exam.questions?.length || 0);

    const maxPossible = totalQuestions * (exam.marksPerQuestion || 1);

    let filtered = submissions.filter((s) => s.studentId);
    if (branch && branch !== 'ALL') {
      filtered = filtered.filter((s) => s.studentId.branch === branch);
    }
    if (year && year !== 'ALL') {
      filtered = filtered.filter((s) => s.studentId.year === Number(year));
    }
    if (domain && domain !== 'ALL') {
      filtered = filtered.filter((s) => s.studentId.domains?.includes(domain));
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Results');

    // Header row style
    sheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Branch', key: 'branch', width: 12 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'CGPA', key: 'cgpa', width: 10 },
      { header: 'Domains', key: 'domains', width: 25 },
      { header: `Score (Max: ${maxPossible})`, key: 'score', width: 18 },
      { header: 'Percentage', key: 'percentage', width: 14 },
      { header: 'Violations', key: 'violations', width: 12 },
      { header: 'Submitted At', key: 'submittedAt', width: 22 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

    filtered.forEach((sub, idx) => {
      const s = sub.studentId;
      const pct = maxPossible > 0 ? parseFloat(((sub.totalScore / maxPossible) * 100).toFixed(2)) : 0;
      sheet.addRow({
        rank: idx + 1,
        name: s.name,
        rollNumber: s.rollNumber || '',
        email: s.email,
        branch: s.branch || '',
        year: s.year || '',
        cgpa: s.cgpa || '',
        domains: s.domains?.join(', ') || '',
        score: sub.totalScore,
        percentage: pct,
        violations: sub.violationCount,
        submittedAt: sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.title}-results.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ message: 'Server error generating Excel.' });
  }
});

/**
 * @route   GET /api/admin/students
 * @desc    Get all registered students with filtering and statistics
 * @access  Admin
 */
router.get('/students', authenticate, requireAdmin, async (req, res) => {
  try {
    const { branch, year, domain, status, search } = req.query;

    const filter = { role: 'student' };

    if (branch && branch !== 'ALL') {
      filter.branch = branch;
    }
    if (year && year !== 'ALL') {
      filter.year = Number(year);
    }
    if (domain && domain !== 'ALL') {
      filter.domains = domain;
    }
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { rollNumber: regex },
      ];
    }

    const students = await User.find(filter)
      .select('name email rollNumber branch year cgpa status domains createdAt')
      .sort({ createdAt: -1 });

    // Aggregate basic exam counts for returned students
    const studentIds = students.map((s) => s._id);
    const stats = await Submission.aggregate([
      {
        $match: {
          studentId: { $in: studentIds },
          status: { $in: ['submitted', 'auto-submitted'] },
        },
      },
      {
        $group: {
          _id: '$studentId',
          totalExams: { $sum: 1 },
          avgScore: { $avg: '$totalScore' },
          totalViolations: { $sum: '$violationCount' },
        },
      },
    ]);

    const statsMap = {};
    stats.forEach((st) => {
      statsMap[st._id.toString()] = st;
    });

    const enrichedStudents = students.map((s) => ({
      ...s.toObject(),
      totalExams: statsMap[s._id.toString()]?.totalExams || 0,
      avgScore: statsMap[s._id.toString()]?.avgScore
        ? Number(statsMap[s._id.toString()].avgScore.toFixed(2))
        : 0,
      totalViolations: statsMap[s._id.toString()]?.totalViolations || 0,
    }));

    res.status(200).json({ students: enrichedStudents, total: enrichedStudents.length });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error fetching students.' });
  }
});

/**
 * @route   GET /api/admin/students/:id
 * @desc    Get detailed student profile with all submissions, violation logs, and domain filtering
 * @access  Admin
 */
router.get('/students/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: 'student' })
      .select('name email rollNumber branch year cgpa status domains createdAt');

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Fetch all submissions with populated exam details
    const submissions = await Submission.find({ studentId: student._id })
      .populate({
        path: 'examId',
        select: 'title subject examCode duration marksPerQuestion negativeMarking negativeMarkValue eligibleDomains startTime endTime publishResults isMultiSection sections questions',
      })
      .sort({ createdAt: -1 });

    // Optional domain filter on student submissions
    const { domain } = req.query;
    const filteredSubmissions =
      domain && domain !== 'ALL'
        ? submissions.filter((sub) =>
            sub.examId?.eligibleDomains?.includes(domain)
          )
        : submissions;

    // Compute overall statistics
    let totalScoreSum = 0;
    let maxScoreSum = 0;
    let passedCount = 0;
    let totalViolations = 0;
    let gradedCount = 0;

    const formattedSubmissions = filteredSubmissions.map((sub) => {
      const exam = sub.examId;
      let totalQuestions = 0;
      let maxPossible = 0;

      if (exam) {
        totalQuestions = exam.isMultiSection && exam.sections?.length > 0
          ? exam.sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)
          : (exam.questions?.length || 0);

        maxPossible = sub.maxPossibleScore || totalQuestions * (exam.marksPerQuestion || 1);
      }

      const pct = maxPossible > 0 ? ((sub.totalScore / maxPossible) * 100) : 0;
      const isPassed = pct >= 40;

      if (['submitted', 'auto-submitted'].includes(sub.status)) {
        gradedCount++;
        totalScoreSum += sub.totalScore || 0;
        maxScoreSum += maxPossible;
        if (isPassed) passedCount++;
      }

      const actualSubViolations =
        sub.violations && sub.violations.length > 0
          ? sub.violations.length
          : sub.violationCount || 0;

      totalViolations += actualSubViolations;

      const allQuestions =
        exam?.isMultiSection && exam?.sections?.length > 0
          ? exam.sections.flatMap((s) => s.questions || [])
          : (exam?.questions || []);

      const breakdown = allQuestions.map((q, qIdx) => {
        const ans = (sub.answers || []).find(
          (a) => a.questionId?.toString() === q._id?.toString()
        );
        const isAttempted =
          !!ans &&
          ((ans.selectedOptions && ans.selectedOptions.length > 0) ||
            (ans.textResponse && ans.textResponse.trim() !== ''));

        return {
          questionIndex: qIdx + 1,
          questionId: q._id,
          questionText: q.questionText,
          questionType: q.type,
          options: q.options || [],
          correctOptions: q.correctOptions || [],
          correctAnswerText: q.correctAnswerText,
          imageUrl: q.imageUrl,
          selectedOptions: ans?.selectedOptions || [],
          textResponse: ans?.textResponse || '',
          isCorrect: ans?.isCorrect ?? false,
          score: ans?.score || 0,
          isAttempted,
        };
      });

      return {
        _id: sub._id,
        examId: exam?._id,
        examTitle: exam?.title || 'Unknown Exam',
        examCode: exam?.examCode,
        subject: exam?.subject,
        eligibleDomains: exam?.eligibleDomains || [],
        publishResults: exam?.publishResults,
        status: sub.status,
        totalScore: sub.totalScore,
        maxPossibleScore: maxPossible,
        percentage: Number(pct.toFixed(2)),
        isPassed,
        violationCount: actualSubViolations,
        violations: sub.violations || [],
        breakdown,
        startedAt: sub.startedAt,
        submittedAt: sub.submittedAt,
        createdAt: sub.createdAt,
      };
    });

    const averagePercentage =
      maxScoreSum > 0
        ? Number(((totalScoreSum / maxScoreSum) * 100).toFixed(2))
        : 0;

    // ── Compute domain-wise analytics strictly across student's chosen domains ───────
    const domainStatsMap = {};

    // Initialize ONLY with student's assigned/selected domains
    (student.domains || []).forEach((d) => {
      domainStatsMap[d] = {
        domain: d,
        totalAttempted: 0,
        completedExams: 0,
        passedExams: 0,
        totalScore: 0,
        maxScore: 0,
        highestPercentage: 0,
      };
    });

    submissions.forEach((sub) => {
      const exam = sub.examId;
      if (!exam) return;

      // Determine which of the student's domains this exam applies to
      let applicableDomains = [];
      if (exam.eligibleDomains && exam.eligibleDomains.length > 0) {
        applicableDomains = (student.domains || []).filter((d) =>
          exam.eligibleDomains.includes(d)
        );
      } else {
        applicableDomains = student.domains || [];
      }

      let totalQuestions =
        exam.isMultiSection && exam.sections?.length > 0
          ? exam.sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)
          : (exam.questions?.length || 0);

      const maxPossible =
        sub.maxPossibleScore || totalQuestions * (exam.marksPerQuestion || 1);
      const pct = maxPossible > 0 ? (sub.totalScore / maxPossible) * 100 : 0;
      const isCompleted = ['submitted', 'auto-submitted'].includes(sub.status);
      const isPassed = pct >= 40;

      applicableDomains.forEach((dom) => {
        if (!domainStatsMap[dom]) return; // Strictly only student's domains

        domainStatsMap[dom].totalAttempted++;
        if (isCompleted) {
          domainStatsMap[dom].completedExams++;
          domainStatsMap[dom].totalScore += sub.totalScore || 0;
          domainStatsMap[dom].maxScore += maxPossible;
          if (isPassed) domainStatsMap[dom].passedExams++;
          if (pct > domainStatsMap[dom].highestPercentage) {
            domainStatsMap[dom].highestPercentage = Number(pct.toFixed(2));
          }
        }
      });
    });

    const domainAnalytics = Object.values(domainStatsMap).map((ds) => {
      const avgPct =
        ds.maxScore > 0 ? Number(((ds.totalScore / ds.maxScore) * 100).toFixed(2)) : 0;
      const avgScore =
        ds.completedExams > 0 ? Number((ds.totalScore / ds.completedExams).toFixed(2)) : 0;

      return {
        domain: ds.domain,
        totalAttempted: ds.totalAttempted,
        completedExams: ds.completedExams,
        passedExams: ds.passedExams,
        avgScore,
        averagePercentage: avgPct,
        highestPercentage: ds.highestPercentage,
      };
    });

    res.status(200).json({
      student,
      stats: {
        totalSubmissions: filteredSubmissions.length,
        completedExams: gradedCount,
        passedExams: passedCount,
        averagePercentage,
        totalViolations,
      },
      domainAnalytics,
      submissions: formattedSubmissions,
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({ message: 'Server error fetching student profile.' });
  }
});

/**
 * @route   GET /api/admin/toppers
 * @desc    Get aggregate toppers across all exams (filterable by domain, year, branch, and limit K)
 * @access  Admin
 */
router.get('/toppers', authenticate, requireAdmin, async (req, res) => {
  try {
    const { branch, year, domain, limit = 10 } = req.query;

    const studentFilter = { role: 'student' };
    if (branch && branch !== 'ALL') studentFilter.branch = branch;
    if (year && year !== 'ALL') studentFilter.year = Number(year);
    if (domain && domain !== 'ALL') studentFilter.domains = domain;

    const eligibleStudents = await User.find(studentFilter)
      .select('name email rollNumber branch year cgpa domains status createdAt');

    const studentMap = {};
    eligibleStudents.forEach((s) => {
      studentMap[s._id.toString()] = {
        student: s,
        totalExamsAttempted: 0,
        totalExamsPassed: 0,
        totalScoreSum: 0,
        maxScoreSum: 0,
        totalViolations: 0,
        examScores: [],
      };
    });

    const studentIds = eligibleStudents.map((s) => s._id);

    // Fetch all completed submissions for these students
    const submissions = await Submission.find({
      studentId: { $in: studentIds },
      status: { $in: ['submitted', 'auto-submitted'] },
    }).populate({
      path: 'examId',
      select: 'title marksPerQuestion eligibleDomains isMultiSection sections questions',
    });

    submissions.forEach((sub) => {
      const studentIdStr = sub.studentId?.toString();
      const entry = studentMap[studentIdStr];
      if (!entry || !sub.examId) return;

      const exam = sub.examId;

      // If domain filter is specified, check if the exam targeted this domain or student shares this domain
      if (domain && domain !== 'ALL') {
        const matchesExamDomain = exam.eligibleDomains?.includes(domain);
        const matchesStudentDomain = entry.student.domains?.includes(domain);
        if (!matchesExamDomain && !matchesStudentDomain) return;
      }

      const totalQuestions =
        exam.isMultiSection && exam.sections?.length > 0
          ? exam.sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)
          : (exam.questions?.length || 0);

      const maxPossible =
        sub.maxPossibleScore || totalQuestions * (exam.marksPerQuestion || 1);

      if (maxPossible <= 0) return;

      const pct = (sub.totalScore / maxPossible) * 100;
      const isPassed = pct >= 40;

      entry.totalExamsAttempted++;
      entry.totalScoreSum += sub.totalScore || 0;
      entry.maxScoreSum += maxPossible;
      entry.totalViolations +=
        sub.violations && sub.violations.length > 0
          ? sub.violations.length
          : sub.violationCount || 0;
      if (isPassed) entry.totalExamsPassed++;

      entry.examScores.push({
        examTitle: exam.title,
        score: sub.totalScore,
        maxScore: maxPossible,
        percentage: Number(pct.toFixed(2)),
      });
    });

    // Transform and calculate averages
    const toppersList = Object.values(studentMap)
      .filter((entry) => entry.totalExamsAttempted > 0)
      .map((entry) => {
        const overallAveragePercentage =
          entry.maxScoreSum > 0
            ? Number(((entry.totalScoreSum / entry.maxScoreSum) * 100).toFixed(2))
            : 0;

        const avgScore =
          entry.totalExamsAttempted > 0
            ? Number((entry.totalScoreSum / entry.totalExamsAttempted).toFixed(2))
            : 0;

        return {
          student: entry.student,
          totalExamsAttempted: entry.totalExamsAttempted,
          totalExamsPassed: entry.totalExamsPassed,
          totalScoreSum: entry.totalScoreSum,
          maxScoreSum: entry.maxScoreSum,
          avgScore,
          overallAveragePercentage,
          totalViolations: entry.totalViolations,
          examScores: entry.examScores,
        };
      })
      .sort((a, b) => {
        // 1st: Higher average percentage
        if (b.overallAveragePercentage !== a.overallAveragePercentage) {
          return b.overallAveragePercentage - a.overallAveragePercentage;
        }
        // 2nd: More exams completed
        if (b.totalExamsAttempted !== a.totalExamsAttempted) {
          return b.totalExamsAttempted - a.totalExamsAttempted;
        }
        // 3rd: Fewer violations (cleaner integrity)
        return a.totalViolations - b.totalViolations;
      });

    const parsedLimit = Number(limit) || 10;
    const rankedToppers = toppersList.slice(0, parsedLimit).map((item, idx) => ({
      rank: idx + 1,
      ...item,
    }));

    res.status(200).json({
      toppers: rankedToppers,
      totalRanked: toppersList.length,
      filters: {
        branch: branch || 'ALL',
        year: year || 'ALL',
        domain: domain || 'ALL',
        limit: parsedLimit,
      },
    });
  } catch (error) {
    console.error('Get toppers error:', error);
    res.status(500).json({ message: 'Server error calculating toppers.' });
  }
});

module.exports = router;
