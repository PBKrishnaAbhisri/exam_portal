import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import { getAllExamsAdmin, deleteExam, togglePublishResults, notifyStudentsExam } from '../../api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, BarChart3, Eye, EyeOff, Search, AlertTriangle, X, Mail, Check } from 'lucide-react';

const ExamList = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [notifyingId, setNotifyingId] = useState(null);
  const [notifyProgress, setNotifyProgress] = useState({}); // { [examId]: {sent, total} }
  const [examToDelete, setExamToDelete] = useState(null); // Modal state

  const fetchExams = async () => {
    try {
      const { data } = await getAllExamsAdmin();
      setExams(data.exams || []);
    } catch {
      toast.error('Failed to fetch exams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExams(); }, []);

  const getStatus = (exam) => {
    const now = new Date();
    if (new Date(exam.startTime) > now) return 'upcoming';
    if (new Date(exam.endTime) >= now) return 'live';
    return 'completed';
  };

  const filtered = exams.filter((e) => {
    const matchSearch = (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.examCode || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.subject || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filter === 'all' || getStatus(e) === filter);
  });

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    const id = examToDelete._id;
    setDeletingId(id);
    try {
      await deleteExam(id);
      toast.success('Exam deleted successfully.');
      setExams((prev) => prev.filter((e) => String(e._id) !== String(id)));
      setExamToDelete(null);
    } catch (err) {
      console.error('Delete exam error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete exam.');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublishToggle = async (id, current, endTime) => {
    const isEnded = new Date() >= new Date(endTime);
    let force = false;
    if (!current && !isEnded) {
      const proceed = window.confirm(
        `This exam is scheduled to end on ${new Date(endTime).toLocaleString()}.\n\nPublish results now anyway?`
      );
      if (!proceed) return;
      force = true;
    }
    try {
      const { data } = await togglePublishResults(id, force);
      const newStatus = data.publishResults !== undefined ? data.publishResults : !current;
      setExams((prev) => prev.map((e) => (e._id === id ? { ...e, publishResults: newStatus } : e)));
      toast.success(`Results ${newStatus ? 'published' : 'unpublished (hidden)'}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update publish status.');
    }
  };

  const handleNotify = async (id) => {
    setNotifyingId(id);
    setNotifyProgress(prev => ({ ...prev, [id]: null }));
    try {
      const result = await notifyStudentsExam(id, (progress) => {
        setNotifyProgress(prev => ({ ...prev, [id]: progress }));
      });
      if (result?.sentCount > 0 || result?.notificationsSent) {
        setExams((prev) => prev.map((e) => (e._id === id ? { ...e, notificationsSent: true } : e)));
        toast.success(`✉ Sent ${result.sentCount || 0}/${result.total} emails!`);
      } else if (result?.reason) {
        toast(result.reason, { icon: '⚠️', duration: 6000 });
      } else {
        toast('Notification complete.', { icon: '📧' });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send notifications.');
    } finally {
      setNotifyingId(null);
      setNotifyProgress(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
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
          <Link id="create-exam-btn" to="/admin/exams/create" className="btn-primary">
            <Plus className="w-4 h-4" /> Create Exam
          </Link>
        </div>
      </div>

      <div className="page-content">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="exam-search"
              placeholder="Search by title, code, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'live', 'upcoming', 'completed'].map((f) => (
              <button
                key={f}
                id={`filter-${f}`}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner w-8 h-8"></div></div>
        ) : (
          <div className="card">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Exam</th>
                    <th>Code</th>
                    <th>Eligibility</th>
                    <th>Questions</th>
                    <th>Start Time</th>
                    <th>Status</th>
                    <th>Results</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((exam) => {
                    const status = getStatus(exam);
                    return (
                      <tr key={exam._id}>
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-slate-800">{exam.title}</p>
                            {exam.examType === 'weekly' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-red-100 text-red-700 border border-red-200">
                                Weekly
                              </span>
                            )}
                            {exam.examType === 'monthly' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                Monthly
                              </span>
                            )}
                            {exam.isMultiSection && (
                              <span className="badge badge-purple text-[10px] py-0 px-1.5">
                                Multi ({exam.sections?.length || 0})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{exam.subject || 'No subject'}</p>
                        </td>
                        <td>
                          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">
                            {exam.examCode}
                          </span>
                        </td>
                        <td className="text-xs text-slate-500">
                          <p>{exam.eligibleBranches?.join(', ') || 'All'}</p>
                          <p>Year: {exam.eligibleYears?.join(', ') || 'All'}</p>
                        </td>
                        <td className="text-center font-semibold text-slate-700">
                          {(exam.sections || []).reduce((acc, s) => acc + (s.questions?.length || 0), 0) +
                            (exam.questions?.length || 0)}
                        </td>
                        <td className="text-xs text-slate-500">
                          {new Date(exam.startTime).toLocaleDateString()}
                        </td>
                        <td><span className={statusBadge[status]}>{status}</span></td>
                        <td>
                          {(() => {
                            const ended = new Date() >= new Date(exam.endTime);
                            return (
                              <button
                                id={`publish-${exam._id}`}
                                type="button"
                                onClick={() => handlePublishToggle(exam._id, exam.publishResults, exam.endTime)}
                                title={!ended ? 'Exam has not ended yet' : ''}
                                className={`badge cursor-pointer transition-all ${
                                  exam.publishResults
                                    ? 'badge-green'
                                    : ended
                                    ? 'badge-gray hover:badge-green'
                                    : 'badge-gray opacity-50 cursor-not-allowed'
                                }`}
                              >
                                {exam.publishResults ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                {exam.publishResults ? 'Published' : ended ? 'Hidden' : 'Not Ended'}
                              </button>
                            );
                          })()}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Link
                              id={`edit-exam-${exam._id}`}
                              to={`/admin/exams/${exam._id}`}
                              className="btn-ghost btn-sm text-primary-600"
                              title="Edit Exam"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              id={`notify-exam-${exam._id}`}
                              type="button"
                              onClick={() => handleNotify(exam._id)}
                              disabled={notifyingId === exam._id}
                              className={`btn-sm rounded-lg transition-all flex items-center justify-center ${
                                exam.notificationsSent
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 font-semibold'
                                  : 'btn-ghost text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                              } ${notifyingId === exam._id ? 'min-w-[90px] gap-1' : ''}`}
                              title={
                                exam.notificationsSent
                                  ? 'Email notifications already sent for this exam. Click to re-send.'
                                  : 'Send email notifications to eligible students'
                              }
                            >
                              {notifyingId === exam._id ? (
                                <>
                                  <div className="spinner w-3.5 h-3.5" />
                                  <span className="text-xs font-medium">
                                    {notifyProgress[exam._id]
                                      ? `${notifyProgress[exam._id].sent}/${notifyProgress[exam._id].total}`
                                      : '...'}
                                  </span>
                                </>
                              ) : exam.notificationsSent ? (
                                <span className="flex items-center gap-1 text-xs">
                                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                                  <span className="hidden sm:inline">Sent</span>
                                </span>
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <Link
                              to={`/admin/analytics/${exam._id}`}
                              className="btn-ghost btn-sm text-slate-500"
                              title="Analytics"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              id={`delete-exam-${exam._id}`}
                              type="button"
                              onClick={() => setExamToDelete(exam)}
                              disabled={deletingId === exam._id}
                              className="btn-ghost btn-sm text-red-500 hover:bg-red-50 hover:text-red-700"
                              title="Delete Exam"
                            >
                              {deletingId === exam._id ? (
                                <div className="spinner w-3.5 h-3.5" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-400">
                        {search ? 'No exams match your search.' : 'No exams found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800">Delete Exam</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-slate-700 font-semibold">{examToDelete.title}</strong> (
                  <span className="font-mono text-xs">{examToDelete.examCode}</span>)?
                </p>
                <p className="text-xs text-red-600 mt-2 font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">
                  ⚠️ This will delete all questions, results, and student submissions tied to this exam.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExamToDelete(null)}
                className="btn-secondary"
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              <button
                id="confirm-delete-exam-btn"
                type="button"
                onClick={confirmDeleteExam}
                disabled={Boolean(deletingId)}
                className="btn-danger flex items-center gap-2"
              >
                {deletingId ? (
                  <>
                    <div className="spinner w-4 h-4" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Yes, Delete Exam
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ExamList;
