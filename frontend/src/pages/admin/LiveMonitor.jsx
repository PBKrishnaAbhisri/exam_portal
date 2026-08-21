import { useEffect, useState } from 'react';
import AdminLayout from '../../components/common/AdminLayout';
import { getLiveSubmissions } from '../../api';
import { RefreshCw, Shield, Lock, Eye } from 'lucide-react';

const LiveMonitor = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLive = async () => {
    try { const { data } = await getLiveSubmissions(); setSubmissions(data.liveSubmissions); } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchLive();
    if (autoRefresh) { const interval = setInterval(fetchLive, 10000); return () => clearInterval(interval); }
  }, [autoRefresh]);

  const getSeverity = (count, threshold) => {
    if (count === 0) return { cls: 'badge-green', label: 'Clean' };
    if (count / threshold < 0.5) return { cls: 'badge-yellow', label: `${count} violation${count > 1 ? 's' : ''}` };
    if (count / threshold < 1) return { cls: 'badge-red', label: `⚠ ${count} violations` };
    return { cls: 'badge-red', label: '🔒 Locked' };
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span> Live Monitor</h1>
            <p className="text-sm text-slate-500 mt-0.5">{submissions.length} active student{submissions.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="w-4 h-4 rounded text-primary-600" /> Auto-refresh (10s)
            </label>
            <button onClick={fetchLive} className="btn-secondary btn-sm"><RefreshCw className="w-4 h-4" /> Refresh</button>
          </div>
        </div>
      </div>
      <div className="page-content">
        {loading ? <div className="flex justify-center py-16"><div className="spinner w-8 h-8"></div></div> : submissions.length === 0 ? (
          <div className="card"><div className="card-body flex flex-col items-center py-20 text-slate-400"><Shield className="w-12 h-12 mb-4 opacity-30" /><p className="font-medium">No active exams right now</p></div></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              {submissions.map((sub) => {
                const threshold = sub.examId?.violationThreshold || 3;
                const severity = getSeverity(sub.violationCount, threshold);
                return (
                  <div key={sub._id} onClick={() => setSelectedSub(sub)} className={`card cursor-pointer transition-all hover:shadow-md ${selectedSub?._id === sub._id ? 'ring-2 ring-primary-400' : ''}`}>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${sub.isLocked ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>{sub.studentId?.name?.[0]?.toUpperCase()}</div>
                        <div><p className="font-semibold text-slate-800 text-sm">{sub.studentId?.name}</p><p className="text-xs text-slate-500">{sub.studentId?.rollNumber} · {sub.studentId?.branch}</p></div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-700">{sub.examId?.title?.slice(0, 30)}</p>
                        <div className="flex items-center gap-2 mt-1 justify-end"><span className={severity.cls}>{severity.label}</span>{sub.isLocked && <Lock className="w-3.5 h-3.5 text-red-500" />}</div>
                      </div>
                    </div>
                    <div className="px-4 pb-3"><div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${sub.violationCount === 0 ? 'bg-emerald-400' : sub.violationCount / threshold < 0.66 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (sub.violationCount / threshold) * 100)}%` }} /></div></div>
                  </div>
                );
              })}
            </div>
            <div className="card h-fit sticky top-20">
              {selectedSub ? (
                <>
                  <div className="card-header"><h3 className="font-semibold text-slate-800">Violation Details</h3><p className="text-sm text-slate-500 mt-0.5">{selectedSub.studentId?.name}</p></div>
                  <div className="card-body space-y-3">
                    <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Violations</span><span className={`font-bold text-lg ${selectedSub.violationCount >= (selectedSub.examId?.violationThreshold || 3) ? 'text-red-600' : 'text-amber-600'}`}>{selectedSub.violationCount}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Status</span><span className={`badge ${selectedSub.isLocked ? 'badge-red' : 'badge-green'}`}>{selectedSub.isLocked ? '🔒 Locked' : '● Active'}</span></div>
                    {selectedSub.violations?.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Log</p>
                        {selectedSub.violations.map((v, idx) => (
                          <div key={idx} className="bg-red-50 rounded-lg p-2.5">
                            <div className="flex items-center justify-between"><span className="text-xs font-medium text-red-700">{v.type?.replace(/-/g, ' ')}</span><span className="text-xs text-red-400">{new Date(v.timestamp).toLocaleTimeString()}</span></div>
                            {v.description && <p className="text-xs text-red-600 mt-0.5">{v.description}</p>}
                            {v.evidenceSnapshot && <img src={v.evidenceSnapshot} alt="Evidence" className="mt-2 rounded-md w-full max-h-24 object-cover" />}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-slate-400 text-center py-4">No violations recorded</p>}
                  </div>
                </>
              ) : (
                <div className="card-body text-center py-12"><Eye className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-slate-500 text-sm">Select a student to view details</p></div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default LiveMonitor;
