import { useEffect, useState } from 'react';
import AdminLayout from '../../components/common/AdminLayout';
import { getAllStudents } from '../../api';
import { Users, Search } from 'lucide-react';

const StudentsList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => { try { const { data } = await getAllStudents(); setStudents(data.students); } catch { /* ignore */ } finally { setLoading(false); } };
    fetch();
  }, []);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.branch?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-primary-600" /> Registered Students</h1>
        <p className="text-sm text-slate-500 mt-0.5">{students.length} total students</p>
      </div>
      <div className="page-content">
        <div className="mb-5"><div className="relative max-w-md"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input id="student-search" placeholder="Search by name, roll, email, branch..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input pl-10" /></div></div>
        {loading ? <div className="flex justify-center py-16"><div className="spinner w-8 h-8"></div></div> : (
          <div className="card"><div className="table-wrapper"><table className="table">
            <thead><tr><th>#</th><th>Name</th><th>Roll Number</th><th>Email</th><th>Branch</th><th>Year</th><th>CGPA</th><th>Joined</th></tr></thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr key={s._id}>
                  <td className="text-slate-400 text-sm">{idx + 1}</td>
                  <td className="font-semibold text-slate-800">{s.name}</td>
                  <td><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-700">{s.rollNumber}</span></td>
                  <td className="text-slate-500 text-sm">{s.email}</td>
                  <td><span className="badge badge-blue">{s.branch}</span></td>
                  <td className="text-center font-medium text-slate-700">Y{s.year}</td>
                  <td className="text-center"><span className={`font-semibold ${s.cgpa >= 8 ? 'text-emerald-600' : s.cgpa >= 6 ? 'text-primary-600' : 'text-amber-600'}`}>{s.cgpa?.toFixed(2)}</span></td>
                  <td className="text-slate-400 text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-slate-400">No students found.</td></tr>}
            </tbody>
          </table></div></div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StudentsList;
