import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import { getLiveSubmissions, adminUnlockStudent } from '../../api';
import {
  RefreshCw, Shield, Lock, Eye, AlertTriangle, CheckCircle2,
  Users, Smartphone, ExternalLink, X, Unlock, Search, Filter,
  Clock, Maximize2, Layers, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

const LiveMonitor = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'CLEAN' | 'WARNING' | 'LOCKED'
  const [examFilter, setExamFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [unlockingId, setUnlockingId] = useState(null);
  const [zoomSnapshot, setZoomSnapshot] = useState(null);

  const fetchLive = useCallback(async () => {
    try {
      const { data } = await getLiveSubmissions();
      const liveList = data.liveSubmissions || [];
      setSubmissions(liveList);

      // If a student is currently selected in the drawer, keep their data fresh
      if (selectedSub) {
        const updated = liveList.find((s) => s._id === selectedSub._id);
        if (updated) {
          setSelectedSub(updated);
        }
      }
    } catch {
      // Ignore background network blips
    } finally {
      setLoading(false);
    }
  }, [selectedSub]);

  useEffect(() => {
    fetchLive();
  }, [fetchLive]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLive, 2500);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchLive]);

  // Extract unique exams for the filter dropdown
  const uniqueExams = useMemo(() => {
    const map = new Map();
    submissions.forEach((s) => {
      if (s.examId?._id) {
        map.set(s.examId._id, s.examId);
      }
    });
    return Array.from(map.values());
  }, [submissions]);

  // Handle direct admin unlock
  const handleUnlockCandidate = async (subId) => {
    setUnlockingId(subId);
    try {
      await adminUnlockStudent(subId);
      toast.success('Candidate unlocked successfully.');
      await fetchLive();
    } catch (err) {
      toast.error('Failed to unlock student session.');
    } finally {
      setUnlockingId(null);
    }
  };

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const threshold = sub.examId?.violationThreshold || 3;
      const vCount = sub.violationCount || 0;

      // Status filter
      if (statusFilter === 'LOCKED' && !sub.isLocked) return false;
      if (statusFilter === 'WARNING' && (vCount === 0 || sub.isLocked)) return false;
      if (statusFilter === 'CLEAN' && (vCount > 0 || sub.isLocked)) return false;

      // Exam filter
      if (examFilter !== 'ALL' && sub.examId?._id !== examFilter) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = sub.studentId?.name?.toLowerCase() || '';
        const roll = sub.studentId?.rollNumber?.toLowerCase() || '';
        const email = sub.studentId?.email?.toLowerCase() || '';
        if (!name.includes(q) && !roll.includes(q) && !email.includes(q)) return false;
      }

      return true;
    });
  }, [submissions, statusFilter, examFilter, search]);

  // Metric counts
  const { cleanCount, warningCount, lockedCount } = useMemo(() => {
    let clean = 0;
    let warn = 0;
    let locked = 0;

    submissions.forEach((s) => {
      if (s.isLocked) locked++;
      else if ((s.violationCount || 0) > 0) warn++;
      else clean++;
    });

    return { cleanCount: clean, warningCount: warn, lockedCount: locked };
  }, [submissions]);

  // Helper for violation tag style
  const getViolationBadgeStyle = (type) => {
    switch (type) {
      case 'phone-detected':
        return 'bg-red-500 text-white';
      case 'multiple-faces':
        return 'bg-orange-500 text-white';
      case 'face-missing':
        return 'bg-amber-500 text-white';
      case 'tab-switch':
        return 'bg-purple-600 text-white';
      case 'fullscreen-exit':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  return (
    <AdminLayout>
      {/* ── IMAGE LIGHTBOX ZOOM MODAL ─────────────────────────────────────── */}
      {zoomSnapshot && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setZoomSnapshot(null)}
        >
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 animate-scale-up">
            <button
              onClick={() => setZoomSnapshot(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomSnapshot}
              alt="High-Res Evidence"
              className="w-full h-auto rounded-xl object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Live Proctoring Command Center
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Real-time monitoring of active candidate examination sessions, integrity alerts, and violation incidents.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer shadow-sm hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
              Auto-sync (2.5s)
            </label>
            <button
              onClick={fetchLive}
              className="btn-secondary btn-sm text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync Now
            </button>
          </div>
        </div>
      </div>

      <div className="page-content space-y-6">
        {/* ── KPI METRICS CARDS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setStatusFilter('ALL')}
            className={`card p-4 flex items-center gap-3.5 cursor-pointer transition-all ${
              statusFilter === 'ALL' ? 'ring-2 ring-primary-500 bg-primary-50/20' : 'hover:shadow-md'
            }`}
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Online</p>
              <p className="text-2xl font-extrabold text-slate-800">{submissions.length}</p>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('CLEAN')}
            className={`card p-4 flex items-center gap-3.5 cursor-pointer transition-all ${
              statusFilter === 'CLEAN' ? 'ring-2 ring-emerald-500 bg-emerald-50/20' : 'hover:shadow-md'
            }`}
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Clean Integrity</p>
              <p className="text-2xl font-extrabold text-emerald-600">{cleanCount}</p>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('WARNING')}
            className={`card p-4 flex items-center gap-3.5 cursor-pointer transition-all ${
              statusFilter === 'WARNING' ? 'ring-2 ring-amber-500 bg-amber-50/20' : 'hover:shadow-md'
            }`}
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Warning Flagged</p>
              <p className="text-2xl font-extrabold text-amber-600">{warningCount}</p>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('LOCKED')}
            className={`card p-4 flex items-center gap-3.5 cursor-pointer transition-all ${
              statusFilter === 'LOCKED' ? 'ring-2 ring-red-500 bg-red-50/20' : 'hover:shadow-md'
            }`}
          >
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Locked Sessions</p>
              <p className="text-2xl font-extrabold text-red-600">{lockedCount}</p>
            </div>
          </div>
        </div>

        {/* ── FILTER & SEARCH BAR ────────────────────────────────────────────── */}
        <div className="card p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="live-search-input"
                placeholder="Search candidate by name, roll number, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10 text-sm py-2"
              />
            </div>

            {/* Exam Filter Dropdown */}
            <div className="sm:max-w-xs w-full">
              <select
                id="live-exam-filter"
                value={examFilter}
                onChange={(e) => setExamFilter(e.target.value)}
                className="form-select text-sm py-2"
              >
                <option value="ALL">All Active Exams ({uniqueExams.length})</option>
                {uniqueExams.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.examCode} · {ex.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
            {[
              { key: 'ALL', label: 'All Candidates', count: submissions.length },
              { key: 'CLEAN', label: '● Clean', count: cleanCount },
              { key: 'WARNING', label: '⚠ Warning', count: warningCount },
              { key: 'LOCKED', label: '🔒 Locked', count: lockedCount },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === key
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* ── MAIN WORKSPACE: GRID + INCIDENT DRAWER ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT: CANDIDATES GRID ────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex justify-center py-24">
                <div className="spinner w-8 h-8" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="card p-12 text-center text-slate-400">
                <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-600 text-base">No Active Candidates Found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Candidates currently sitting exams with active heartbeats will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredSubmissions.map((sub) => {
                  const threshold = sub.examId?.violationThreshold || 3;
                  const vCount = sub.violationCount || 0;
                  const isSelected = selectedSub?._id === sub._id;
                  const isLocked = sub.isLocked || vCount >= threshold;
                  const isWarning = vCount > 0 && !isLocked;
                  const latestViolation = sub.violations && sub.violations.length > 0
                    ? sub.violations[sub.violations.length - 1]
                    : null;

                  return (
                    <div
                      key={sub._id}
                      onClick={() => setSelectedSub(sub)}
                      className={`card p-4 transition-all cursor-pointer relative overflow-hidden border-2 ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50/30 shadow-lg ring-2 ring-primary-200'
                          : isLocked
                          ? 'border-red-300 bg-red-50/20 hover:border-red-400'
                          : isWarning
                          ? 'border-amber-200 bg-amber-50/10 hover:border-amber-300'
                          : 'border-slate-100 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      {/* Top status & unlock */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm ${
                              isLocked
                                ? 'bg-red-600 text-white'
                                : isWarning
                                ? 'bg-amber-500 text-white'
                                : 'bg-gradient-to-tr from-primary-600 to-indigo-600 text-white'
                            }`}
                          >
                            {sub.studentId?.name
                              ? sub.studentId.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                              : 'ST'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm leading-snug truncate max-w-[150px]">
                              {sub.studentId?.name}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              {sub.studentId?.rollNumber || 'N/A'} • {sub.studentId?.branch}
                            </p>
                          </div>
                        </div>

                        <div>
                          {isLocked ? (
                            <span className="badge badge-red font-bold text-xs flex items-center gap-1 shadow-sm">
                              <Lock className="w-3 h-3" /> LOCKED
                            </span>
                          ) : isWarning ? (
                            <span className="badge badge-yellow font-bold text-xs flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {vCount} Alert{vCount !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="badge badge-green font-semibold text-xs flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Exam Title & Section */}
                      <div className="bg-slate-50 rounded-xl p-2 mb-3 border border-slate-100">
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {sub.examId?.title || 'Exam'}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5 font-mono">
                          <span>{sub.examId?.examCode}</span>
                          {sub.examId?.isMultiSection && (
                            <span className="text-purple-600 font-medium flex items-center gap-1">
                              <Layers className="w-3 h-3" /> Sec {(sub.currentSection || 0) + 1}/{sub.examId.sections?.length || 1}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Violation Meter Bar */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-medium text-slate-500">Integrity Risk</span>
                          <span
                            className={`font-bold text-[11px] ${
                              isLocked ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {vCount} / {threshold} Violations
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isLocked
                                ? 'bg-red-500'
                                : vCount / threshold >= 0.66
                                ? 'bg-orange-500'
                                : vCount > 0
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, (vCount / threshold) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Latest Incident Tag */}
                      {latestViolation ? (
                        <div className="text-[11px] text-red-700 bg-red-50 border border-red-200/60 rounded-lg p-1.5 flex items-center justify-between gap-1 mb-2">
                          <span className="font-semibold truncate">
                            ⚠ {latestViolation.type?.replace(/-/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {new Date(latestViolation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg p-1.5 text-center font-medium mb-2">
                          ✓ No suspicious behavior detected
                        </div>
                      )}

                      {/* Card Bottom Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSub(sub);
                          }}
                          className="text-primary-600 font-semibold hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Log ({sub.violations?.length || 0})
                        </button>

                        {isLocked && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnlockCandidate(sub._id);
                            }}
                            disabled={unlockingId === sub._id}
                            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm"
                          >
                            <Unlock className="w-3 h-3" />
                            {unlockingId === sub._id ? 'Unlocking...' : 'Unlock'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT: REVERSE-CHRONOLOGICAL VIOLATIONS INCIDENT DRAWER ─────── */}
          <div className="card h-fit sticky top-20 border border-slate-200 overflow-hidden shadow-md">
            {selectedSub ? (
              <div>
                {/* Header */}
                <div className="p-4 bg-slate-900 text-white flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold text-sm">
                      {selectedSub.studentId?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{selectedSub.studentId?.name}</h3>
                      <p className="text-xs text-slate-300 font-mono">
                        {selectedSub.studentId?.rollNumber} • {selectedSub.studentId?.branch} Y{selectedSub.studentId?.year}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSub(null)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Candidate Overview Bar */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Session Status:</span>
                    <span
                      className={`badge font-bold text-xs ${
                        selectedSub.isLocked ? 'badge-red' : 'badge-green'
                      }`}
                    >
                      {selectedSub.isLocked ? '🔒 Exam Locked' : '● Live Examination'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Total Violations:</span>
                    <span
                      className={`font-bold text-sm ${
                        selectedSub.violationCount >= (selectedSub.examId?.violationThreshold || 3)
                          ? 'text-red-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {selectedSub.violationCount || 0} / {selectedSub.examId?.violationThreshold || 3}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {selectedSub.isLocked && (
                      <button
                        onClick={() => handleUnlockCandidate(selectedSub._id)}
                        disabled={unlockingId === selectedSub._id}
                        className="btn-danger btn-sm w-full text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        {unlockingId === selectedSub._id ? 'Unlocking Session...' : 'Unlock Candidate Exam'}
                      </button>
                    )}
                    <Link
                      to={`/admin/students/${selectedSub.studentId?._id}`}
                      className="btn-secondary btn-sm w-full text-xs flex items-center justify-center gap-1"
                    >
                      Profile <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Reverse-Chronological Incident Feed */}
                <div className="p-4 space-y-3 max-h-[550px] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary-600" /> Incident Stream (Newest First)
                    </p>
                    <span className="badge badge-gray text-[10px]">
                      {selectedSub.violations?.length || 0} Events
                    </span>
                  </div>

                  {selectedSub.violations && selectedSub.violations.length > 0 ? (
                    <div className="space-y-2.5">
                      {/* Reverse the array to show reverse-chronological incident stream */}
                      {[...selectedSub.violations].reverse().map((v, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-red-50/80 border border-red-200/80 rounded-xl space-y-1.5 transition-all hover:bg-red-50 hover:shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${getViolationBadgeStyle(
                                v.type
                              )}`}
                            >
                              {v.type?.replace(/-/g, ' ')}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(v.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>

                          {v.description && (
                            <p className="text-xs text-slate-800 font-medium leading-relaxed">
                              {v.description}
                            </p>
                          )}

                          {/* Evidence Snapshot Preview with Zoom */}
                          {v.evidenceSnapshot && (
                            <div className="relative group mt-2">
                              <img
                                src={v.evidenceSnapshot}
                                alt="AI Detection Evidence"
                                className="w-full h-32 rounded-lg object-cover border border-red-200 cursor-pointer"
                                onClick={() => setZoomSnapshot(v.evidenceSnapshot)}
                              />
                              <button
                                type="button"
                                onClick={() => setZoomSnapshot(v.evidenceSnapshot)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white rounded-lg transition-opacity text-xs font-semibold gap-1"
                              >
                                <Maximize2 className="w-4 h-4" /> Click to Enlarge
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                      <p className="text-sm font-semibold text-slate-600">Zero Violations Logged</p>
                      <p className="text-xs">This candidate has maintained a clean examination session.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Eye className="w-12 h-12 text-slate-200 mx-auto" />
                <p className="font-semibold text-slate-600 text-sm">Select a Candidate</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Click on any active student card on the left to inspect their real-time violation history, evidence snapshots, and session control.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default LiveMonitor;
