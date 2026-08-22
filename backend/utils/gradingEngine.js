/**
 * Grading Engine for the Online Examination Portal
 *
 * Supports:
 * - MCQ: Single correct option (exact index match)
 * - MSQ: Multiple correct options (exact set match - all and only)
 * - FILL_BLANK (text): Normalized string comparison against acceptedTexts; no match = flagged for manual review
 * - FILL_BLANK (number): Within [value - tolerance, value + tolerance]
 * - Negative marking: Deduct negativeMarkValue per wrong objective answer (MCQ/MSQ)
 */

/**
 * Normalize text for comparison:
 * - lowercase
 * - trim
 * - collapse multiple spaces
 * - remove common punctuation
 */
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ');
};

/**
 * Grade a single answer against the question definition
 * @param {Object} question - The question document from the exam
 * @param {Object} answer - The student's answer
 * @param {number} marksPerQuestion - Marks for a correct answer
 * @param {boolean} negativeMarking - Whether negative marking is enabled
 * @param {number} negativeMarkValue - Marks to deduct for wrong answer
 * @returns {Object} { score, isCorrect, isFlaggedForManualReview }
 */
const gradeAnswer = (question, answer, marksPerQuestion, negativeMarking, negativeMarkValue) => {
  const result = {
    score: 0,
    isCorrect: false,
    isFlaggedForManualReview: false,
  };

  switch (question.type) {
    case 'MCQ': {
      const studentChoice = answer.selectedOptions?.[0];
      if (studentChoice === undefined || studentChoice === null || answer.selectedOptions.length === 0) {
        // Not attempted - no penalty
        result.isCorrect = false;
        result.score = 0;
        break;
      }

      const correctOption = question.correctOptions?.[0];
      if (studentChoice === correctOption) {
        result.isCorrect = true;
        result.score = marksPerQuestion;
      } else {
        result.isCorrect = false;
        result.score = negativeMarking ? -Math.abs(negativeMarkValue) : 0;
      }
      break;
    }

    case 'MSQ': {
      const selected = [...(answer.selectedOptions || [])].sort();
      const correct = [...(question.correctOptions || [])].sort();

      if (selected.length === 0) {
        // Not attempted - no penalty
        result.isCorrect = false;
        result.score = 0;
        break;
      }

      const isExactMatch =
        selected.length === correct.length &&
        selected.every((val, idx) => val === correct[idx]);

      if (isExactMatch) {
        result.isCorrect = true;
        result.score = marksPerQuestion;
      } else {
        result.isCorrect = false;
        result.score = negativeMarking ? -Math.abs(negativeMarkValue) : 0;
      }
      break;
    }

    case 'FILL_BLANK': {
      const fillType = question.fillBlankType;

      if (fillType === 'number') {
        const studentNum = parseFloat(answer.textResponse);
        if (isNaN(studentNum)) {
          // Not attempted - no penalty
          result.score = 0;
          result.isCorrect = false;
          break;
        }
        const tolerance = question.numericTolerance ?? 0;
        const correct = question.numericValue;
        if (studentNum >= correct - tolerance && studentNum <= correct + tolerance) {
          result.isCorrect = true;
          result.score = marksPerQuestion;
        } else {
          result.isCorrect = false;
          result.score = negativeMarking ? -Math.abs(negativeMarkValue) : 0;
        }
      } else {
        // Text type - normalize and compare
        if (!answer.textResponse || answer.textResponse.trim() === '') {
          // Not attempted - no penalty
          result.score = 0;
          result.isCorrect = false;
          break;
        }

        const normalizedStudent = normalizeText(answer.textResponse);
        const acceptedNormalized = (question.acceptedTexts || []).map(normalizeText);

        if (acceptedNormalized.includes(normalizedStudent)) {
          result.isCorrect = true;
          result.score = marksPerQuestion;
        } else {
          // Flag for manual review - NEVER auto-mark as wrong
          result.isFlaggedForManualReview = true;
          result.isCorrect = null; // Pending
          result.score = 0;
        }
      }
      break;
    }

    default:
      break;
  }

  return result;
};

/**
 * Grade an entire submission
 * @param {Object} submission - The submission document
 * @param {Object} exam - The exam document (with questions and correct answers)
 * @returns {Object} { gradedAnswers, totalScore, maxPossibleScore }
 */
const gradeSubmission = (submission, exam) => {
  const { marksPerQuestion, negativeMarking, negativeMarkValue } = exam;
  let totalScore = 0;

  // Flatten all questions if multi-section, otherwise use flat questions array
  const allQuestions =
    exam.isMultiSection && exam.sections?.length > 0
      ? exam.sections.flatMap((s) => s.questions || [])
      : exam.questions || [];

  const maxPossibleScore = allQuestions.length * marksPerQuestion;

  const gradedAnswers = submission.answers.map((answer) => {
    const question = allQuestions.find(
      (q) => q._id.toString() === answer.questionId.toString()
    );

    if (!question) return answer;

    const gradeResult = gradeAnswer(
      question,
      answer,
      marksPerQuestion,
      negativeMarking,
      negativeMarkValue
    );

    totalScore += gradeResult.score;

    return {
      ...answer.toObject ? answer.toObject() : answer,
      isCorrect: gradeResult.isCorrect,
      score: gradeResult.score,
      isFlaggedForManualReview: gradeResult.isFlaggedForManualReview,
    };
  });

  // Ensure totalScore doesn't go below 0
  totalScore = Math.max(0, totalScore);

  return { gradedAnswers, totalScore, maxPossibleScore };
};

module.exports = { gradeAnswer, gradeSubmission, normalizeText };
