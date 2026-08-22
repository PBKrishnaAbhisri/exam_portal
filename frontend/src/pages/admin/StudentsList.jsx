import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import { getAllStudents, getDomains } from '../../api';
import {
  Users, Search, Filter, RotateCcw, ChevronRight,
  GraduationCap, Award, ShieldAlert, BookOpen, Tag, CheckCircle2
} from 'lucide-react';

const BRANCHES = ['ALL', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSD', 'OTHER'];
const YEARS = ['ALL', '1', '2', '3', '4'];
const STATUSES = ['ALL', 'active', 'alumni'];

const StudentsList = () => {
  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [domainCategories, setDomainCategories] = useState([]);
  const [allDomainOptions, setAllDomainOptions] = useState([]);

  // Filter state
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('ALL');
  const [year, setYear] = useState('ALL');
  const [domain, setDomain] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  // Load domain list on mount
  useEffect(() => {
    getDomains()
      .then(({ data }) => {
        setDomainCategories(data.categories || []);
        const flattened = (data.categories || []).flatMap((c) => c.domains);
        setAllDomainOptions(Array.from(new Set(flattened)));
      })
      .catch(() => {});
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (branch !== 'ALL') params.branch = branch;
      if (year !== 'ALL') params.year = year;
      if (domain !== 'ALL') params.domain = domain;
      if (status !== 'ALL') params.status = status;
      if (search.trim()) params.search = search.trim();

      const { data } = await getAllStudents(params);
      setStudents(data.students || []);
      setTotalCount(data.total || data.students?.length || 0);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  }, [branch, year, domain, status, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  const handleResetFilters = () => {
    setSearch('');
    setBranch('ALL');
    setYear('ALL');
    setDomain('ALL');
    setStatus('ALL');
  };

  const hasActiveFilters =
    branch !== 'ALL' || year !== 'ALL' || domain !== 'ALL' || status !== 'ALL' || search.trim() !== '';

  const activeCount = students.filter((s) => s.status === 'active').length;
  const alumniCount = students.filter((s) => s.status === 'alumni').length;
  const totalExamsAcross = students.reduce((acc, s) => acc + (s.totalExams || 0), 0);

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" /> Students Management
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Filter and view detailed performance, domain specializations, and violation logs per student.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-blue text-xs font-semibold px-3 py-1">
              {students.length} Student{students.length !== 1 ? 's' : ''} Displayed
            </span>
          </div>
        </div>
      </div>

      <div className="page-content space-y-5">
        {/* KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total In View</p>
              <p className="text-xl font-bold text-slate-800">{students.length}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Active Students</p>
              <p className="text-xl font-bold text-slate-800">{activeCount}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Alumni</p>
              <p className="text-xl font-bold text-slate-800">{alumniCount}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Exam Attempts</p>
              <p className="text-xl font-bold text-slate-800">{totalExamsAcross}</p>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-primary-600" /> Filter Students
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="student-search-input"
                placeholder="Search name, roll, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10 text-sm py-2"
              />
            </div>

            {/* Branch Filter */}
            <div>
              <select
                id="student-branch-filter"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="form-select text-sm py-2"
              >
                <option value="ALL">All Branches</option>
                {BRANCHES.filter((b) => b !== 'ALL').map((b) => (
                  <option key={b} value={b}>
                    {b} Branch
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <select
                id="student-year-filter"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="form-select text-sm py-2"
              >
                <option value="ALL">All Years</option>
                {YEARS.filter((y) => y !== 'ALL').map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Domain Filter */}
            <div>
              <select
                id="student-domain-filter"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="form-select text-sm py-2"
              >
                <option value="ALL">All Domains</option>
                {domainCategories.map((cat) => (
                  <optgroup key={cat.category} label={cat.category}>
                    {cat.domains.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                id="student-status-filter"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-select text-sm py-2"
              >
                <option value="ALL">All Statuses</option>
                <option value="active">Active Students</option>
                <option value="alumni">Alumni</option>
              </select>
            </div>
          </div>
        </div>

        {/* Students Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner w-8 h-8" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll Number</th>
                    <th>Branch / Year</th>
                    <th>Assigned Domains</th>
                    <th className="text-center">Exams</th>
                    <th className="text-center">Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => {
                    const initials = s.name
                      ? s.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()
                      : 'ST';

                    return (
                      <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                              <p className="text-xs text-slate-400 font-mono">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 font-semibold border border-slate-200/60">
                            {s.rollNumber || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="badge badge-blue font-semibold text-xs">{s.branch}</span>
                            <span className="badge badge-gray text-xs">Y{s.year}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {s.domains && s.domains.length > 0 ? (
                              s.domains.slice(0, 2).map((d) => (
                                <span
                                  key={d}
                                  className="badge badge-purple text-[11px] font-medium"
                                  title={d}
                                >
                                  {d}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">No domains assigned</span>
                            )}
                            {s.domains && s.domains.length > 2 && (
                              <span className="badge badge-gray text-[10px]" title={s.domains.slice(2).join(', ')}>
                                +{s.domains.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="font-semibold text-slate-800 text-sm">{s.totalExams || 0}</span>
                          {s.totalViolations > 0 && (
                            <p className="text-[11px] text-red-500 font-medium flex items-center justify-center gap-0.5 mt-0.5">
                              <ShieldAlert className="w-3 h-3" /> {s.totalViolations}v
                            </p>
                          )}
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge text-xs font-semibold ${
                              s.status === 'active' ? 'badge-green' : 'badge-gray'
                            }`}
                          >
                            {s.status === 'active' ? '● Active' : '○ Alumni'}
                          </span>
                        </td>
                        <td className="text-right">
                          <Link
                            id={`view-student-${s._id}`}
                            to={`/admin/students/${s._id}`}
                            className="btn-secondary btn-sm inline-flex items-center gap-1 text-xs"
                          >
                            Profile <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-400">
                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No students match your filter criteria.</p>
                        {hasActiveFilters && (
                          <button
                            onClick={handleResetFilters}
                            className="btn-secondary btn-sm mt-3 inline-flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default StudentsList;
