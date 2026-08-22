import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import { getAnalytics, exportPDF, exportExcel, getDomains } from '../../api';
import toast from 'react-hot-toast';
import {
  Download, Trophy, Users, TrendingUp, FileText, BarChart3,
  Filter, RotateCcw, ChevronRight, ShieldAlert, Award, Tag,
  ExternalLink, Search, Eye, X, CheckCircle2, XCircle,
  AlertTriangle, Clock, Maximize2, FileCheck, Check, AlertCircle
} from 'lucide-react';

const BRANCHES = ['ALL', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSD', 'OTHER'];
const YEARS = ['ALL', '1', '2', '3', '4'];

const ExamAnalytics = () => {
  const { examId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [domainCategories, setDomainCategories] = useState([]);

  // Filter state
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('ALL');
  const [year, setYear] = useState('ALL');
  const [domain, setDomain] = useState('ALL');
  const [violationFilter, setViolationFilter] = useState('ALL'); // 'ALL' | 'CLEAN' | 'VIOLATIONS'

  // Student Result Modal state
  const [selectedResultSub, setSelectedResultSub] = useState(null);
  const [modalTab, setModalTab] = useState('violations'); // 'violations' | 'questions'
  const [questionFilter, setQuestionFilter] = useState('ALL'); // 'ALL' | 'CORRECT' | 'WRONG' | 'UNANSWERED'
  const [zoomSnapshot, setZoomSnapshot] = useState(null);

  useEffect(() => {
    getDomains()
      .then(({ data }) => setDomainCategories(data.categories || []))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (branch !== 'ALL') params.branch = branch;
      if (year !== 'ALL') params.year = year;
      if (domain !== 'ALL') params.domain = domain;
      if (search.trim()) params.search = search.trim();

      const { data } = await getAnalytics(examId, params);
      setAnalytics(data);
    } catch {
      toast.error('Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [examId, branch, year, domain, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetFilters = () => {
    setSearch('');
    setBranch('ALL');
    setYear('ALL');
    setDomain('ALL');
    setViolationFilter('ALL');
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    branch !== 'ALL' ||
    year !== 'ALL' ||
    domain !== 'ALL' ||
    violationFilter !== 'ALL';

  // Client-side filtering for violations if needed
  const displayLeaderboard = useMemo(() => {
    if (!analytics?.leaderboard) return [];
    let list = analytics.leaderboard;

    if (violationFilter === 'CLEAN') {
      list = list.filter((e) => (e.violationCount || 0) === 0);
    } else if (violationFilter === 'VIOLATIONS') {
      list = list.filter((e) => (e.violationCount || 0) > 0);
    }

    return list;
  }, [analytics?.leaderboard, violationFilter]);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const params = {};
      if (branch !== 'ALL') params.branch = branch;
      if (year !== 'ALL') params.year = year;
      if (domain !== 'ALL') params.domain = domain;

      const fn = type === 'pdf' ? exportPDF : exportExcel;
      const { data } = await fn(examId, params);
      const blob = new Blob([data], {
        type:
          type === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = hasActiveFilters ? '-filtered' : '';
      a.download = `${analytics?.exam?.title || 'results'}${suffix}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} exported successfully!`);
    } catch {
      toast.error('Export failed.');
    } finally {
      setExporting(null);
    }
  };

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

  if (loading && !analytics) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-80">
          <div className="spinner w-8 h-8" />
        </div>
      </AdminLayout>
    );
  }

  if (!analytics) {
    return (
      <AdminLayout>
        <div className="page-content text-slate-500 py-16 text-center">Analytics not available.</div>
      </AdminLayout>
    );
  }

  const { exam, totalStudents, averageScore, highestScore, distribution } = analytics;
  const distEntries = Object.entries(distribution || {});
  const maxDist = Math.max(...distEntries.map(([, v]) => v), 1);

  // Filter questions in modal breakdown
  const filteredQuestions = selectedResultSub?.breakdown?.filter((item) => {
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
              alt="High-Res Violation Evidence"
              className="w-full h-auto rounded-xl object-contain max-h-[85vh]"
            />
          </div>
        </div>
      )}

      {/* ── STUDENT DETAILED RESULT & PROCTORING MODAL ──────────────────────── */}
      {selectedResultSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-slide-up border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-start justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-500 to-purple-500 text-white font-extrabold text-base flex items-center justify-center flex-shrink-0 shadow-md">
                  {selectedResultSub.student?.name
                    ? selectedResultSub.student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'ST'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white">{selectedResultSub.student?.name}</h3>
                    <span className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded text-slate-200">
                      {selectedResultSub.student?.rollNumber || 'N/A'}
                    </span>
                    <span className="badge badge-purple text-[10px]">
                      {selectedResultSub.student?.branch} • Year {selectedResultSub.student?.year}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">{selectedResultSub.student?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xl font-extrabold text-amber-400">
                    {selectedResultSub.totalScore} <span className="text-xs font-normal text-slate-300">/ {selectedResultSub.maxPossibleScore}</span>
                  </p>
                  <p className="text-xs font-bold text-emerald-400">{selectedResultSub.percentage}%</p>
                </div>
                <button
                  onClick={() => setSelectedResultSub(null)}
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
                  <ShieldAlert className="w-3.5 h-3.5" /> AI Proctoring & Violations ({selectedResultSub.violations?.length || 0})
                </button>

                <button
                  onClick={() => setModalTab('questions')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    modalTab === 'questions'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" /> Detailed Answers Breakdown ({selectedResultSub.breakdown?.length || 0})
                </button>
              </div>

              <Link
                to={`/admin/students/${selectedResultSub.student?._id}`}
                className="text-xs text-primary-600 hover:underline font-semibold flex items-center gap-1"
              >
                Full Profile <ExternalLink className="w-3 h-3" />
              </Link>
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
                        Proctoring Violations Log ({selectedResultSub.violations?.length || 0} Incidents Recorded)
                      </p>
                      <p className="text-xs text-red-700 mt-0.5">
                        Visual evidence captured during the candidate's exam session via YOLO AI vision & system monitoring.
                      </p>
                    </div>
                    <span
                      className={`badge text-xs font-bold ${
                        selectedResultSub.violationCount === 0
                          ? 'badge-green'
                          : selectedResultSub.violationCount <= 1
                          ? 'badge-yellow'
                          : 'badge-red'
                      }`}
                    >
                      {selectedResultSub.violationCount === 0
                        ? 'Clean Integrity'
                        : `${selectedResultSub.violationCount} Violations`}
                    </span>
                  </div>

                  {selectedResultSub.violations && selectedResultSub.violations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedResultSub.violations.map((v, i) => (
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
                        No suspicious movements, tab switches, multiple faces, or mobile devices were detected for this candidate.
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

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 font-medium">
              <Link to="/admin/exams" className="hover:text-primary-600">Exams</Link>
              <span>/</span>
              <span className="text-slate-700 font-semibold">{exam?.title}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800">{exam?.title} Analytics</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              {exam?.examCode} • {exam?.subject || 'General'} • {exam?.totalQuestions} Questions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="export-excel"
              onClick={() => handleExport('excel')}
              disabled={exporting === 'excel'}
              className="btn-secondary btn-sm flex items-center gap-1.5"
            >
              {exporting === 'excel' ? <div className="spinner w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              Excel Report
            </button>
            <button
              id="export-pdf"
              onClick={() => handleExport('pdf')}
              disabled={exporting === 'pdf'}
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              {exporting === 'pdf' ? <div className="spinner w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              PDF Report
            </button>
          </div>
        </div>
      </div>

      <div className="page-content space-y-6">
        {/* ── FILTER BAR FOR LEADERBOARD ─────────────────────────────────────── */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-primary-600" /> Filter Leaderboard Cohort & Results
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <label className="form-label text-xs mb-1">Search Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="analytics-search-input"
                  placeholder="Search name, roll, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="form-input pl-9 text-sm py-2"
                />
              </div>
            </div>

            {/* Branch Filter */}
            <div>
              <label className="form-label text-xs mb-1">Branch</label>
              <select
                id="analytics-branch-filter"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="form-select text-sm py-2"
              >
                <option value="ALL">All Branches</option>
                {BRANCHES.filter((b) => b !== 'ALL').map((b) => (
                  <option key={b} value={b}>
                    {b} Branch
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <label className="form-label text-xs mb-1">Year</label>
              <select
                id="analytics-year-filter"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="form-select text-sm py-2"
              >
                <option value="ALL">All Years</option>
                {YEARS.filter((y) => y !== 'ALL').map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Domain Filter */}
            <div>
              <label className="form-label text-xs mb-1">Student Domain</label>
              <select
                id="analytics-domain-filter"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="form-select text-sm py-2"
              >
                <option value="ALL">All Domains</option>
                {domainCategories.map((cat) => (
                  <optgroup key={cat.category} label={cat.category}>
                    {cat.domains.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Integrity Tabs */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">Integrity Filter:</span>
            {[
              { key: 'ALL', label: 'All Submissions' },
              { key: 'CLEAN', label: '● Clean Only (0 Violations)' },
              { key: 'VIOLATIONS', label: '⚠ Flagged with Violations' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setViolationFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  violationFilter === key
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPI METRICS ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-icon bg-primary-50 text-primary-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{totalStudents}</p>
              <p className="text-xs text-slate-500">Students in Cohort</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">
                {averageScore}
                <span className="text-xs font-normal text-slate-400 ml-1">
                  / {exam?.maxPossibleScore || 0}
                </span>
              </p>
              <p className="text-xs text-slate-500">Average Score</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-amber-50 text-amber-600">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">
                {highestScore}
                <span className="text-xs font-normal text-slate-400 ml-1">
                  / {exam?.maxPossibleScore || 0}
                </span>
              </p>
              <p className="text-xs text-slate-500">Highest Score</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon bg-purple-50 text-purple-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{exam?.totalQuestions || 0}</p>
              <p className="text-xs text-slate-500">Total Questions</p>
            </div>
          </div>
        </div>

        {/* ── GRADE DISTRIBUTION ─────────────────────────────────────────────── */}
        {distEntries.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-primary-600" /> Grade Distribution
              </h2>
            </div>
            <div className="card-body space-y-3">
              {distEntries.map(([grade, count]) => {
                const pct = totalStudents > 0 ? ((count / totalStudents) * 100).toFixed(0) : 0;
                const gc = grade.startsWith('A')
                  ? 'bg-emerald-500'
                  : grade.startsWith('B')
                  ? 'bg-primary-500'
                  : grade.startsWith('C')
                  ? 'bg-amber-500'
                  : 'bg-red-500';

                return (
                  <div key={grade}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{grade}</span>
                      <span className="text-xs font-semibold text-slate-600">
                        {count} student{count !== 1 ? 's' : ''} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${gc}`}
                        style={{ width: `${(count / maxDist) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LEADERBOARD TABLE WITH "SHOW RESULT" & PROCTORING COLUMN ────────── */}
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-base">
              <Trophy className="w-5 h-5 text-amber-500" /> Exam Leaderboard ({displayLeaderboard?.length || 0})
            </h2>
            <span className="text-xs text-slate-400">
              Click "Show Result" to inspect student answer keys, scoring, and proctoring violation gallery
            </span>
          </div>

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Roll Number</th>
                  <th>Branch / Year</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Violations</th>
                  <th className="text-center">Show Result</th>
                  <th className="text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayLeaderboard?.map((e, idx) => {
                  const studentObj = e.student || {};
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;

                  return (
                    <tr
                      key={studentObj._id || idx}
                      className="hover:bg-primary-50/40 transition-colors group"
                    >
                      <td>
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-bold ${
                            isTop1
                              ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-200 shadow-sm'
                              : isTop2
                              ? 'bg-slate-200 text-slate-800 ring-2 ring-slate-300'
                              : isTop3
                              ? 'bg-orange-300 text-orange-950 ring-2 ring-orange-200'
                              : 'text-slate-500 bg-slate-100'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {studentObj.name
                              ? studentObj.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                              : 'ST'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{studentObj.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{studentObj.email}</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                          {studentObj.rollNumber || 'N/A'}
                        </span>
                      </td>

                      <td className="text-xs text-slate-600 font-medium">
                        <span className="badge badge-blue text-[11px] mr-1">{studentObj.branch}</span>
                        <span className="badge badge-gray text-[11px]">Y{studentObj.year}</span>
                      </td>

                      <td className="font-bold text-slate-800 text-sm">
                        {e.totalScore}
                        <span className="text-xs font-normal text-slate-400"> / {e.maxPossibleScore}</span>
                      </td>

                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                parseFloat(e.percentage) >= 80
                                  ? 'bg-emerald-500'
                                  : parseFloat(e.percentage) >= 60
                                  ? 'bg-primary-500'
                                  : parseFloat(e.percentage) >= 40
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, e.percentage)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{e.percentage}%</span>
                        </div>
                      </td>

                      <td>
                        <button
                          onClick={() => {
                            setSelectedResultSub(e);
                            setModalTab('violations');
                          }}
                          className={`badge text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
                            e.violationCount === 0
                              ? 'badge-green'
                              : e.violationCount <= 1
                              ? 'badge-yellow'
                              : 'badge-red'
                          }`}
                          title="Click to view violation gallery"
                        >
                          {e.violationCount === 0 ? 'Clean' : `${e.violationCount} Violations`}
                        </button>
                      </td>

                      {/* SHOW RESULT COLUMN */}
                      <td className="text-center">
                        <button
                          id={`show-result-${studentObj._id}`}
                          onClick={() => {
                            setSelectedResultSub(e);
                            setModalTab('violations');
                          }}
                          className="btn-primary btn-sm text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" /> Show Result
                        </button>
                      </td>

                      <td className="text-right">
                        <Link
                          to={`/admin/students/${studentObj._id}`}
                          className="btn-ghost btn-sm text-xs text-primary-600 inline-flex items-center gap-1"
                        >
                          Profile <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {(!displayLeaderboard || displayLeaderboard.length === 0) && (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-slate-400">
                      <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No student submissions match this filter cohort.</p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="btn-secondary btn-sm mt-3 inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
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

export default ExamAnalytics;
