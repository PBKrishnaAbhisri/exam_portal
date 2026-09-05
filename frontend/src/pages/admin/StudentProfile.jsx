import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import { getStudentAdminProfile, getDomains, getStudentResumeDownloadUrl } from '../../api';
import {
  ArrowLeft, Users, GraduationCap, Award, ShieldAlert,
  CheckCircle2, Clock, BookOpen, Tag, Filter, AlertTriangle,
  ChevronRight, Calendar, Mail, FileText, BarChart2, TrendingUp,
  RotateCcw, Sparkles, Target, Eye, X, Maximize2, FileCheck, ExternalLink,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [stats, setStats] = useState(null);
  const [domainAnalytics, setDomainAnalytics] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [allDomains, setAllDomains] = useState([]);
  const [expandedViolationsId, setExpandedViolationsId] = useState(null);

  // Result Inspection Modal state
  const [selectedExamResult, setSelectedExamResult] = useState(null);
  const [modalTab, setModalTab] = useState('violations'); // 'violations' | 'questions'
  const [questionFilter, setQuestionFilter] = useState('ALL'); // 'ALL' | 'CORRECT' | 'WRONG' | 'UNANSWERED'
  const [zoomSnapshot, setZoomSnapshot] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (domainFilter !== 'ALL') params.domain = domainFilter;
      const { data } = await getStudentAdminProfile(id, params);
      setStudent(data.student);
      setStats(data.stats);
      setDomainAnalytics(data.domainAnalytics || []);
      setSubmissions(data.submissions || []);
    } catch (err) {
      toast.error('Failed to load student profile.');
    } finally {
      setLoading(false);
    }
  }, [id, domainFilter]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading && !student) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-80">
          <div className="spinner w-8 h-8" />
        </div>
      </AdminLayout>
    );
  }

  if (!student) {
    return (
      <AdminLayout>
        <div className="page-content py-20 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-semibold text-slate-600">Student not found</p>
          <button onClick={() => navigate('/admin/students')} className="btn-secondary mt-4">
            ← Back to Students List
          </button>
        </div>
      </AdminLayout>
    );
  }

  const initials = student.name
    ? student.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ST';

  // Helper for violation tag style
  const getViolationBadgeStyle = (type) => {
    switch (type) {
      case 'phone-detected':
        return 'bg-red-600 text-white';
      case 'multiple-faces':
        return 'bg-orange-500 text-white';
      case 'face-missing':
        return 'bg-amber-500 text-white';
      case 'tab-switch':
        return 'bg-purple-600 text-white';
      case 'fullscreen-exit':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  // Filter questions in modal breakdown
  const filteredQuestions = selectedExamResult?.breakdown?.filter((item) => {
    if (questionFilter === 'CORRECT') return item.isCorrect === true;
    if (questionFilter === 'WRONG') return item.isCorrect === false && item.isAttempted;
    if (questionFilter === 'UNANSWERED') return !item.isAttempted;
    return true;
  }) || [];

  return (
    <AdminLayout>
      {/* ── IMAGE LIGHTBOX ZOOM MODAL ─────────────────────────────────────── */}
      {zoomSnapshot && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setZoomSnapshot(null)}
        >
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 animate-scale-up">
            <button
              onClick={() => setZoomSnapshot(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomSnapshot}
              alt="High-Res Evidence"
              className="w-full h-auto rounded-xl object-contain max-h-[85vh]"
            />
          </div>
        </div>
      )}

      {/* ── STUDENT EXAM RESULT & PROCTORING MODAL ─────────────────────────── */}
      {selectedExamResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-start justify-between gap-4 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-white">{selectedExamResult.examTitle}</h3>
                  <span className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded text-slate-200">
                    {selectedExamResult.examCode || 'N/A'}
                  </span>
                  {selectedExamResult.subject && (
                    <span className="badge badge-purple text-[10px]">
                      {selectedExamResult.subject}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Student: {student.name} ({student.rollNumber || 'N/A'}) • {student.branch} Y{student.year}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xl font-extrabold text-amber-400">
                    {selectedExamResult.totalScore} <span className="text-xs font-normal text-slate-300">/ {selectedExamResult.maxPossibleScore}</span>
                  </p>
                  <p className="text-xs font-bold text-emerald-400">{selectedExamResult.percentage}%</p>
                </div>
                <button
                  onClick={() => setSelectedExamResult(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100/80 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalTab('violations')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    modalTab === 'violations'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> AI Proctoring & Violations ({selectedExamResult.violations?.length || 0})
                </button>

                <button
                  onClick={() => setModalTab('questions')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    modalTab === 'questions'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" /> Detailed Answers Breakdown ({selectedExamResult.breakdown?.length || 0})
                </button>
              </div>

              {selectedExamResult.examId && (
                <Link
                  to={`/admin/analytics/${selectedExamResult.examId}`}
                  className="text-xs text-primary-600 hover:underline font-semibold flex items-center gap-1"
                >
                  Exam Analytics <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* ── TAB 1: VIOLATIONS GALLERY (GRID LAYOUT) ────────────────────── */}
              {modalTab === 'violations' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-red-50/70 border border-red-200 rounded-xl p-3.5">
                    <div>
                      <p className="font-bold text-red-900 text-sm flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-red-600" />
                        Proctoring Violations Log ({selectedExamResult.violations?.length || 0} Incidents Recorded)
                      </p>
                      <p className="text-xs text-red-700 mt-0.5">
                        Visual evidence captured during this exam session via YOLO AI vision & system monitoring.
                      </p>
                    </div>
                    <span
                      className={`badge text-xs font-bold ${
                        selectedExamResult.violationCount === 0
                          ? 'badge-green'
                          : selectedExamResult.violationCount <= 1
                          ? 'badge-yellow'
                          : 'badge-red'
                      }`}
                    >
                      {selectedExamResult.violationCount === 0
                        ? 'Clean Integrity'
                        : `${selectedExamResult.violationCount} Violations`}
                    </span>
                  </div>

                  {selectedExamResult.violations && selectedExamResult.violations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedExamResult.violations.map((v, i) => (
                        <div
                          key={i}
                          className="bg-white border-2 border-red-100 rounded-2xl p-4 shadow-sm space-y-2 hover:border-red-300 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getViolationBadgeStyle(
                                v.type
                              )}`}
                            >
                              {v.type?.replace(/-/g, ' ')}
                            </span>
                            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(v.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>

                          {v.description && (
                            <p className="text-xs text-slate-700 font-medium leading-relaxed">
                              {v.description}
                            </p>
                          )}

                          {/* Evidence snapshot preview */}
                          {v.evidenceSnapshot ? (
                            <div className="relative group mt-2">
                              <img
                                src={v.evidenceSnapshot}
                                alt="AI Detection Snapshot"
                                className="w-full h-40 rounded-xl object-cover border-2 border-red-300 cursor-pointer shadow-sm"
                                onClick={() => setZoomSnapshot(v.evidenceSnapshot)}
                              />
                              <button
                                type="button"
                                onClick={() => setZoomSnapshot(v.evidenceSnapshot)}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white rounded-xl transition-opacity text-xs font-bold gap-1.5"
                              >
                                <Maximize2 className="w-4 h-4" /> Click to Enlarge Snapshot
                              </button>
                            </div>
                          ) : (
                            <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-500 border border-slate-200/60 flex items-center gap-2">
                              <span className="font-medium">🛡️ Browser / System Event (Screen / Focus Trigger)</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-400 space-y-2">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                      <p className="text-base font-bold text-slate-700">Clean Examination Session</p>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        No suspicious movements, tab switches, multiple faces, or mobile devices were detected for this candidate during this exam.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 2: QUESTIONS BREAKDOWN ─────────────────────────────────── */}
              {modalTab === 'questions' && (
                <div className="space-y-4">
                  {/* Filter tabs */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {[
                        { key: 'ALL', label: 'All Questions' },
                        { key: 'CORRECT', label: '✓ Correct' },
                        { key: 'WRONG', label: '✗ Incorrect' },
                        { key: 'UNANSWERED', label: '○ Unanswered' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setQuestionFilter(key)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            questionFilter === key
                              ? 'bg-slate-800 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      Showing {filteredQuestions.length} Questions
                    </span>
                  </div>

                  {filteredQuestions.map((q) => (
                    <div
                      key={q.questionId}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        !q.isAttempted
                          ? 'border-slate-200 bg-slate-50/50'
                          : q.isCorrect
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : 'border-red-200 bg-red-50/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">Q{q.questionIndex}.</span>
                          <span className="badge badge-gray text-[10px]">{q.questionType}</span>
                          {!q.isAttempted ? (
                            <span className="badge badge-gray text-[10px]">Unanswered</span>
                          ) : q.isCorrect ? (
                            <span className="badge badge-green text-[10px]">✓ Correct (+{q.score})</span>
                          ) : (
                            <span className="badge badge-red text-[10px]">✗ Incorrect ({q.score})</span>
                          )}
                        </div>
                        <span className="text-xs font-bold font-mono">
                          Score: {q.score > 0 ? `+${q.score}` : q.score}
                        </span>
                      </div>

                      <p className="text-slate-800 font-medium text-sm mb-3">{q.questionText}</p>

                      {q.imageUrl && (
                        <img
                          src={q.imageUrl}
                          alt="Question Diagram"
                          className="mb-3 max-h-40 rounded-xl object-contain border border-slate-200"
                        />
                      )}

                      {/* Options breakdown */}
                      {q.questionType !== 'FILL_BLANK' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options?.map((opt, optIdx) => {
                            const isSelected = q.selectedOptions?.includes(optIdx);
                            const isCorrectOpt = q.correctOptions?.includes(optIdx);

                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                                  isCorrectOpt && isSelected
                                    ? 'border-emerald-500 bg-emerald-100 text-emerald-900 font-semibold'
                                    : isSelected && !isCorrectOpt
                                    ? 'border-red-500 bg-red-100 text-red-900 font-semibold'
                                    : isCorrectOpt
                                    ? 'border-emerald-300 bg-emerald-50/80 text-emerald-800 font-medium'
                                    : 'border-slate-200 bg-white text-slate-700'
                                }`}
                              >
                                <span className="font-bold w-5 h-5 rounded-md flex items-center justify-center bg-white/70 text-slate-700 text-[11px] flex-shrink-0">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {isSelected && (
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/80">
                                    Chosen
                                  </span>
                                )}
                                {isCorrectOpt && (
                                  <span className="text-[10px] text-emerald-700 font-bold">✓ Key</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                          <p className="text-slate-500">
                            Candidate's Response: <strong className="text-slate-800 font-mono">"{q.textResponse || '—'}"</strong>
                          </p>
                          <p className="text-emerald-700">
                            Official Correct Key: <strong className="font-mono">"{q.correctAnswerText || '—'}"</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header & Breadcrumbs */}
      <div className="page-header">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 font-medium">
          <Link to="/admin/students" className="hover:text-primary-600 transition-colors">
            Students
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">{student.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/students')}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shadow-sm"
              title="Back to Students"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{student.name}</h1>
              <p className="text-xs text-slate-500 font-mono">Roll: {student.rollNumber || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content space-y-6">
        {/* Student Profile Card */}
        <div className="card p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-500 to-purple-500 text-white font-extrabold text-2xl flex items-center justify-center flex-shrink-0 shadow-lg ring-4 ring-white/10">
                {initials}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-bold">{student.name}</h2>
                  <span
                    className={`badge text-xs font-semibold ${
                      student.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    }`}
                  >
                    {student.status === 'active' ? '● Active Student' : '○ Alumni'}
                  </span>
                </div>
                <p className="text-slate-300 text-sm font-mono flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {student.email}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
                  <span className="bg-white/10 px-2.5 py-1 rounded-lg">Branch: <strong>{student.branch}</strong></span>
                  <span className="bg-white/10 px-2.5 py-1 rounded-lg">Year: <strong>{student.year}</strong></span>
                  {student.cgpa && (
                    <span className="bg-white/10 px-2.5 py-1 rounded-lg">CGPA: <strong>{student.cgpa.toFixed(2)}</strong></span>
                  )}
                  <span className="bg-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Joined {new Date(student.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Domains List */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:max-w-xs w-full backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3 text-primary-400" /> Assigned Domains
              </p>
              <div className="flex flex-wrap gap-1.5">
                {student.domains && student.domains.length > 0 ? (
                  student.domains.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-500/20 border border-primary-400/30 text-primary-200"
                    >
                      {d}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No domains assigned</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resume download card */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-600" />
              <h3 className="font-semibold text-slate-800">Student Resume</h3>
            </div>
          </div>
          <div className="card-body">
            {student.resumeUrl ? (
              <div className="flex items-center justify-between gap-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{student.resumeOriginalName || 'resume.pdf'}</p>
                    {student.resumeUploadedAt && (
                      <p className="text-xs text-slate-400">Uploaded {new Date(student.resumeUploadedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
                <a
                  id="admin-download-resume"
                  href={getStudentResumeDownloadUrl(student._id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download Resume
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-sm">
                <FileText className="w-4 h-4 shrink-0" />
                <p>This student has not uploaded a resume yet.</p>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Exams Attempted</p>
              <p className="text-2xl font-bold text-slate-800">{stats?.totalSubmissions || 0}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Exams Passed</p>
              <p className="text-2xl font-bold text-slate-800">
                {stats?.passedExams || 0}
                <span className="text-xs font-normal text-slate-400 ml-1">
                  / {stats?.completedExams || 0}
                </span>
              </p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Overall Average Score</p>
              <p className="text-2xl font-bold text-slate-800">{stats?.averagePercentage || 0}%</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                (stats?.totalViolations || 0) > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Violations</p>
              <p
                className={`text-2xl font-bold ${
                  (stats?.totalViolations || 0) > 0 ? 'text-red-600' : 'text-slate-800'
                }`}
              >
                {stats?.totalViolations || 0}
              </p>
            </div>
          </div>
        </div>

        {/* ── DOMAIN-WISE ANALYTICS & AVERAGE SCORES ────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-600" /> Domain Performance & Average Scores
              </h3>
              <p className="text-xs text-slate-500">
                Detailed metrics, completion rate, and average score calculated individually per specialization domain.
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setDomainFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  domainFilter === 'ALL'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Domains
              </button>
            </div>
          </div>

          <div className="p-5">
            {domainAnalytics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {domainAnalytics.map((da) => {
                  const isSelected = domainFilter === da.domain;
                  const scoreColor =
                    da.averagePercentage >= 80
                      ? 'text-emerald-600'
                      : da.averagePercentage >= 60
                      ? 'text-primary-600'
                      : da.averagePercentage >= 40
                      ? 'text-amber-600'
                      : 'text-red-500';

                  const barBg =
                    da.averagePercentage >= 80
                      ? 'bg-emerald-500'
                      : da.averagePercentage >= 60
                      ? 'bg-primary-500'
                      : da.averagePercentage >= 40
                      ? 'bg-amber-500'
                      : 'bg-red-500';

                  return (
                    <div
                      key={da.domain}
                      onClick={() => setDomainFilter(isSelected ? 'ALL' : da.domain)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/50 shadow-md ring-2 ring-purple-200'
                          : 'border-slate-100 bg-white hover:border-purple-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                          {da.domain}
                        </span>
                        <span className={`text-base font-extrabold ${scoreColor}`}>
                          {da.averagePercentage}%
                        </span>
                      </div>

                      {/* Visual Percentage Progress Bar */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barBg}`}
                          style={{ width: `${Math.min(100, da.averagePercentage)}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-slate-100/80">
                        <div className="bg-slate-50 rounded-lg p-1.5">
                          <p className="font-bold text-slate-700">{da.totalAttempted}</p>
                          <p className="text-[10px] text-slate-400">Attempted</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-1.5">
                          <p className="font-bold text-emerald-600">{da.passedExams}</p>
                          <p className="text-[10px] text-slate-400">Passed</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-1.5">
                          <p className="font-bold text-purple-700">{da.highestPercentage}%</p>
                          <p className="text-[10px] text-slate-400">Best Score</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Avg Marks: <strong>{da.avgScore} pts</strong></span>
                        <span className="text-purple-600 font-semibold flex items-center gap-0.5">
                          {isSelected ? '✓ Filtered' : 'Click to filter →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <Tag className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p className="text-sm">No domain exam attempts recorded yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Submissions & Exam Performance Section */}
        <div className="card overflow-hidden">
          <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-600" /> Exam Submission History ({submissions.length})
              </h3>
              <p className="text-xs text-slate-500">
                {domainFilter !== 'ALL' ? (
                  <span>
                    Filtered by domain: <strong className="text-purple-700">{domainFilter}</strong>
                  </span>
                ) : (
                  'All exam attempts, scores, and proctoring incidents.'
                )}
              </p>
            </div>

            {/* Domain Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="exam-domain-filter"
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="form-select text-xs py-1.5 px-2.5 max-w-xs"
              >
                <option value="ALL">All Student's Domains</option>
                {(student?.domains || []).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {domainFilter !== 'ALL' && (
                <button
                  onClick={() => setDomainFilter('ALL')}
                  className="btn-ghost btn-sm text-xs text-primary-600"
                  title="Clear Filter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Exam Title</th>
                  <th>Target Domains</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th>Score / Max</th>
                  <th>Result</th>
                  <th>Violations</th>
                  <th className="text-center">View Result</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub) => {
                  const isExpanded = expandedViolationsId === sub._id;

                  return (
                    <tr key={sub._id} className="hover:bg-slate-50/70 transition-colors">
                      <td>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{sub.examTitle}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                              {sub.examCode || 'N/A'}
                            </span>
                            {sub.subject && <span className="text-xs text-slate-400">• {sub.subject}</span>}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {sub.eligibleDomains?.length > 0 ? (
                            sub.eligibleDomains.map((d) => (
                              <button
                                key={d}
                                onClick={() => setDomainFilter(d)}
                                className={`badge text-[10px] cursor-pointer transition-all ${
                                  domainFilter === d ? 'badge-purple ring-1 ring-purple-400' : 'badge-gray hover:badge-purple'
                                }`}
                                title={`Filter by ${d}`}
                              >
                                {d}
                              </button>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      <td className="text-xs text-slate-500">
                        {sub.submittedAt ? (
                          <>
                            <p className="font-medium text-slate-700">
                              {new Date(sub.submittedAt).toLocaleDateString()}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </>
                        ) : sub.startedAt ? (
                          <span className="text-amber-600 font-medium">In Progress</span>
                        ) : (
                          'Not started'
                        )}
                      </td>

                      <td>
                        <span
                          className={`badge text-xs ${
                            sub.status === 'submitted'
                              ? 'badge-green'
                              : sub.status === 'auto-submitted'
                              ? 'badge-blue'
                              : sub.status === 'locked'
                              ? 'badge-red'
                              : 'badge-yellow'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>

                      <td>
                        {['submitted', 'auto-submitted'].includes(sub.status) ? (
                          <div>
                            <span className="font-bold text-slate-800 text-sm">{sub.totalScore}</span>
                            <span className="text-xs text-slate-400 font-normal"> / {sub.maxPossibleScore}</span>
                            <p className="text-[11px] font-semibold text-primary-600">{sub.percentage}%</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      <td>
                        {['submitted', 'auto-submitted'].includes(sub.status) ? (
                          <span
                            className={`badge text-xs font-semibold ${
                              sub.isPassed ? 'badge-green' : 'badge-red'
                            }`}
                          >
                            {sub.isPassed ? '✓ Pass' : '✗ Fail'}
                          </span>
                        ) : (
                          <span className="badge badge-gray text-xs">Pending</span>
                        )}
                      </td>

                      <td>
                        {sub.violationCount > 0 ? (
                          <div>
                            <button
                              onClick={() => setExpandedViolationsId(isExpanded ? null : sub._id)}
                              className="badge badge-red cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 text-xs"
                              title="Click to toggle violation details"
                            >
                              <ShieldAlert className="w-3 h-3" /> {sub.violationCount} Violation{sub.violationCount !== 1 ? 's' : ''}
                            </button>
                            {isExpanded && sub.violations?.length > 0 && (
                              <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-left space-y-1.5 max-h-36 overflow-y-auto">
                                {sub.violations.map((v, i) => (
                                  <div key={i} className="text-[11px]">
                                    <span className="font-semibold text-red-800 capitalize">
                                      {i + 1}. {v.type?.replace(/-/g, ' ')}
                                    </span>
                                    {v.timestamp && (
                                      <span className="text-slate-400 ml-1">
                                        ({new Date(v.timestamp).toLocaleTimeString()})
                                      </span>
                                    )}
                                    {v.description && <p className="text-red-700">{v.description}</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">0 Clean</span>
                        )}
                      </td>

                      {/* VIEW RESULT COLUMN */}
                      <td className="text-center">
                        {['submitted', 'auto-submitted'].includes(sub.status) ? (
                          <button
                            id={`student-view-result-${sub._id}`}
                            onClick={() => {
                              setSelectedExamResult(sub);
                              setModalTab('violations');
                            }}
                            className="btn-primary btn-sm text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Result
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Pending</span>
                        )}
                      </td>

                      <td className="text-right">
                        {sub.examId && (
                          <Link
                            to={`/admin/analytics/${sub.examId}`}
                            className="btn-secondary btn-sm inline-flex items-center gap-1 text-xs text-primary-700"
                            title="View Exam Analytics"
                          >
                            <BarChart2 className="w-3.5 h-3.5" /> Analytics
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-slate-400">
                      <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No exam submissions found for this student.</p>
                      {domainFilter !== 'ALL' && (
                        <button
                          onClick={() => setDomainFilter('ALL')}
                          className="btn-secondary btn-sm mt-3 inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Clear Domain Filter
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentProfile;
