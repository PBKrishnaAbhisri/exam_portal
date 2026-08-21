import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import { getAnalytics, exportPDF, exportExcel } from '../../api';
import toast from 'react-hot-toast';
import { Download, Trophy, Users, TrendingUp, FileText, BarChart3 } from 'lucide-react';

const ExamAnalytics = () => {
  const { examId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try { const { data } = await getAnalytics(examId); setAnalytics(data); } catch { toast.error('Failed to load analytics.'); } finally { setLoading(false); }
    };
    fetchData();
  }, [examId]);

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const fn = type === 'pdf' ? exportPDF : exportExcel;
      const { data } = await fn(examId);
      const blob = new Blob([data], { type: type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${analytics?.exam?.title || 'results'}.${type === 'pdf' ? 'pdf' : 'xlsx'}`; a.click();
      URL.revokeObjectURL(url); toast.success(`${type.toUpperCase()} exported!`);
    } catch { toast.error('Export failed.'); } finally { setExporting(null); }
  };

  if (loading) return <AdminLayout><div className="flex justify-center items-center h-64"><div className="spinner w-8 h-8"></div></div></AdminLayout>;
  if (!analytics) return <AdminLayout><div className="page-content text-slate-500">Analytics not available.</div></AdminLayout>;

  const { exam, totalStudents, averageScore, highestScore, leaderboard, distribution } = analytics;
  const distEntries = Object.entries(distribution || {});
  const maxDist = Math.max(...distEntries.map(([, v]) => v), 1);

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="flex items-start justify-between">
          <div><h1 className="text-xl font-bold text-slate-800">{exam?.title}</h1><p className="text-sm text-slate-500 mt-0.5">{exam?.examCode} · {exam?.subject}</p></div>
          <div className="flex gap-2">
            <button id="export-excel" onClick={() => handleExport('excel')} disabled={exporting === 'excel'} className="btn-secondary">{exporting === 'excel' ? <div className="spinner" /> : <><Download className="w-4 h-4" /> Excel</>}</button>
            <button id="export-pdf" onClick={() => handleExport('pdf')} disabled={exporting === 'pdf'} className="btn-primary">{exporting === 'pdf' ? <div className="spinner" /> : <><Download className="w-4 h-4" /> PDF</>}</button>
          </div>
        </div>
      </div>
      <div className="page-content space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Attempted', value: totalStudents, icon: Users, color: 'bg-primary-100 text-primary-600' },
            { label: 'Average Score', value: `${averageScore}/${exam?.maxPossibleScore || 0}`, icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600' },
            { label: 'Highest Score', value: `${highestScore}/${exam?.maxPossibleScore || 0}`, icon: Trophy, color: 'bg-amber-100 text-amber-600' },
            { label: 'Total Questions', value: exam?.totalQuestions || 0, icon: FileText, color: 'bg-violet-100 text-violet-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card"><div className={`stat-icon ${color}`}><Icon className="w-5 h-5" /></div><div><p className="text-xl font-bold text-slate-800">{value}</p><p className="text-xs text-slate-500">{label}</p></div></div>
          ))}
        </div>

        {distEntries.length > 0 && (
          <div className="card">
            <div className="card-header"><h2 className="font-semibold text-slate-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary-500" /> Grade Distribution</h2></div>
            <div className="card-body space-y-3">
              {distEntries.map(([grade, count]) => {
                const pct = totalStudents > 0 ? ((count / totalStudents) * 100).toFixed(0) : 0;
                const gc = grade.startsWith('A') ? 'bg-emerald-500' : grade.startsWith('B') ? 'bg-primary-500' : grade.startsWith('C') ? 'bg-amber-500' : 'bg-red-500';
                return (<div key={grade}><div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-slate-700">{grade}</span><span className="text-sm text-slate-500">{count} ({pct}%)</span></div><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${gc}`} style={{ width: `${(count / maxDist) * 100}%` }} /></div></div>);
              })}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-slate-800 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Leaderboard</h2></div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Rank</th><th>Student</th><th>Roll</th><th>Branch/Year</th><th>Score</th><th>%</th><th>Violations</th></tr></thead>
              <tbody>
                {leaderboard?.map((e, idx) => (
                  <tr key={e.student?._id || idx}>
                    <td><span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-100 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-500'}`}>{idx + 1}</span></td>
                    <td><p className="font-medium text-slate-800">{e.student?.name}</p><p className="text-xs text-slate-400">{e.student?.email}</p></td>
                    <td className="text-slate-500 text-sm">{e.student?.rollNumber}</td>
                    <td className="text-slate-500 text-sm">{e.student?.branch} / Y{e.student?.year}</td>
                    <td className="font-semibold text-slate-800">{e.totalScore} / {e.maxPossibleScore}</td>
                    <td><div className="flex items-center gap-2"><div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${parseFloat(e.percentage) >= 80 ? 'bg-emerald-500' : parseFloat(e.percentage) >= 60 ? 'bg-primary-500' : parseFloat(e.percentage) >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${e.percentage}%` }} /></div><span className="text-sm font-medium">{e.percentage}%</span></div></td>
                    <td><span className={`badge ${e.violationCount === 0 ? 'badge-green' : e.violationCount <= 1 ? 'badge-yellow' : 'badge-red'}`}>{e.violationCount}</span></td>
                  </tr>
                ))}
                {(!leaderboard || leaderboard.length === 0) && <tr><td colSpan={7} className="text-center py-12 text-slate-400">No submissions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ExamAnalytics;
