import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import { getAllExamsAdmin } from '../../api';
import { BookOpen, ChevronRight, Calendar, Hash } from 'lucide-react';

const ExamBank = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try { const { data } = await getAllExamsAdmin(); setExams(data.exams); } catch { /* ignore */ } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = exams.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    (e.subject || '').toLowerCase().includes(search.toLowerCase()) ||
    e.examCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="text-xl font-bold text-slate-800">Exam Bank</h1>
        <p className="text-sm text-slate-500 mt-0.5">Browse all stored exams and their questions</p>
      </div>
      <div className="page-content">
        <div className="mb-5"><input placeholder="Search exams..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input max-w-md" /></div>
        {loading ? <div className="flex justify-center py-16"><div className="spinner w-8 h-8"></div></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((exam) => (
              <Link key={exam._id} to={`/admin/exams/${exam._id}`} className="card hover:shadow-md transition-all hover:-translate-y-0.5 group">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary-600" /></div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2">{exam.title}</h3>
                  {exam.subject && <p className="text-sm text-slate-500 mb-3">{exam.subject}</p>}
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="badge badge-blue ml-auto">
                      {(exam.sections || []).reduce((acc, s) => acc + (s.questions?.length || 0), 0) +
                        (exam.questions?.length || 0)}{' '}
                      questions
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && <div className="col-span-3 text-center py-16 text-slate-400"><BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No exams found.</p></div>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ExamBank;
