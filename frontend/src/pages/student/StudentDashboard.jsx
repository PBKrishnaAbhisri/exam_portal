import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StudentLayout from '../../components/common/StudentLayout';
import { useAuth } from '../../context/AuthContext';
import { getEligibleExams, getMySubmission } from '../../api';
import { Clock, Play, CheckCircle, Calendar, Timer, AlertCircle, Lock, List, ChevronLeft, ChevronRight, FileWarning } from 'lucide-react';

// ── Color helpers based on examType ─────────────────────────────────────────
const getExamTypeStyle = (examType, isLive, alreadySubmitted) => {
  if (alreadySubmitted) {
    return {
      cardClass: 'border border-slate-200 bg-white/70 opacity-90',
      iconBg: 'bg-slate-100',
      iconText: 'text-slate-400',
      badge: null,
      liveBadgeCls: 'bg-slate-100 text-slate-600 border border-slate-200',
      btnClass: 'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 transition-all',
    };
  }

  // 1. Weekly: RED color
  if (examType === 'weekly') {
    return {
      cardClass: isLive 
        ? 'border-2 border-red-500 bg-red-50/40 shadow-md shadow-red-100/50' 
        : 'border-2 border-red-300 bg-red-50/20 hover:border-red-400',
      iconBg: 'bg-red-100',
      iconText: 'text-red-600',
      badge: { label: 'Weekly', cls: 'bg-red-100 text-red-700 border border-red-200 font-semibold' },
      liveBadgeCls: 'bg-red-600 text-white animate-pulse shadow-sm',
      btnClass: 'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all',
    };
  }

  // 2. Monthly: BLUE color
  if (examType === 'monthly') {
    return {
      cardClass: isLive 
        ? 'border-2 border-blue-500 bg-blue-50/40 shadow-md shadow-blue-100/50' 
        : 'border-2 border-blue-300 bg-blue-50/20 hover:border-blue-400',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      badge: { label: 'Monthly', cls: 'bg-blue-100 text-blue-700 border border-blue-200 font-semibold' },
      liveBadgeCls: 'bg-blue-600 text-white animate-pulse shadow-sm',
      btnClass: 'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all',
    };
  }

  // 3. None / Standard: LIGHT GREEN color
  return {
    cardClass: isLive 
      ? 'border-2 border-emerald-500 bg-emerald-50/40 shadow-md shadow-emerald-100/50' 
      : 'border-2 border-emerald-300 bg-emerald-50/20 hover:border-emerald-400',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    badge: null,
    liveBadgeCls: 'bg-emerald-600 text-white animate-pulse shadow-sm',
    btnClass: 'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all',
  };
};

const getCalendarDotColor = (examType) => {
  if (examType === 'weekly')  return 'bg-red-500';
  if (examType === 'monthly') return 'bg-blue-500';
  return 'bg-emerald-500';
};

// ── Calendar helpers ──────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const StudentDashboard = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState({ upcoming: [], live: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [submissionStatuses, setSubmissionStatuses] = useState({});
  const [view, setView] = useState('list'); // 'list' | 'calendar'
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const navigate = useNavigate();

  const hasResume = !!user?.resumeUrl;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data } = await getEligibleExams();
        setExams(data);

        const liveExams = data.live || [];
        const statusMap = {};
        await Promise.all(
          liveExams.map(async (exam) => {
            try {
              const { data: sub } = await getMySubmission(exam._id);
              statusMap[exam._id] = sub?.submission?.status ?? null;
            } catch {
              statusMap[exam._id] = null;
            }
          })
        );
        setSubmissionStatuses(statusMap);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  // ── All exams flat list for calendar ─────────────────────────────────────
  const allExams = [
    ...(exams.live     || []).map(e => ({ ...e, _type: 'live' })),
    ...(exams.upcoming || []).map(e => ({ ...e, _type: 'upcoming' })),
    ...(exams.completed|| []).map(e => ({ ...e, _type: 'completed' })),
  ];

  // Build map: "YYYY-MM-DD" → exam[]
  const examsByDate = {};
  allExams.forEach(exam => {
    const d = new Date(exam.startTime);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!examsByDate[key]) examsByDate[key] = [];
    examsByDate[key].push(exam);
  });

  // ── ExamCard ─────────────────────────────────────────────────────────────
  const ExamCard = ({ exam, type }) => {
    const isLive = type === 'live';
    const isCompleted = type === 'completed';
    const subStatus = submissionStatuses[exam._id];
    const alreadySubmitted = subStatus === 'submitted' || subStatus === 'auto-submitted';
    const style = getExamTypeStyle(exam.examType, isLive, alreadySubmitted);

    return (
      <div className={`card transition-all hover:shadow-md ${style.cardClass}`}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.iconBg}`}>
              {alreadySubmitted
                ? <Lock className="w-5 h-5 text-slate-400" />
                : isLive ? <Play className={`w-5 h-5 ${style.iconText}`} />
                : isCompleted ? <CheckCircle className="w-5 h-5 text-slate-500" />
                : <Clock className={`w-5 h-5 ${style.iconText}`} />}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {style.badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${style.badge.cls}`}>
                  {style.badge.label}
                </span>
              )}
              {alreadySubmitted && <span className="badge badge-gray">Submitted</span>}
              {!alreadySubmitted && isLive && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${style.liveBadgeCls}`}>
                  ● Live Now
                </span>
              )}
              {!alreadySubmitted && !isLive && !isCompleted && <span className="badge badge-blue">Upcoming</span>}
              {!alreadySubmitted && isCompleted && <span className="badge badge-gray">Completed</span>}
            </div>
          </div>
          <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2">{exam.title}</h3>
          {exam.subject && <p className="text-sm text-primary-600 font-medium mb-2">{exam.subject}</p>}
          <div className="space-y-1.5 text-xs text-slate-500 mb-4">
            <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(exam.startTime).toLocaleString()}</div>
            <div className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> {exam.duration} min · {exam.marksPerQuestion} mark/Q{exam.negativeMarking && <span className="text-red-500 ml-1">· Negative</span>}</div>
          </div>
          <div className="font-mono text-xs text-slate-400 mb-4">Code: {exam.examCode}</div>

          {isLive && (
            alreadySubmitted ? (
              <Link id={`submitted-${exam._id}`} to={`/student/result/${exam._id}`}
                className={style.btnClass}>
                <CheckCircle className="w-4 h-4" /> View Result
              </Link>
            ) : (
              <Link id={`take-${exam._id}`} to={`/student/exam/${exam._id}/instructions`} className={style.btnClass}>
                <Play className="w-4 h-4" /> Start Exam
              </Link>
            )
          )}
          {isCompleted && (
            <Link id={`result-${exam._id}`} to={`/student/result/${exam._id}`} className="btn-secondary w-full text-center">
              <CheckCircle className="w-4 h-4" /> View Result
            </Link>
          )}
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

  // ── Calendar view ─────────────────────────────────────────────────────────
  const CalendarView = () => {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const prevMonth = () => setCalMonth(({ year, month }) => month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
    const nextMonth = () => setCalMonth(({ year, month }) => month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });

    return (
      <div className="card overflow-hidden">
        {/* Calendar header */}
        <div className="card-header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-slate-800 text-lg">{MONTHS[month]} {year}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" id="cal-prev">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCalMonth({ year: today.getFullYear(), month: today.getMonth() })}
              className="px-3 py-1 text-xs font-semibold rounded-lg hover:bg-primary-50 text-primary-600 transition-colors"
            >
              Today
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" id="cal-next">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {/* Legend */}
          <div className="flex items-center gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Default</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Weekly</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Monthly</span>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-bold text-slate-400 py-2 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[90px] bg-slate-50/50" />;
              const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dayExams = examsByDate[key] || [];
              const isToday = key === todayStr;
              return (
                <div key={key} className={`min-h-[90px] p-1.5 flex flex-col gap-1 transition-colors ${isToday ? 'bg-primary-50/60' : 'hover:bg-slate-50'}`}>
                  <span className={`text-xs font-bold self-start w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-primary-600 text-white' : 'text-slate-600'
                  }`}>{day}</span>
                  {dayExams.map(exam => (
                    <button
                      key={exam._id}
                      title={`${exam.title} — ${new Date(exam.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      onClick={() => {
                        if (exam._type === 'live') navigate(`/student/exam/${exam._id}/instructions`);
                        else if (exam._type === 'completed') navigate(`/student/result/${exam._id}`);
                      }}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight flex items-center gap-1 transition-opacity hover:opacity-80 ${
                        exam.examType === 'weekly'
                          ? 'bg-red-100 text-red-800'
                          : exam.examType === 'monthly'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getCalendarDotColor(exam.examType)}`} />
                      <span className="truncate">{exam.title}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <StudentLayout>

      <div className="page-header flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Exams</h1>
          <p className="text-sm text-slate-500 mt-0.5">Exams eligible for your branch and year</p>
        </div>
        {/* View toggle */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
          <button
            id="view-list"
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              view === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="w-4 h-4" /> List
          </button>
          <button
            id="view-calendar"
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              view === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="w-4 h-4" /> Calendar
          </button>
        </div>
      </div>

      <div className="page-content space-y-8">
        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner w-8 h-8"></div></div>
        ) : view === 'calendar' ? (
          <CalendarView />
        ) : (
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
