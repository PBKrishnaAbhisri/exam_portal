import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import { getAllExamsAdmin, getLiveSubmissions } from '../../api';
import { FileText, Users, Activity, Clock, ChevronRight, Plus, BarChart2 } from 'lucide-react';

const AdminDashboard = () => {
  const [exams, setExams] = useState([]);
  const [liveSubmissions, setLiveSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsRes, liveRes] = await Promise.all([getAllExamsAdmin(), getLiveSubmissions()]);
        setExams(examsRes.data.exams);
        setLiveSubmissions(liveRes.data.liveSubmissions);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const now = new Date();
  const upcoming = exams.filter((e) => new Date(e.startTime) > now).length;
  const live = exams.filter((e) => new Date(e.startTime) <= now && new Date(e.endTime) >= now).length;

  const getStatus = (exam) => {
    if (new Date(exam.startTime) > now) return { label: 'Upcoming', cls: 'badge-blue' };
    if (new Date(exam.endTime) >= now) return { label: 'Live', cls: 'badge-green' };
    return { label: 'Completed', cls: 'badge-gray' };
  };

  if (loading) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8"></div></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Overview of all exams and activity</p>
          </div>
          <Link id="dash-create-exam" to="/admin/exams/create" className="btn-primary"><Plus className="w-4 h-4" /> Create Exam</Link>
        </div>
      </div>

      <div className="page-content space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Exams', value: exams.length, icon: FileText, color: 'bg-primary-100 text-primary-600' },
            { label: 'Live Now', value: live, icon: Activity, color: 'bg-emerald-100 text-emerald-600' },
            { label: 'Upcoming', value: upcoming, icon: Clock, color: 'bg-amber-100 text-amber-600' },
            { label: 'Active Students', value: liveSubmissions.length, icon: Users, color: 'bg-violet-100 text-violet-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card">
              <div className={`stat-icon ${color}`}><Icon className="w-5 h-5" /></div>
              <div><p className="text-2xl font-bold text-slate-800">{value}</p><p className="text-sm text-slate-500">{label}</p></div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent Exams</h2>
            <Link to="/admin/exams" className="text-sm text-primary-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Title</th><th>Code</th><th>Questions</th><th>Start Time</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {exams.slice(0, 8).map((exam) => {
                  const status = getStatus(exam);
                  return (
                    <tr key={exam._id}>
                      <td className="font-medium text-slate-800">{exam.title}</td>
                      <td><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-600">{exam.examCode}</span></td>
                      <td className="text-center text-slate-600">{exam.questions?.length || 0}</td>
                      <td className="text-slate-500 text-xs">{new Date(exam.startTime).toLocaleString()}</td>
                      <td><span className={status.cls}>{status.label}</span></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link id={`view-exam-${exam._id}`} to={`/admin/exams/${exam._id}`} className="btn-ghost btn-sm text-primary-600"><ChevronRight className="w-4 h-4" /></Link>
                          <Link to={`/admin/analytics/${exam._id}`} className="btn-ghost btn-sm text-slate-500"><BarChart2 className="w-3.5 h-3.5" /></Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {exams.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400">No exams yet. <Link to="/admin/exams/create" className="text-primary-600">Create one</Link></td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {liveSubmissions.length > 0 && (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Live Activity
              </h2>
              <Link to="/admin/live" className="text-sm text-primary-600 hover:underline">Full monitor</Link>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Student</th><th>Roll</th><th>Exam</th><th>Violations</th><th>Status</th></tr></thead>
                <tbody>
                  {liveSubmissions.slice(0, 5).map((sub) => (
                    <tr key={sub._id}>
                      <td className="font-medium">{sub.studentId?.name}</td>
                      <td className="text-slate-500 text-xs">{sub.studentId?.rollNumber}</td>
                      <td className="text-slate-500">{sub.examId?.title}</td>
                      <td><span className={`badge ${sub.violationCount >= 2 ? 'badge-red' : sub.violationCount >= 1 ? 'badge-yellow' : 'badge-green'}`}>{sub.violationCount}</span></td>
                      <td><span className={`badge ${sub.isLocked ? 'badge-red' : 'badge-green'}`}>{sub.isLocked ? '🔒 Locked' : '● Active'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
