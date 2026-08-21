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
 * @desc    Get full analytics for an exam (toppers, per-student scores, grade distribution)
 * @access  Admin
 */
router.get('/analytics/:examId', authenticate, requireAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId).select(
      'title subject examCode marksPerQuestion negativeMarking negativeMarkValue questions'
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const submissions = await Submission.find({
      examId: req.params.examId,
      status: { $in: ['submitted', 'auto-submitted'] },
    })
      .populate('studentId', 'name email rollNumber branch year cgpa')
      .sort({ totalScore: -1 });

    const totalStudents = submissions.length;
    const maxPossible = exam.questions.length * exam.marksPerQuestion;

    // Build analytics
    const leaderboard = submissions.map((sub, idx) => ({
      rank: idx + 1,
      student: sub.studentId,
      totalScore: sub.totalScore,
      maxPossibleScore: sub.maxPossibleScore || maxPossible,
      percentage: maxPossible > 0 ? ((sub.totalScore / maxPossible) * 100).toFixed(2) : 0,
      submittedAt: sub.submittedAt,
      violationCount: sub.violationCount,
    }));

    // Grade distribution buckets
    const distribution = { 'A (80-100%)': 0, 'B (60-79%)': 0, 'C (40-59%)': 0, 'D (<40%)': 0 };
    submissions.forEach((sub) => {
      const pct = maxPossible > 0 ? (sub.totalScore / maxPossible) * 100 : 0;
      if (pct >= 80) distribution['A (80-100%)']++;
      else if (pct >= 60) distribution['B (60-79%)']++;
      else if (pct >= 40) distribution['C (40-59%)']++;
      else distribution['D (<40%)']++;
    });

    const averageScore =
      totalStudents > 0
        ? (submissions.reduce((s, sub) => s + sub.totalScore, 0) / totalStudents).toFixed(2)
        : 0;
    const highestScore = submissions[0]?.totalScore || 0;

    res.status(200).json({
      exam: {
        title: exam.title,
        subject: exam.subject,
        examCode: exam.examCode,
        totalQuestions: exam.questions.length,
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
    const exam = await Exam.findById(req.params.examId).select('title subject examCode marksPerQuestion questions');
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const submissions = await Submission.find({
      examId: req.params.examId,
      status: { $in: ['submitted', 'auto-submitted'] },
    })
      .populate('studentId', 'name email rollNumber branch year')
      .sort({ totalScore: -1 });

    const maxPossible = exam.questions.length * exam.marksPerQuestion;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${exam.title}-results.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text(`${exam.title} - Results Report`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Subject: ${exam.subject || 'N/A'} | Exam Code: ${exam.examCode}`, { align: 'center' });
    doc.moveDown(1);

    // Table header
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Rank  Name                Roll No      Branch  Year  Score            %', { continued: false });
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(10);
    submissions.forEach((sub, idx) => {
      const s = sub.studentId;
      const pct = maxPossible > 0 ? ((sub.totalScore / maxPossible) * 100).toFixed(1) : 0;
      const line = `${String(idx + 1).padEnd(6)}${s.name.substring(0, 20).padEnd(20)}${(s.rollNumber || '').padEnd(13)}${(s.branch || '').padEnd(8)}${String(s.year || '').padEnd(6)}${sub.totalScore}/${maxPossible}`.padEnd(18) + `${pct}%`;
      doc.text(line);
    });

    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ message: 'Server error generating PDF.' });
  }
});

/**
 * @route   GET /api/admin/export/excel/:examId
 * @desc    Export exam results as Excel
 * @access  Admin
 */
router.get('/export/excel/:examId', authenticate, requireAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId).select('title subject examCode marksPerQuestion questions');
    if (!exam) return res.status(404).json({ message: 'Exam not found.' });

    const submissions = await Submission.find({
      examId: req.params.examId,
      status: { $in: ['submitted', 'auto-submitted'] },
    })
      .populate('studentId', 'name email rollNumber branch year cgpa')
      .sort({ totalScore: -1 });

    const maxPossible = exam.questions.length * exam.marksPerQuestion;

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
      { header: `Score (Max: ${maxPossible})`, key: 'score', width: 18 },
      { header: 'Percentage', key: 'percentage', width: 14 },
      { header: 'Violations', key: 'violations', width: 12 },
      { header: 'Submitted At', key: 'submittedAt', width: 22 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

    submissions.forEach((sub, idx) => {
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
 * @desc    Get all registered students
 * @access  Admin
 */
router.get('/students', authenticate, requireAdmin, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('name email rollNumber branch year cgpa createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({ students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error fetching students.' });
  }
});

module.exports = router;
