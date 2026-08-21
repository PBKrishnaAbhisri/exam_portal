import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import StudentLayout from '../../components/common/StudentLayout';
import { getMyResult, getMySubmission } from '../../api';
import {
  Award,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  BarChart3,
  Lock,
  Printer,
  Calendar,
  Check,
  X,
  HelpCircle,
  Filter,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

const ExamResult = () => {
  const { examId } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [notPublished, setNotPublished] = useState(false);
  const [notAttempted, setNotAttempted] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'correct' | 'wrong' | 'unattempted' | 'review'
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!examId) return;
      try {
        const { data } = await getMyResult(examId);
        if (data.published) {
          setResult(data);
          setNotPublished(false);
          setNotAttempted(false);
        } else if (data.notAttempted) {
          setNotAttempted(true);
          setNotPublished(false);
        } else {
          setNotPublished(true);
          setSubmission(data.submission);
        }
      } catch {
        setNotAttempted(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId]);

  const stats = useMemo(() => {
    if (!result || !result.breakdown) {
      return { total: 0, correct: 0, wrong: 0, unattempted: 0, review: 0, accuracy: 0 };
    }
    const breakdown = result.breakdown;
    const total = breakdown.length;
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    let review = 0;

    breakdown.forEach((item) => {
      if (item.isFlaggedForManualReview) {
        review++;
      } else if (item.isCorrect === true) {
        correct++;
      } else if (item.isCorrect === false) {
        wrong++;
      } else {
        const hasSelection =
          item.questionType === 'FILL_BLANK'
            ? !!item.textResponse?.trim()
            : item.selectedOptions?.length > 0;
        if (hasSelection) {
          wrong++;
        } else {
          unattempted++;
        }
      }
    });

    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(1) : '0.0';

    return { total, correct, wrong, unattempted, review, accuracy };
  }, [result]);

  const getPct = () => {
    if (!result) return 0;
    return result.maxPossibleScore > 0
      ? ((result.totalScore / result.maxPossibleScore) * 100).toFixed(1)
      : '0.0';
  };

  const getGrade = (pct) => {
    if (pct >= 80) return { label: 'A', text: 'Excellent', cls: 'text-emerald-700 bg-emerald-100 border-emerald-200' };
    if (pct >= 60) return { label: 'B', text: 'Good', cls: 'text-primary-700 bg-primary-100 border-primary-200' };
    if (pct >= 40) return { label: 'C', text: 'Passed', cls: 'text-amber-700 bg-amber-100 border-amber-200' };
    return { label: 'D', text: 'Needs Improvement', cls: 'text-red-700 bg-red-100 border-red-200' };
  };

  const filteredQuestions = useMemo(() => {
    if (!result?.breakdown) return [];
    return result.breakdown.filter((item) => {
      if (activeFilter === 'correct') return item.isCorrect === true && !item.isFlaggedForManualReview;
      if (activeFilter === 'wrong') return item.isCorrect === false && !item.isFlaggedForManualReview;
      if (activeFilter === 'unattempted') {
        const hasSelection =
          item.questionType === 'FILL_BLANK'
            ? !!item.textResponse?.trim()
            : item.selectedOptions?.length > 0;
        return !hasSelection && !item.isFlaggedForManualReview;
      }
      if (activeFilter === 'review') return item.isFlaggedForManualReview;
      return true;
    });
  }, [result, activeFilter]);

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex justify-center items-center h-80">
          <div className="flex flex-col items-center gap-3">
            <div className="spinner w-9 h-9"></div>
            <p className="text-sm font-medium text-slate-500">Loading exam evaluation...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (notAttempted) {
    return (
      <StudentLayout>
        <div className="page-content flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Submission Found</h2>
          <p className="text-slate-500 text-sm mb-6 text-center max-w-sm">
            You have not attempted this exam or no submission record exists for your account.
          </p>
          <Link to="/student" className="btn-primary">
            <ChevronLeft className="w-4 h-4 mr-1" /> Return to Dashboard
          </Link>
        </div>
      </StudentLayout>
    );
  }

  if (notPublished) {
    return (
      <StudentLayout>
        <div className="page-content max-w-2xl mx-auto space-y-6 pt-4">
          <Link
            to="/student/results"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to All Results
          </Link>

          <div className="card text-center py-12 px-8 overflow-hidden relative">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Results Awaiting Publication</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-md mx-auto">
              Your submission has been securely recorded. Detailed scores and question answers will become visible as soon as the faculty completes evaluation and publishes the results.
            </p>

            {submission && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left space-y-3 text-sm max-w-md mx-auto mb-6">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Exam Status</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full text-xs capitalize">
                    {submission.status?.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Submitted On</span>
                  <span className="font-medium text-slate-800">
                    {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Integrity Violations</span>
                  <span
                    className={`font-semibold ${
                      submission.violationCount > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {submission.violationCount} recorded
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Clock className="w-4 h-4" />
              Check back soon or consult your faculty coordinator.
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!result) {
    return (
      <StudentLayout>
        <div className="page-content flex flex-col items-center justify-center py-24">
          <AlertCircle className="w-14 h-14 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Unable to Load Results</h2>
          <p className="text-slate-500 text-sm mb-6">Result details are currently unavailable.</p>
          <Link to="/student/results" className="btn-primary">
            <ChevronLeft className="w-4 h-4" /> Back to All Results
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const pct = parseFloat(getPct());
  const grade = getGrade(pct);

  return (
    <StudentLayout>
      <div className="page-content space-y-6">
        {/* Navigation & Actions Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/student/results"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200">
              <ChevronLeft className="w-4 h-4" />
            </div>
            Back to Results Overview
          </Link>

          <button
            onClick={() => window.print()}
            className="btn-secondary btn-sm flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Score Card
          </button>
        </div>

        {/* Hero Performance Card */}
        <div className="card overflow-hidden border-0 shadow-lg bg-gradient-to-r from-slate-900 via-primary-950 to-primary-900 text-white relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -translate-y-24 translate-x-24 pointer-events-none" />

          <div className="p-6 md:p-8 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ● Evaluation Complete
                  </span>
                  <span className="text-xs text-slate-400">Score Card</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{result.examTitle}</h1>
                <p className="text-xs text-slate-300 flex items-center gap-1.5 pt-1">
                  <Calendar className="w-3.5 h-3.5 text-primary-400" />
                  Submitted on {result.submittedAt ? new Date(result.submittedAt).toLocaleString() : '—'}
                </p>
              </div>

              {/* Grade Badge */}
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm self-start md:self-auto">
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Grade</p>
                  <p className="text-sm font-bold text-white">{grade.text}</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-white text-slate-900 font-extrabold text-2xl flex items-center justify-center shadow-md">
                  {grade.label}
                </div>
              </div>
            </div>

            {/* Score & Progress Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 items-center">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Score Earned</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-extrabold text-white">{result.totalScore}</span>
                  <span className="text-xl text-slate-400">/ {result.maxPossibleScore} Marks</span>
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300 font-medium">Overall Score Percentage</span>
                  <span className="font-bold text-white text-base">{pct}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-primary-400' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="card p-4 flex items-center gap-3.5 border-slate-200/80">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm">
              <BarChart3 className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Questions</p>
              <p className="text-lg font-bold text-slate-800">{stats.total}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5 border-emerald-200/60 bg-emerald-50/30">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-emerald-800 font-medium">Correct</p>
              <p className="text-lg font-bold text-emerald-700">{stats.correct}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5 border-red-200/60 bg-red-50/30">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-700">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-red-800 font-medium">Incorrect</p>
              <p className="text-lg font-bold text-red-700">{stats.wrong}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5 border-slate-200/80">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <AlertCircle className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Unattempted</p>
              <p className="text-lg font-bold text-slate-700">{stats.unattempted}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5 border-primary-200/60 bg-primary-50/30 col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
              <Award className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-primary-800 font-medium">Accuracy</p>
              <p className="text-lg font-bold text-primary-700">{stats.accuracy}%</p>
            </div>
          </div>
        </div>

        {/* Main Content Layout: Question Palette + Question Details */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Quick Jump Palette (Sidebar) */}
          <div className="card p-5 lg:sticky lg:top-4 order-2 lg:order-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-primary-500" /> Question Navigator
            </h3>
            <p className="text-xs text-slate-400 mb-4">Click any question to jump to it directly:</p>

            <div className="grid grid-cols-5 gap-2">
              {result.breakdown?.map((item, idx) => {
                const isCorrect = item.isCorrect === true;
                const isWrong = item.isCorrect === false;
                const isReview = item.isFlaggedForManualReview;
                const isUnattempted = !isCorrect && !isWrong && !isReview;

                let btnCls = 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200';
                if (isReview) {
                  btnCls = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                } else if (isCorrect) {
                  btnCls = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                } else if (isWrong) {
                  btnCls = 'bg-red-100 text-red-800 border-red-300 font-bold';
                }

                return (
                  <button
                    key={item.questionId || idx}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`q-card-${idx}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setSelectedQuestionId(item.questionId || idx);
                    }}
                    className={`h-9 w-full rounded-lg text-xs font-semibold border transition-all flex items-center justify-center ${btnCls} ${
                      selectedQuestionId === (item.questionId || idx) ? 'ring-2 ring-primary-500 ring-offset-1' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> Correct
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Incorrect
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" /> Unattempted
              </div>
              {stats.review > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Under Review
                </div>
              )}
            </div>
          </div>

          {/* Detailed Question Review List */}
          <div className="lg:col-span-3 space-y-4 order-1 lg:order-2">
            {/* Filter Tabs Header */}
            <div className="card p-2 flex flex-wrap items-center justify-between gap-2 bg-slate-100/70 border-slate-200/80">
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: 'all', label: 'All Questions', count: stats.total },
                  { id: 'correct', label: 'Correct', count: stats.correct },
                  { id: 'wrong', label: 'Incorrect', count: stats.wrong },
                  { id: 'unattempted', label: 'Unattempted', count: stats.unattempted },
                  ...(stats.review > 0 ? [{ id: 'review', label: 'In Review', count: stats.review }] : []),
                ].map(({ id, label, count }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveFilter(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeFilter === id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        activeFilter === id ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400 pr-2">
                Showing {filteredQuestions.length} of {stats.total}
              </span>
            </div>

            {/* Questions List */}
            {filteredQuestions.length === 0 ? (
              <div className="card py-16 text-center">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">No questions match the selected filter.</p>
                <button onClick={() => setActiveFilter('all')} className="btn-ghost btn-sm text-primary-600 mt-2">
                  Show All Questions
                </button>
              </div>
            ) : (
              filteredQuestions.map((item) => {
                // Find original question index
                const originalIndex = result.breakdown.findIndex(
                  (q) => (q.questionId || q) === (item.questionId || item)
                );
                const qNum = originalIndex !== -1 ? originalIndex + 1 : 1;

                const isCorrect = item.isCorrect === true;
                const isWrong = item.isCorrect === false;
                const isReview = item.isFlaggedForManualReview;
                const isUnattempted = !isCorrect && !isWrong && !isReview;

                return (
                  <div
                    key={item.questionId || qNum}
                    id={`q-card-${originalIndex}`}
                    className={`card overflow-hidden transition-all border-l-4 ${
                      isReview
                        ? 'border-l-amber-500'
                        : isCorrect
                        ? 'border-l-emerald-500'
                        : isWrong
                        ? 'border-l-red-500'
                        : 'border-l-slate-300'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                          {qNum}
                        </span>
                        <span className="badge badge-gray text-xs">
                          {item.questionType === 'MSQ'
                            ? 'Multiple Select'
                            : item.questionType === 'FILL_BLANK'
                            ? 'Fill in the Blank'
                            : 'Multiple Choice'}
                        </span>
                      </div>

                      {/* Score Badge */}
                      <div className="flex items-center gap-2">
                        {isReview ? (
                          <span className="badge badge-yellow text-xs font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Manual Review Pending
                          </span>
                        ) : isCorrect ? (
                          <span className="badge badge-green text-xs font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> +{item.score} Marks
                          </span>
                        ) : isWrong ? (
                          <span className="badge badge-red text-xs font-bold flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> {item.score} Marks
                          </span>
                        ) : (
                          <span className="badge badge-gray text-xs font-medium">0 Marks (Unattempted)</span>
                        )}
                      </div>
                    </div>

                    {/* Question Body */}
                    <div className="p-6 space-y-4">
                      <p className="text-base font-semibold text-slate-800 leading-relaxed">
                        {item.questionText}
                      </p>

                      {item.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 max-w-md">
                          <img src={item.imageUrl} alt="Question Attachment" className="w-full object-cover" />
                        </div>
                      )}

                      {/* MCQ / MSQ Options Display */}
                      {item.options && item.options.length > 0 && (
                        <div className="space-y-2.5 pt-2">
                          {item.options.map((opt, optIdx) => {
                            const isSelected = item.selectedOptions?.includes(optIdx);
                            const optLetter = String.fromCharCode(65 + optIdx);

                            let optCls = 'bg-white border-slate-200 text-slate-700';
                            let badgeCls = 'bg-slate-100 text-slate-600 border-slate-300';

                            if (isSelected) {
                              if (isCorrect) {
                                optCls = 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium';
                                badgeCls = 'bg-emerald-500 text-white border-emerald-600';
                              } else if (isWrong) {
                                optCls = 'bg-red-50/80 border-red-300 text-red-950 font-medium';
                                badgeCls = 'bg-red-500 text-white border-red-600';
                              } else {
                                optCls = 'bg-primary-50 border-primary-300 text-primary-950 font-medium';
                                badgeCls = 'bg-primary-600 text-white border-primary-600';
                              }
                            }

                            return (
                              <div
                                key={optIdx}
                                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-sm transition-all ${optCls}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border flex-shrink-0 ${badgeCls}`}
                                  >
                                    {optLetter}
                                  </span>
                                  <span>{opt}</span>
                                </div>

                                {isSelected && (
                                  <span className="text-xs font-semibold flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-md bg-white/80 border border-slate-200">
                                    {isCorrect ? (
                                      <span className="text-emerald-700 flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5" /> Your Answer (Correct)
                                      </span>
                                    ) : isWrong ? (
                                      <span className="text-red-700 flex items-center gap-1">
                                        <X className="w-3.5 h-3.5" /> Your Answer (Incorrect)
                                      </span>
                                    ) : (
                                      <span className="text-primary-700">Your Selection</span>
                                    )}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Fill in Blank Response */}
                      {item.questionType === 'FILL_BLANK' && (
                        <div className="pt-2">
                          <div
                            className={`p-4 rounded-xl border ${
                              isCorrect
                                ? 'bg-emerald-50/60 border-emerald-200'
                                : isWrong
                                ? 'bg-red-50/60 border-red-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                              Your Submitted Response:
                            </p>
                            <p className="text-sm font-semibold text-slate-900 font-mono">
                              {item.textResponse ? `"${item.textResponse}"` : <span className="text-slate-400 italic">No response submitted</span>}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Manual Review Banner */}
                      {isReview && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>This question is currently under manual evaluation by your instructor. Final score will be updated once reviewed.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default ExamResult;
