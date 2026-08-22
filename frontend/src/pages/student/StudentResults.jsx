import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import StudentLayout from '../../components/common/StudentLayout';
import { getEligibleExams, getMyResult, getMyAllResults, getDomains } from '../../api';
import {
  Award, CheckCircle, XCircle, Clock, AlertCircle,
  ChevronDown, ChevronUp, BarChart3, ExternalLink,
  Filter, RotateCcw, Search, Tag, BookOpen, TrendingUp, CheckCircle2
} from 'lucide-react';

const StudentResults = () => {
  const [completedExams, setCompletedExams] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedExam, setExpandedExam] = useState(null);
  const [domainCategories, setDomainCategories] = useState([]);
  const [allDomains, setAllDomains] = useState([]);

  // Filter state
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getDomains()
      .then(({ data }) => {
        setDomainCategories(data.categories || []);
        const flattened = (data.categories || []).flatMap((c) => c.domains);
        setAllDomains(Array.from(new Set(flattened)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [eligibleRes, allMyResultsRes] = await Promise.allSettled([
          getEligibleExams(),
          getMyAllResults(),
        ]);

        const eligibleData = eligibleRes.status === 'fulfilled' ? eligibleRes.value.data : {};
        const myResultsList = allMyResultsRes.status === 'fulfilled' ? allMyResultsRes.value.data?.results || [] : [];

        const resultData = {};
        const examMap = new Map();

        // Add completed and live eligible exams
        const eligibleExams = [...(eligibleData.completed || []), ...(eligibleData.live || [])];
        eligibleExams.forEach((e) => {
          if (e && e._id) examMap.set(e._id.toString(), e);
        });

        // Add and populate from myResultsList (guaranteed to include all attempted exams)
        myResultsList.forEach((item) => {
          if (item?.exam?._id) {
            const idStr = item.exam._id.toString();
            if (!examMap.has(idStr)) {
              examMap.set(idStr, item.exam);
            }
            if (item.published) {
              resultData[item.exam._id] = {
                type: 'published',
                data: {
                  published: true,
                  examTitle: item.exam.title,
                  totalScore: item.totalScore,
                  maxPossibleScore: item.maxPossibleScore,
                  status: item.status,
                  submittedAt: item.submittedAt,
                  breakdown: item.breakdown,
                },
              };
            } else if (item.status) {
              resultData[item.exam._id] = {
                type: 'pending',
                submission: {
                  status: item.status,
                  submittedAt: item.submittedAt,
                  violationCount: item.violationCount,
                },
              };
            }
          }
        });

        // For any eligible exams not in myResultsList, check getMyResult
        const remainingExams = Array.from(examMap.values()).filter((e) => !resultData[e._id]);
        await Promise.all(
          remainingExams.map(async (exam) => {
            try {
              const { data: res } = await getMyResult(exam._id);
              if (res.published) {
                resultData[exam._id] = { type: 'published', data: res };
              } else if (!res.notAttempted && res.submission) {
                resultData[exam._id] = { type: 'pending', submission: res.submission };
              }
            } catch {
              // Ignore
            }
          })
        );

        setCompletedExams(Array.from(examMap.values()));
        setResults(resultData);
      } catch (err) {
        console.error('Error loading results list:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const getScorePct = (resultObj) => {
    if (!resultObj || resultObj.type !== 'published' || !resultObj.data) return null;
    const res = resultObj.data;
    return res.maxPossibleScore > 0 ? ((res.totalScore / res.maxPossibleScore) * 100).toFixed(1) : '0.0';
  };

  const getGrade = (pct) => {
    if (pct >= 80) return { label: 'A', cls: 'text-emerald-700 bg-emerald-100 border-emerald-200' };
    if (pct >= 60) return { label: 'B', cls: 'text-primary-700 bg-primary-100 border-primary-200' };
    if (pct >= 40) return { label: 'C', cls: 'text-amber-700 bg-amber-100 border-amber-200' };
    return { label: 'D', cls: 'text-red-700 bg-red-100 border-red-200' };
  };

  // Filtered exams list
  const filteredExams = useMemo(() => {
    return completedExams.filter((exam) => {
      // Domain filter
      if (domainFilter !== 'ALL') {
        if (!exam.eligibleDomains || !exam.eligibleDomains.includes(domainFilter)) {
          return false;
        }
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = exam.title?.toLowerCase().includes(q);
        const matchCode = exam.examCode?.toLowerCase().includes(q);
        const matchSubject = exam.subject?.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchSubject) return false;
      }

      return true;
    });
  }, [completedExams, domainFilter, search]);

  // Compute summary metrics
  const { publishedCount, averagePercentage, passedCount } = useMemo(() => {
    let pubCount = 0;
    let scoreSum = 0;
    let maxScoreSum = 0;
    let passCount = 0;

    filteredExams.forEach((exam) => {
      const resObj = results[exam._id];
      if (resObj?.type === 'published' && resObj.data) {
        pubCount++;
        scoreSum += resObj.data.totalScore || 0;
        maxScoreSum += resObj.data.maxPossibleScore || 0;
        const pct = resObj.data.maxPossibleScore > 0
          ? (resObj.data.totalScore / resObj.data.maxPossibleScore) * 100
          : 0;
        if (pct >= 40) passCount++;
      }
    });

    const avgPct = maxScoreSum > 0 ? ((scoreSum / maxScoreSum) * 100).toFixed(1) : '0.0';

    return {
      publishedCount: pubCount,
      averagePercentage: avgPct,
      passedCount: passCount,
    };
  }, [filteredExams, results]);

  const hasActiveFilters = domainFilter !== 'ALL' || search.trim() !== '';

  const handleResetFilters = () => {
    setDomainFilter('ALL');
    setSearch('');
  };

  return (
    <StudentLayout>
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-600" /> My Exam Results
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              View published results, detailed solutions, and domain-wise performance history.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-purple text-xs font-semibold px-3 py-1">
              {filteredExams.length} Exam{filteredExams.length !== 1 ? 's' : ''} Listed
            </span>
          </div>
        </div>
      </div>

      <div className="page-content space-y-5">
        {/* KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Exams Attempted</p>
              <p className="text-xl font-bold text-slate-800">{filteredExams.length}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Exams Passed</p>
              <p className="text-xl font-bold text-slate-800">{passedCount}</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Average Score</p>
              <p className="text-xl font-bold text-slate-800">{averagePercentage}%</p>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Published Results</p>
              <p className="text-xl font-bold text-slate-800">{publishedCount}</p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-primary-600" /> Filter Results by Domain
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="results-search-input"
                placeholder="Search by exam title, subject, or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10 text-sm py-2"
              />
            </div>

            {/* Domain Dropdown */}
            <div>
              <select
                id="results-domain-filter"
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="form-select text-sm py-2"
              >
                <option value="ALL">All Domains ({allDomains.length})</option>
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
        </div>

        {/* Results List Cards */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner w-8 h-8" />
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="card">
            <div className="card-body flex flex-col items-center py-20 text-center">
              <BookOpen className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-slate-700 font-semibold text-base">No Exam Results Match This Filter</p>
              <p className="text-slate-400 text-sm mt-1 max-w-md">
                {hasActiveFilters
                  ? 'Try selecting a different domain or clearing your search term.'
                  : 'Once you complete exams and faculty publishes scores, they will appear here.'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={handleResetFilters}
                  className="btn-secondary mt-5 inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
                </button>
              ) : (
                <Link to="/student" className="btn-primary mt-5">
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        ) : (
          filteredExams.map((exam) => {
            const resObj = results[exam._id];
            const isPublished = resObj?.type === 'published';
            const isPending = resObj?.type === 'pending';
            const resData = resObj?.data;
            const pct = getScorePct(resObj);
            const grade = pct !== null ? getGrade(parseFloat(pct)) : null;
            const isExpanded = expandedExam === exam._id;

            return (
              <div key={exam._id} className="card overflow-hidden transition-all hover:shadow-md">
                <div
                  className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedExam(isExpanded ? null : exam._id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800 text-base">{exam.title}</h3>
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                          {exam.examCode}
                        </span>
                        {exam.isMultiSection && (
                          <span className="badge badge-purple text-[10px]">
                            Multi-Section ({exam.sections?.length || 0})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {exam.subject && (
                          <span className="text-sm text-primary-600 font-medium">{exam.subject}</span>
                        )}
                        <span className="text-xs text-slate-400">
                          • Exam Date: {new Date(exam.startTime).toLocaleDateString()} · {exam.duration} mins
                        </span>
                      </div>

                      {/* Domain Badges */}
                      {exam.eligibleDomains && exam.eligibleDomains.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <Tag className="w-3 h-3 text-purple-500 flex-shrink-0" />
                          {exam.eligibleDomains.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDomainFilter(d);
                              }}
                              className={`badge text-[10px] cursor-pointer transition-all ${
                                domainFilter === d
                                  ? 'badge-purple ring-1 ring-purple-400'
                                  : 'badge-gray hover:badge-purple'
                              }`}
                              title={`Filter by ${d}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {isPending && (
                        <div className="flex items-center gap-2">
                          <span className="badge badge-yellow flex items-center gap-1 text-xs">
                            <Clock className="w-3 h-3" /> Results Pending
                          </span>
                          <Link
                            to={`/student/result/${exam._id}`}
                            className="btn-ghost btn-sm text-primary-600 flex items-center gap-1 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Details <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      )}

                      {!isPublished && !isPending && (
                        <span className="badge badge-gray text-xs">Not Attempted</span>
                      )}

                      {isPublished && pct !== null && (
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-slate-800 text-base">
                              {resData.totalScore} / {resData.maxPossibleScore}
                            </p>
                            <p className="text-xs font-semibold text-primary-600">{pct}%</p>
                          </div>
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-base ${grade?.cls}`}
                          >
                            {grade?.label}
                          </div>
                          <Link
                            to={`/student/result/${exam._id}`}
                            className="btn-ghost btn-sm text-primary-600 flex items-center gap-1 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Full View <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isPublished && pct !== null && (
                    <div className="mt-3">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            parseFloat(pct) >= 80
                              ? 'bg-emerald-500'
                              : parseFloat(pct) >= 60
                              ? 'bg-primary-500'
                              : parseFloat(pct) >= 40
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline Expandable Question Breakdown for Published Results */}
                {isExpanded && isPublished && resData?.breakdown && (
                  <div className="border-t border-slate-100 bg-slate-50/50 divide-y divide-slate-100">
                    <div className="px-5 py-2.5 bg-slate-100/70 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <span>Question Breakdown ({resData.breakdown.length} Questions)</span>
                      <span>Score</span>
                    </div>
                    {resData.breakdown.map((item, idx) => (
                      <div key={item.questionId || idx} className="px-5 py-3 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5">
                            {item.isFlaggedForManualReview ? (
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            ) : item.isCorrect === true ? (
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            ) : item.isCorrect === false ? (
                              <XCircle className="w-4 h-4 text-red-500" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-300" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              Q{idx + 1}. {item.questionText}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.questionType === 'FILL_BLANK'
                                ? `Your answer: "${item.textResponse || ''}"`
                                : item.selectedOptions?.length > 0
                                ? `Selected Option(s): ${item.selectedOptions
                                    .map((o) => String.fromCharCode(65 + o))
                                    .join(', ')}`
                                : 'Not answered'}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-bold flex-shrink-0 ${
                            item.score > 0
                              ? 'text-emerald-600'
                              : item.score < 0
                              ? 'text-red-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.score > 0 ? `+${item.score}` : item.score}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Expandable Info for Pending Results */}
                {isExpanded && isPending && (
                  <div className="border-t border-slate-100 bg-amber-50/40 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Submission Recorded — Evaluation in Progress
                          </p>
                          <p className="text-xs text-slate-500">
                            Your answers have been saved. Faculty will publish the official scores shortly.
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/student/result/${exam._id}`}
                        className="btn-primary btn-sm flex items-center gap-1.5 text-xs self-start sm:self-auto"
                      >
                        View Details Page <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentResults;
