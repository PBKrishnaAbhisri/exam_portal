import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/common/StudentLayout';
import { getEligibleExams, getMySubmission } from '../../api';
import { Clock, Play, CheckCircle, Calendar, Timer, AlertCircle, Lock } from 'lucide-react';

const StudentDashboard = () => {
  const [exams, setExams] = useState({ upcoming: [], live: [], completed: [] });
  const [loading, setLoading] = useState(true);
  // Map of examId → submission status ('submitted' | 'auto-submitted' | 'started' | null)
  const [submissionStatuses, setSubmissionStatuses] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data } = await getEligibleExams();
        setExams(data);

        // For all live exams, check whether the student already has a submitted submission
        const liveExams = data.live || [];
        const statusMap = {};
        await Promise.all(
          liveExams.map(async (exam) => {
            try {
              const { data: sub } = await getMySubmission(exam._id);
              statusMap[exam._id] = sub?.submission?.status ?? null;
            } catch {
              statusMap[exam._id] = null; // no submission yet
            }
          })
        );
        setSubmissionStatuses(statusMap);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const ExamCard = ({ exam, type }) => {
    const isLive = type === 'live';
    const isCompleted = type === 'completed';
    const subStatus = submissionStatuses[exam._id];
    const alreadySubmitted = subStatus === 'submitted' || subStatus === 'auto-submitted';

    return (
      <div className={`card transition-all hover:shadow-md ${isLive && !alreadySubmitted ? 'ring-2 ring-emerald-400' : ''}`}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alreadySubmitted ? 'bg-slate-100' : isLive ? 'bg-emerald-100' : isCompleted ? 'bg-slate-100' : 'bg-primary-100'}`}>
              {alreadySubmitted
                ? <Lock className="w-5 h-5 text-slate-400" />
                : isLive ? <Play className="w-5 h-5 text-emerald-600" />
                : isCompleted ? <CheckCircle className="w-5 h-5 text-slate-500" />
                : <Clock className="w-5 h-5 text-primary-600" />}
            </div>
            {alreadySubmitted && <span className="badge badge-gray">Submitted</span>}
            {!alreadySubmitted && isLive && <span className="badge badge-green animate-pulse">● Live Now</span>}
            {!alreadySubmitted && !isLive && !isCompleted && <span className="badge badge-blue">Upcoming</span>}
            {!alreadySubmitted && isCompleted && <span className="badge badge-gray">Completed</span>}
          </div>
          <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2">{exam.title}</h3>
          {exam.subject && <p className="text-sm text-primary-600 font-medium mb-2">{exam.subject}</p>}
          <div className="space-y-1.5 text-xs text-slate-500 mb-4">
            <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(exam.startTime).toLocaleString()}</div>
            <div className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> {exam.duration} min · {exam.marksPerQuestion} mark/Q{exam.negativeMarking && <span className="text-red-500 ml-1">· Negative</span>}</div>
          </div>
          <div className="font-mono text-xs text-slate-400 mb-4">Code: {exam.examCode}</div>

          {/* Live exam action */}
          {isLive && (
            alreadySubmitted ? (
              // Already submitted — redirect to result page (disabled look, click goes to result)
              <Link
                id={`submitted-${exam._id}`}
                to={`/student/result/${exam._id}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 transition-all"
              >
                <CheckCircle className="w-4 h-4" /> View Result
              </Link>
            ) : (
              <Link
                id={`take-${exam._id}`}
                to={`/student/exam/${exam._id}/instructions`}
                className="btn-primary w-full text-center"
              >
                <Play className="w-4 h-4" /> Start Exam
              </Link>
            )
          )}

          {/* Completed exam action */}
          {isCompleted && (
            <Link id={`result-${exam._id}`} to={`/student/result/${exam._id}`} className="btn-secondary w-full text-center">
              <CheckCircle className="w-4 h-4" /> View Result
            </Link>
          )}

          {/* Upcoming — no action */}
          {!isLive && !isCompleted && (
            <div className="text-center text-sm text-slate-400 py-2 bg-slate-50 rounded-xl">
              Starts {new Date(exam.startTime).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    );
  };

  const Section = ({ title, icon: Icon, exams: sectionExams, emptyMsg, type, accent }) => (
    <div>
      <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${accent}`}>
        <Icon className="w-5 h-5" /><h2 className="font-bold text-slate-800">{title}</h2><span className="text-sm text-slate-400">({sectionExams.length})</span>
      </div>
      {sectionExams.length === 0 ? (
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl text-slate-400 text-sm"><AlertCircle className="w-5 h-5 flex-shrink-0" /> {emptyMsg}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{sectionExams.map((exam) => <ExamCard key={exam._id} exam={exam} type={type} />)}</div>
      )}
    </div>
  );

  return (
    <StudentLayout>
      <div className="page-header"><h1 className="text-xl font-bold text-slate-800">My Exams</h1><p className="text-sm text-slate-500 mt-0.5">Exams eligible for your branch and year</p></div>
      <div className="page-content space-y-8">
        {loading ? <div className="flex justify-center py-16"><div className="spinner w-8 h-8"></div></div> : (
          <>
            <Section title="Live Now" icon={Play} exams={exams.live} type="live" emptyMsg="No exams are live right now." accent="border-emerald-200 text-emerald-700" />
            <Section title="Upcoming" icon={Clock} exams={exams.upcoming} type="upcoming" emptyMsg="No upcoming exams scheduled." accent="border-primary-200 text-primary-700" />
            <Section title="Completed" icon={CheckCircle} exams={exams.completed} type="completed" emptyMsg="No completed exams." accent="border-slate-200 text-slate-600" />
          </>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
