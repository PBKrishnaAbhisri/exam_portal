import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import { getAllExamsAdmin, deleteExam, togglePublishResults } from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, BarChart3, Eye, EyeOff, Search } from 'lucide-react';

const ExamList = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  const fetchExams = async () => {
    try {
      const { data } = await getAllExamsAdmin();
      setExams(data.exams);
    } catch { toast.error('Failed to fetch exams.'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchExams(); }, []);

  const getStatus = (exam) => {
    const now = new Date();
    if (new Date(exam.startTime) > now) return 'upcoming';
    if (new Date(exam.endTime) >= now) return 'live';
    return 'completed';
  };

  const filtered = exams.filter((e) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.examCode.toLowerCase().includes(search.toLowerCase()) ||
      (e.subject || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filter === 'all' || getStatus(e) === filter);
  });

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this exam? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await deleteExam(id);
      toast.success('Exam deleted.');
      setExams(exams.filter((e) => e._id !== id));
    } catch { toast.error('Failed to delete exam.'); } finally { setDeletingId(null); }
  };

  const handlePublishToggle = async (id, current) => {
    try {
      await togglePublishResults(id);
      setExams(exams.map((e) => e._id === id ? { ...e, publishResults: !current } : e));
      toast.success(`Results ${!current ? 'published' : 'unpublished'}.`);
    } catch { toast.error('Failed to update.'); }
  };

  const statusBadge = { upcoming: 'badge-blue', live: 'badge-green', completed: 'badge-gray' };

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">All Exams</h1>
            <p className="text-sm text-slate-500 mt-0.5">{exams.length} exams total</p>
          </div>
          <Link id="create-exam-btn" to="/admin/exams/create" className="btn-primary"><Plus className="w-4 h-4" /> Create Exam</Link>
        </div>
      </div>

      <div className="page-content">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input id="exam-search" placeholder="Search by title, code, subject..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="form-input pl-10" />
          </div>
          <div className="flex gap-2">
            {['all', 'live', 'upcoming', 'completed'].map((f) => (
              <button key={f} id={`filter-${f}`} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="flex justify-center py-16"><div className="spinner w-8 h-8"></div></div> : (
          <div className="card">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Exam</th><th>Code</th><th>Eligibility</th><th>Questions</th><th>Start Time</th><th>Status</th><th>Results</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map((exam) => {
                    const status = getStatus(exam);
                    return (
                      <tr key={exam._id}>
                        <td><p className="font-semibold text-slate-800">{exam.title}</p><p className="text-xs text-slate-400">{exam.subject || 'No subject'}</p></td>
                        <td><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">{exam.examCode}</span></td>
                        <td className="text-xs text-slate-500"><p>{exam.eligibleBranches?.join(', ') || 'All'}</p><p>Year: {exam.eligibleYears?.join(', ') || 'All'}</p></td>
                        <td className="text-center font-semibold text-slate-700">{exam.questions?.length || 0}</td>
                        <td className="text-xs text-slate-500">{new Date(exam.startTime).toLocaleDateString()}</td>
                        <td><span className={statusBadge[status]}>{status}</span></td>
                        <td>
                          <button id={`publish-${exam._id}`} onClick={() => handlePublishToggle(exam._id, exam.publishResults)}
                            className={`badge cursor-pointer ${exam.publishResults ? 'badge-green' : 'badge-gray'}`}>
                            {exam.publishResults ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {exam.publishResults ? 'Published' : 'Hidden'}
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Link id={`edit-exam-${exam._id}`} to={`/admin/exams/${exam._id}`} className="btn-ghost btn-sm text-primary-600"><Edit className="w-3.5 h-3.5" /></Link>
                            <Link to={`/admin/analytics/${exam._id}`} className="btn-ghost btn-sm text-slate-500"><BarChart3 className="w-3.5 h-3.5" /></Link>
                            <button id={`delete-exam-${exam._id}`} onClick={() => handleDelete(exam._id)} disabled={deletingId === exam._id} className="btn-ghost btn-sm text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-16 text-slate-400">{search ? 'No exams match your search.' : 'No exams found.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ExamList;
