import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StudentLayout from '../../components/common/StudentLayout';
import { getEligibleExams, getMyResult, getMySubmission } from '../../api';
import { Award, CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp, BarChart3, ExternalLink } from 'lucide-react';

const StudentResults = () => {
  const [completedExams, setCompletedExams] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedExam, setExpandedExam] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await getEligibleExams();
        // Completed or live exams that might have submissions
        const allExams = [...(data.completed || []), ...(data.live || [])];
        
        // Remove duplicates by ID
        const uniqueExams = Array.from(new Map(allExams.map((e) => [e._id, e])).values());
        
        const resultData = {};
        const attendedExams = [];

        await Promise.all(
          uniqueExams.map(async (exam) => {
            try {
              const { data: res } = await getMyResult(exam._id);
              if (res.published) {
                resultData[exam._id] = { type: 'published', data: res };
                attendedExams.push(exam);
              } else if (!res.notAttempted && res.submission) {
                resultData[exam._id] = { type: 'pending', submission: res.submission };
                attendedExams.push(exam);
              }
            } catch {
              // Ignore
            }
          })
        );

        setCompletedExams(attendedExams.length > 0 ? attendedExams : (data.completed || []));
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

  return (
    <StudentLayout>
      <div className="page-header">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Award className="w-5 h-5 text-primary-600" /> Exam Results
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">View your results and performance across all previous exams</p>
      </div>

      <div className="page-content space-y-4">
        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner w-8 h-8"></div></div>
        ) : completedExams.length === 0 ? (
          <div className="card">
            <div className="card-body flex flex-col items-center py-20">
              <Clock className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-slate-600 font-semibold text-base">No Exam Results Yet</p>
              <p className="text-slate-400 text-sm mt-1">Once you complete exams and faculty publishes scores, they will show up here.</p>
              <Link to="/student" className="btn-primary mt-5">Go to Dashboard</Link>
            </div>
          </div>
        ) : (
          completedExams.map((exam) => {
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
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 text-base">{exam.title}</h3>
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{exam.examCode}</span>
                      </div>
                      {exam.subject && <p className="text-sm text-primary-600 font-medium mt-0.5">{exam.subject}</p>}
                      <p className="text-xs text-slate-400 mt-1">
                        Exam Date: {new Date(exam.startTime).toLocaleDateString()} · Duration: {exam.duration}m
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {isPending && (
                        <div className="flex items-center gap-2">
                          <span className="badge badge-yellow">
                            <Clock className="w-3 h-3" /> Results Pending
                          </span>
                          <Link
                            to={`/student/result/${exam._id}`}
                            className="btn-ghost btn-sm text-primary-600 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Details <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      )}

                      {!isPublished && !isPending && (
                        <span className="badge badge-gray">Not Attempted</span>
                      )}

                      {isPublished && pct !== null && (
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-slate-800 text-base">
                              {resData.totalScore} / {resData.maxPossibleScore}
                            </p>
                            <p className="text-xs font-semibold text-primary-600">{pct}%</p>
                          </div>
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-base ${grade?.cls}`}>
                            {grade?.label}
                          </div>
                          <Link
                            to={`/student/result/${exam._id}`}
                            className="btn-ghost btn-sm text-primary-600 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Full View <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      )}
                    </div>
                  </div>

                  {isPublished && pct !== null && (
                    <div className="mt-3">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${parseFloat(pct) >= 80 ? 'bg-emerald-500' : parseFloat(pct) >= 60 ? 'bg-primary-500' : parseFloat(pct) >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline Expandable Question Breakdown for Published Results */}
                {isExpanded && isPublished && resData?.breakdown && (
                  <div className="border-t border-slate-100 bg-slate-50/50 divide-y divide-slate-100">
                    <div className="px-5 py-2.5 bg-slate-100/70 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <span>Question Breakdown</span>
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
                            <p className="text-sm font-medium text-slate-800">Q{idx + 1}. {item.questionText}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {item.questionType === 'FILL_BLANK'
                                ? `Your answer: "${item.textResponse || ''}"`
                                : item.selectedOptions?.length > 0
                                ? `Selected Option(s): ${item.selectedOptions.map((o) => String.fromCharCode(65 + o)).join(', ')}`
                                : 'Not answered'}
                            </p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold flex-shrink-0 ${item.score > 0 ? 'text-emerald-600' : item.score < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                          {item.score > 0 ? `+${item.score}` : item.score}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Expandable Info for Pending Results */}
                {isExpanded && isPending && (
                  <div className="border-t border-slate-100 bg-amber-50/40 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Submission Recorded — Evaluation in Progress</p>
                          <p className="text-xs text-slate-500">Your answers have been submitted. Faculty will publish the scores shortly.</p>
                        </div>
                      </div>
                      <Link
                        to={`/student/result/${exam._id}`}
                        className="btn-primary btn-sm flex items-center gap-1.5"
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
