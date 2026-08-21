import { useEffect, useState } from 'react';
import AdminLayout from '../../components/common/AdminLayout';
import { getReviewQueue, resolveReview } from '../../api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react';

const ManualReview = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState({});

  useEffect(() => {
    const fetch = async () => { try { const { data } = await getReviewQueue(); setItems(data.reviewItems); } catch { toast.error('Failed to load review queue.'); } finally { setLoading(false); } };
    fetch();
  }, []);

  const handleResolve = async (item, isCorrect) => {
    const key = `${item.submissionId}-${item.questionId}`;
    setResolving((p) => ({ ...p, [key]: true }));
    try {
      const manualScore = isCorrect ? item.examId?.marksPerQuestion || 1 : 0;
      await resolveReview(item.submissionId, item.questionId, { manualScore, isCorrect, manualReviewNote: isCorrect ? 'Manually approved' : 'Manually rejected' });
      toast.success(`Marked as ${isCorrect ? 'correct' : 'incorrect'}.`);
      setItems((p) => p.filter((i) => !(i.submissionId === item.submissionId && i.questionId === item.questionId)));
    } catch { toast.error('Failed to resolve.'); } finally { setResolving((p) => ({ ...p, [key]: false })); }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="text-xl font-bold text-slate-800">Manual Review Queue</h1>
        <p className="text-sm text-slate-500 mt-0.5">{items.length} answer{items.length !== 1 ? 's' : ''} pending review</p>
      </div>
      <div className="page-content">
        {loading ? <div className="flex justify-center py-16"><div className="spinner w-8 h-8"></div></div> : items.length === 0 ? (
          <div className="card"><div className="card-body flex flex-col items-center py-20"><CheckCircle className="w-12 h-12 text-emerald-300 mb-4" /><p className="font-semibold text-slate-700">All clear!</p><p className="text-slate-400 text-sm mt-1">No fill-in-the-blank answers pending review</p></div></div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const key = `${item.submissionId}-${item.questionId}`;
              return (
                <div key={key} className="card">
                  <div className="card-body">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="font-semibold text-slate-800">{item.studentId?.name}</span>
                          <span className="text-xs text-slate-400">{item.studentId?.rollNumber}</span>
                          <span className="badge badge-blue">{item.examId?.title?.slice(0, 30)}</span>
                          <span className="badge badge-yellow">FILL BLANK</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4">
                          <p className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> Student's Answer</p>
                          <p className="text-slate-800 font-medium">"{item.textResponse || '(blank)'}"</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button id={`approve-${key}`} onClick={() => handleResolve(item, true)} disabled={resolving[key]} className="btn-primary"><CheckCircle className="w-4 h-4" /> Correct</button>
                        <button id={`reject-${key}`} onClick={() => handleResolve(item, false)} disabled={resolving[key]} className="btn-danger"><XCircle className="w-4 h-4" /> Incorrect</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManualReview;
