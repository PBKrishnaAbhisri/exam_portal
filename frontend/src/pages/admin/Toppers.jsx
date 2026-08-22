import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import { getToppers, getDomains } from '../../api';
import {
  Trophy, Medal, Award, Users, Filter, RotateCcw,
  Sparkles, ChevronRight, ShieldAlert, BookOpen, Tag,
  TrendingUp, CheckCircle2, Crown, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const BRANCHES = ['ALL', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSD', 'OTHER'];
const YEARS = ['ALL', '1', '2', '3', '4'];
const LIMITS = [10, 25, 50, 100];

const Toppers = () => {
  const [toppers, setToppers] = useState([]);
  const [totalRanked, setTotalRanked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [domainCategories, setDomainCategories] = useState([]);

  // Filter state
  const [branch, setBranch] = useState('ALL');
  const [year, setYear] = useState('ALL');
  const [domain, setDomain] = useState('ALL');
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    getDomains()
      .then(({ data }) => setDomainCategories(data.categories || []))
      .catch(() => {});
  }, []);

  const fetchToppers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit };
      if (branch !== 'ALL') params.branch = branch;
      if (year !== 'ALL') params.year = year;
      if (domain !== 'ALL') params.domain = domain;

      const { data } = await getToppers(params);
      setToppers(data.toppers || []);
      setTotalRanked(data.totalRanked || data.toppers?.length || 0);
    } catch {
      toast.error('Failed to load toppers ranking.');
    } finally {
      setLoading(false);
    }
  }, [branch, year, domain, limit]);

  useEffect(() => {
    fetchToppers();
  }, [fetchToppers]);

  const handleResetFilters = () => {
    setBranch('ALL');
    setYear('ALL');
    setDomain('ALL');
    setLimit(10);
  };

  const hasActiveFilters = branch !== 'ALL' || year !== 'ALL' || domain !== 'ALL' || limit !== 10;

  const top1 = toppers[0];
  const top2 = toppers[1];
  const top3 = toppers[2];

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" /> Hall of Fame & Toppers
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Cumulative ranking of top students across all exams, customizable by branch, year, and domain specializations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-purple text-xs font-semibold px-3 py-1 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> {totalRanked} Total Qualifying Candidates
            </span>
          </div>
        </div>
      </div>

      <div className="page-content space-y-6">
        {/* Filters Bar */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-primary-600" /> Filter Ranking Cohort
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Branch Filter */}
            <div>
              <label className="form-label text-xs mb-1">Branch</label>
              <select
                id="toppers-branch-filter"
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
              <label className="form-label text-xs mb-1">Year</label>
              <select
                id="toppers-year-filter"
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
              <label className="form-label text-xs mb-1">Domain</label>
              <select
                id="toppers-domain-filter"
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

            {/* Limit Filter */}
            <div>
              <label className="form-label text-xs mb-1">Display Limit</label>
              <select
                id="toppers-limit-filter"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="form-select text-sm py-2"
              >
                {LIMITS.map((l) => (
                  <option key={l} value={l}>
                    Top {l} Toppers
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── TOP 3 PODIUM HERO ──────────────────────────────────────────────── */}
        {toppers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
            {/* 2nd Place (Silver) */}
            {top2 && (
              <div className="card p-5 bg-gradient-to-b from-slate-50 to-white border-slate-200 text-center relative overflow-hidden order-2 md:order-1 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-lg ring-4 ring-slate-100 shadow-sm">
                  🥈
                </div>
                <span className="badge badge-gray text-xs font-semibold uppercase">2nd Place</span>
                <Link
                  to={`/admin/students/${top2.student._id}`}
                  className="block mt-2 font-bold text-slate-800 text-base hover:text-primary-600 transition-colors truncate"
                >
                  {top2.student.name}
                </Link>
                <p className="text-xs text-slate-400 font-mono">{top2.student.rollNumber || 'N/A'}</p>
                <div className="my-3 py-2 px-3 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-extrabold text-slate-700">{top2.overallAveragePercentage}%</p>
                  <p className="text-[11px] text-slate-400">Cumulative Average Score</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <span>{top2.student.branch} Y{top2.student.year}</span>
                  <span>•</span>
                  <span>{top2.totalExamsAttempted} exams</span>
                </div>
                <Link
                  to={`/admin/students/${top2.student._id}`}
                  className="mt-3 btn-secondary btn-sm w-full text-xs"
                >
                  View Profile
                </Link>
              </div>
            )}

            {/* 1st Place (Gold) */}
            {top1 && (
              <div className="card p-6 bg-gradient-to-b from-amber-500/10 via-amber-50/40 to-white border-amber-300 text-center relative overflow-hidden order-1 md:order-2 shadow-lg ring-2 ring-amber-400/50 md:-translate-y-2">
                <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center font-extrabold text-2xl ring-4 ring-amber-100 shadow-md">
                  👑
                </div>
                <span className="badge badge-yellow text-xs font-bold uppercase tracking-wider px-3 py-1">
                  🏆 Grand Champion (1st)
                </span>
                <Link
                  to={`/admin/students/${top1.student._id}`}
                  className="block mt-2 font-extrabold text-slate-900 text-lg hover:text-primary-600 transition-colors truncate"
                >
                  {top1.student.name}
                </Link>
                <p className="text-xs text-slate-500 font-mono">{top1.student.rollNumber || 'N/A'}</p>
                <div className="my-3 py-2.5 px-4 bg-amber-500/10 border border-amber-300/40 rounded-xl">
                  <p className="text-3xl font-black text-amber-700">{top1.overallAveragePercentage}%</p>
                  <p className="text-[11px] font-semibold text-amber-800">Highest Cumulative Average</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-medium">
                  <span className="badge badge-blue text-[11px]">{top1.student.branch}</span>
                  <span className="badge badge-gray text-[11px]">Year {top1.student.year}</span>
                  <span>•</span>
                  <span>{top1.totalExamsAttempted} Exams Attempted</span>
                </div>
                <Link
                  to={`/admin/students/${top1.student._id}`}
                  className="mt-4 btn-primary btn-sm w-full text-xs bg-amber-600 hover:bg-amber-700 border-amber-600"
                >
                  View Champion Profile →
                </Link>
              </div>
            )}

            {/* 3rd Place (Bronze) */}
            {top3 && (
              <div className="card p-5 bg-gradient-to-b from-orange-50/60 to-white border-orange-200 text-center relative overflow-hidden order-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-orange-200 text-orange-800 flex items-center justify-center font-bold text-lg ring-4 ring-orange-100 shadow-sm">
                  🥉
                </div>
                <span className="badge badge-yellow text-xs font-semibold uppercase">3rd Place</span>
                <Link
                  to={`/admin/students/${top3.student._id}`}
                  className="block mt-2 font-bold text-slate-800 text-base hover:text-primary-600 transition-colors truncate"
                >
                  {top3.student.name}
                </Link>
                <p className="text-xs text-slate-400 font-mono">{top3.student.rollNumber || 'N/A'}</p>
                <div className="my-3 py-2 px-3 bg-orange-50/50 rounded-xl">
                  <p className="text-2xl font-extrabold text-orange-700">{top3.overallAveragePercentage}%</p>
                  <p className="text-[11px] text-slate-400">Cumulative Average Score</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <span>{top3.student.branch} Y{top3.student.year}</span>
                  <span>•</span>
                  <span>{top3.totalExamsAttempted} exams</span>
                </div>
                <Link
                  to={`/admin/students/${top3.student._id}`}
                  className="mt-3 btn-secondary btn-sm w-full text-xs"
                >
                  View Profile
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── LEADERBOARD TABLE ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner w-8 h-8" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-base">
                <Trophy className="w-5 h-5 text-amber-500" /> Overall Top Performers (Top {toppers.length})
              </h2>
              <span className="text-xs text-slate-400">Ranked by Cumulative Percentage & Examination Integrity</span>
            </div>

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Roll Number</th>
                    <th>Branch / Year</th>
                    <th>Assigned Domains</th>
                    <th className="text-center">Exams Attempted</th>
                    <th>Cumulative Average</th>
                    <th>Violations</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {toppers.map((t, idx) => {
                    const studentObj = t.student || {};
                    const isTop1 = idx === 0;
                    const isTop2 = idx === 1;
                    const isTop3 = idx === 2;

                    return (
                      <tr
                        key={studentObj._id || idx}
                        className={`transition-colors hover:bg-primary-50/40 group ${
                          isTop1 ? 'bg-amber-50/20' : isTop2 ? 'bg-slate-50/40' : isTop3 ? 'bg-orange-50/20' : ''
                        }`}
                      >
                        <td>
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-bold ${
                              isTop1
                                ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-200 shadow-sm'
                                : isTop2
                                ? 'bg-slate-200 text-slate-800 ring-2 ring-slate-300'
                                : isTop3
                                ? 'bg-orange-300 text-orange-950 ring-2 ring-orange-200'
                                : 'text-slate-500 bg-slate-100'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>

                        <td>
                          <Link
                            to={`/admin/students/${studentObj._id}`}
                            className="flex items-center gap-2.5 group-hover:text-primary-700 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {studentObj.name
                                ? studentObj.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                                : 'ST'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm group-hover:underline flex items-center gap-1">
                                {studentObj.name}
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary-600" />
                              </p>
                              <p className="text-xs text-slate-400 font-mono">{studentObj.email}</p>
                            </div>
                          </Link>
                        </td>

                        <td>
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                            {studentObj.rollNumber || 'N/A'}
                          </span>
                        </td>

                        <td className="text-xs text-slate-600 font-medium">
                          <span className="badge badge-blue text-[11px] mr-1">{studentObj.branch}</span>
                          <span className="badge badge-gray text-[11px]">Y{studentObj.year}</span>
                        </td>

                        <td>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {studentObj.domains && studentObj.domains.length > 0 ? (
                              studentObj.domains.slice(0, 2).map((d) => (
                                <span key={d} className="badge badge-purple text-[10px]" title={d}>
                                  {d}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">—</span>
                            )}
                            {studentObj.domains && studentObj.domains.length > 2 && (
                              <span className="badge badge-gray text-[10px]">
                                +{studentObj.domains.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="text-center">
                          <span className="font-semibold text-slate-800 text-sm">{t.totalExamsAttempted}</span>
                          <p className="text-[11px] text-emerald-600 font-medium">
                            {t.totalExamsPassed} Passed
                          </p>
                        </td>

                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  parseFloat(t.overallAveragePercentage) >= 80
                                    ? 'bg-emerald-500'
                                    : parseFloat(t.overallAveragePercentage) >= 60
                                    ? 'bg-primary-500'
                                    : parseFloat(t.overallAveragePercentage) >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, t.overallAveragePercentage)}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-700">
                              {t.overallAveragePercentage}%
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`badge text-xs font-semibold ${
                              t.totalViolations === 0
                                ? 'badge-green'
                                : t.totalViolations <= 2
                                ? 'badge-yellow'
                                : 'badge-red'
                            }`}
                          >
                            {t.totalViolations === 0 ? '0 Clean' : `${t.totalViolations} Violations`}
                          </span>
                        </td>

                        <td className="text-right">
                          <Link
                            to={`/admin/students/${studentObj._id}`}
                            className="btn-secondary btn-sm text-xs inline-flex items-center gap-1"
                          >
                            Profile <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {toppers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-slate-400">
                        <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No candidate rankings found for this cohort.</p>
                        {hasActiveFilters && (
                          <button
                            onClick={handleResetFilters}
                            className="btn-secondary btn-sm mt-3 inline-flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
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

export default Toppers;
