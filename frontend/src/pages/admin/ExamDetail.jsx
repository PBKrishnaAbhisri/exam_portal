import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import {
  getExamAdmin, updateExam, deleteExam,
  addQuestion, updateQuestion, deleteQuestion,
  addSection, updateSection, deleteSection,
  getQuestionBank, getQuestionBankExam,
  togglePublishResults, notifyStudentsExam, getDomains
} from '../../api';
import toast from 'react-hot-toast';
import {
  Plus, Edit, Trash2, Save, X, Upload, Eye, EyeOff, BookOpen,
  CheckSquare, Square, Tag, Type, Hash, ChevronDown, ChevronUp, Image, Mail,
  Send, AlertCircle, Layers, Clock
} from 'lucide-react';

const BRANCHES = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSD', 'OTHER'];
const YEARS = [1, 2, 3, 4];

const EMPTY_Q = {
  type: 'MCQ', questionText: '', options: ['', '', '', ''], correctOptions: [],
  acceptedTexts: [''], numericValue: '', numericTolerance: 0,
  fillBlankType: 'text', subject: '', topic: '', image: null,
};

const ExamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allDomainCategories, setAllDomainCategories] = useState([]);
  const [editingExam, setEditingExam] = useState(false);
  const [examForm, setExamForm] = useState({});
  const [savingExam, setSavingExam] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [notifyProgress, setNotifyProgress] = useState(null); // {sent, failed, total}
  const [showAddQ, setShowAddQ] = useState(false);
  const [targetSectionId, setTargetSectionId] = useState(null);
  const [qForm, setQForm] = useState({ ...EMPTY_Q });
  const [editQId, setEditQId] = useState(null);
  const [savingQ, setSavingQ] = useState(false);
  const [deletingQId, setDeletingQId] = useState(null);
  const [showBank, setShowBank] = useState(false);
  const [bankExams, setBankExams] = useState([]);
  const [selectedBankExam, setSelectedBankExam] = useState(null);
  const [bankQs, setBankQs] = useState([]);
  const [selectedBankQIds, setSelectedBankQIds] = useState([]);
  const [importingBank, setImportingBank] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [newSection, setNewSection] = useState({ title: '', duration: 30 });
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editSectionData, setEditSectionData] = useState({ title: '', duration: 30 });

  const fetchExam = async () => {
    try {
      const { data } = await getExamAdmin(id);
      setExam(data.exam);
      setExamForm({
        title: data.exam.title, description: data.exam.description, subject: data.exam.subject,
        duration: data.exam.duration, startTime: data.exam.startTime?.slice(0, 16),
        endTime: data.exam.endTime?.slice(0, 16), marksPerQuestion: data.exam.marksPerQuestion,
        negativeMarking: data.exam.negativeMarking, negativeMarkValue: data.exam.negativeMarkValue,
        eligibleBranches: data.exam.eligibleBranches || [], eligibleYears: data.exam.eligibleYears || [],
        eligibleDomains: data.exam.eligibleDomains || [],
        shuffleQuestions: data.exam.shuffleQuestions, shuffleOptions: data.exam.shuffleOptions,
        unlockCode: data.exam.unlockCode, violationThreshold: data.exam.violationThreshold,
      });
    } catch { toast.error('Failed to load exam.'); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchExam();
    getDomains().then(({ data }) => setAllDomainCategories(data.categories || []));
  }, [id]);

  const handlePublishToggle = async () => {
    if (!exam) return;
    const isEnded = new Date() >= new Date(exam.endTime);
    let force = false;

    if (!exam.publishResults && !isEnded) {
      const proceed = window.confirm(
        `This exam is scheduled to end on ${new Date(exam.endTime).toLocaleString()}.\n\nPublish results now anyway?`
      );
      if (!proceed) return;
      force = true;
    }

    setPublishing(true);
    try {
      const { data } = await togglePublishResults(id, force);
      setExam(prev => ({ ...prev, publishResults: data.publishResults }));
      setExamForm(prev => ({ ...prev, publishResults: data.publishResults }));
      if (data.publishResults) {
        toast.success('Results published successfully!');
        if (data.emailResult?.reason) {
          toast(data.emailResult.reason, { icon: 'ℹ️' });
        }
      } else {
        toast.success('Results unpublished (hidden from students).');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle publish status.');
    } finally {
      setPublishing(false);
    }
  };

  const handleNotifyStudents = async () => {
    if (!exam) return;
    setNotifying(true);
    setNotifyProgress(null);
    try {
      const result = await notifyStudentsExam(id, (progress) => {
        setNotifyProgress(progress);
      });
      if (result?.sentCount > 0) {
        toast.success(`✉ Sent ${result.sentCount}/${result.total} emails successfully!`);
      } else if (result?.reason) {
        toast(result.reason, { icon: '⚠️', duration: 6000 });
      } else {
        toast('Notification complete.', { icon: '📧' });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send notifications.');
    } finally {
      setNotifying(false);
      setNotifyProgress(null);
    }
  };

  const handleExamSave = async () => {
    if (!examForm.eligibleDomains || examForm.eligibleDomains.length === 0) {
      toast.error('Domain selection is mandatory. Select at least one domain.');
      return;
    }
    setSavingExam(true);
    try {
      const { data } = await updateExam(id, {
        ...examForm,
        duration: Number(examForm.duration),
        marksPerQuestion: Number(examForm.marksPerQuestion),
        negativeMarkValue: Number(examForm.negativeMarkValue),
        violationThreshold: Number(examForm.violationThreshold),
      });
      setExam(data.exam);
      setExamForm({
        ...examForm,
        ...data.exam,
        startTime: data.exam.startTime?.slice(0, 16),
        endTime: data.exam.endTime?.slice(0, 16),
      });
      setEditingExam(false);
      toast.success('Exam updated.');
    } catch {
      toast.error('Failed to update exam.');
    } finally {
      setSavingExam(false);
    }
  };

  const toggleBranch = (b) =>
    setExamForm((p) => ({
      ...p,
      eligibleBranches: p.eligibleBranches.includes(b)
        ? p.eligibleBranches.filter((x) => x !== b)
        : [...p.eligibleBranches, b],
    }));

  const toggleYear = (y) =>
    setExamForm((p) => ({
      ...p,
      eligibleYears: p.eligibleYears.includes(y)
        ? p.eligibleYears.filter((x) => x !== y)
        : [...p.eligibleYears, y],
    }));

  const toggleDomain = (domain) =>
    setExamForm((p) => ({
      ...p,
      eligibleDomains: (p.eligibleDomains || []).includes(domain)
        ? (p.eligibleDomains || []).filter((d) => d !== domain)
        : [...(p.eligibleDomains || []), domain],
    }));

  const startAddQ = (sectionId = null) => {
    setQForm({ ...EMPTY_Q });
    setEditQId(null);
    setTargetSectionId(sectionId || (exam?.sections?.[0]?._id || null));
    setShowAddQ(true);
  };

  const startEditQ = (q, sectionId = null) => {
    setQForm({
      type: q.type, questionText: q.questionText,
      options: q.options?.length ? q.options : ['', '', '', ''],
      correctOptions: q.correctOptions || [],
      acceptedTexts: q.acceptedTexts?.length ? q.acceptedTexts : [''],
      numericValue: q.numericValue ?? '',
      numericTolerance: q.numericTolerance ?? 0,
      fillBlankType: q.fillBlankType || 'text',
      subject: q.subject || '', topic: q.topic || '',
      image: null, existingImageUrl: q.imageUrl
    });
    setEditQId(q._id);
    if (sectionId) setTargetSectionId(sectionId);
    setShowAddQ(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') setQForm((p) => ({ ...p, image: files[0] }));
    else setQForm((p) => ({ ...p, [name]: value }));
  };

  const updateOpt = (idx, val) => { const opts = [...qForm.options]; opts[idx] = val; setQForm((p) => ({ ...p, options: opts })); };
  const addOpt = () => setQForm((p) => ({ ...p, options: [...p.options, ''] }));
  const removeOpt = (idx) => { const opts = qForm.options.filter((_, i) => i !== idx); const c = qForm.correctOptions.filter((c) => c !== idx).map((c) => c > idx ? c - 1 : c); setQForm((p) => ({ ...p, options: opts, correctOptions: c })); };
  const toggleCorrect = (idx) => {
    if (qForm.type === 'MCQ') setQForm((p) => ({ ...p, correctOptions: [idx] }));
    else { const c = qForm.correctOptions; setQForm((p) => ({ ...p, correctOptions: c.includes(idx) ? c.filter((x) => x !== idx) : [...c, idx] })); }
  };
  const updateAccepted = (idx, val) => { const t = [...qForm.acceptedTexts]; t[idx] = val; setQForm((p) => ({ ...p, acceptedTexts: t })); };
  const addAccepted = () => setQForm((p) => ({ ...p, acceptedTexts: [...p.acceptedTexts, ''] }));
  const removeAccepted = (idx) => setQForm((p) => ({ ...p, acceptedTexts: p.acceptedTexts.filter((_, i) => i !== idx) }));

  const handleSaveQ = async () => {
    if (!qForm.questionText.trim()) { toast.error('Question text required.'); return; }
    if ((qForm.type === 'MCQ' || qForm.type === 'MSQ') && qForm.correctOptions.length === 0) { toast.error('Select at least one correct option.'); return; }
    setSavingQ(true);
    try {
      const fd = new FormData();
      fd.append('type', qForm.type); fd.append('questionText', qForm.questionText);
      fd.append('subject', qForm.subject); fd.append('topic', qForm.topic);
      fd.append('options', JSON.stringify(qForm.options.filter((o) => o.trim())));
      fd.append('correctOptions', JSON.stringify(qForm.correctOptions));
      fd.append('acceptedTexts', JSON.stringify(qForm.acceptedTexts.filter((t) => t.trim())));
      fd.append('numericValue', qForm.numericValue); fd.append('numericTolerance', qForm.numericTolerance);
      fd.append('fillBlankType', qForm.fillBlankType);
      if (qForm.image) fd.append('image', qForm.image);
      if (exam.isMultiSection && targetSectionId) {
        fd.append('sectionId', targetSectionId);
      }
      if (editQId) { await updateQuestion(id, editQId, fd); toast.success('Question updated.'); }
      else { await addQuestion(id, fd); toast.success('Question added.'); }
      await fetchExam(); setShowAddQ(false); setEditQId(null); setQForm({ ...EMPTY_Q });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save question.'); } finally { setSavingQ(false); }
  };

  const handleDeleteQ = async (qId) => {
    if (!window.confirm('Delete this question?')) return;
    setDeletingQId(qId);
    try {
      await deleteQuestion(id, qId);
      toast.success('Question deleted.');
      await fetchExam();
    } catch {
      toast.error('Failed to delete.');
    } finally {
      setDeletingQId(null);
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!newSection.title.trim()) return toast.error('Section title is required.');
    if (!newSection.duration || Number(newSection.duration) < 1) return toast.error('Duration must be at least 1 min.');
    try {
      await addSection(id, newSection);
      toast.success('Section added.');
      setShowSectionModal(false);
      setNewSection({ title: '', duration: 30 });
      await fetchExam();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add section.');
    }
  };

  const handleUpdateSection = async (sectionId) => {
    if (!editSectionData.title.trim()) return toast.error('Section title is required.');
    try {
      await updateSection(id, sectionId, editSectionData);
      toast.success('Section updated.');
      setEditingSectionId(null);
      await fetchExam();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update section.');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!window.confirm('Delete this section and all its questions?')) return;
    try {
      await deleteSection(id, sectionId);
      toast.success('Section deleted.');
      await fetchExam();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete section.');
    }
  };

  const openBank = (sectionId = null) => {
    setTargetSectionId(sectionId || (exam?.sections?.[0]?._id || null));
    getQuestionBank()
      .then(({ data }) => {
        setBankExams(data.exams.filter((e) => e._id !== id));
        setShowBank(true);
      })
      .catch(() => toast.error('Failed to load question bank.'));
  };

  const selectBankExam = async (examId) => {
    try {
      const { data } = await getQuestionBankExam(examId);
      setSelectedBankExam(data.exam);
      // Flatten questions if bank exam is multi-section
      const questions = data.exam.isMultiSection && data.exam.sections
        ? data.exam.sections.flatMap((s) => s.questions || [])
        : data.exam.questions || [];
      setBankQs(questions);
      setSelectedBankQIds([]);
    } catch {
      toast.error('Failed to load questions.');
    }
  };

  const toggleBankQ = (qId) => setSelectedBankQIds((p) => p.includes(qId) ? p.filter((i) => i !== qId) : [...p, qId]);

  const importSelectedQs = async () => {
    if (selectedBankQIds.length === 0) { toast.error('No questions selected.'); return; }
    setImportingBank(true);
    try {
      const qs = bankQs.filter((q) => selectedBankQIds.includes(q._id));
      for (const q of qs) {
        const fd = new FormData();
        fd.append('type', q.type); fd.append('questionText', q.questionText); fd.append('subject', q.subject || ''); fd.append('topic', q.topic || '');
        fd.append('options', JSON.stringify(q.options || [])); fd.append('correctOptions', JSON.stringify(q.correctOptions || []));
        fd.append('acceptedTexts', JSON.stringify(q.acceptedTexts || [])); fd.append('numericValue', q.numericValue ?? '');
        fd.append('numericTolerance', q.numericTolerance ?? 0); fd.append('fillBlankType', q.fillBlankType || '');
        if (exam.isMultiSection && targetSectionId) {
          fd.append('sectionId', targetSectionId);
        }
        await addQuestion(id, fd);
      }
      toast.success(`${qs.length} question(s) imported!`); await fetchExam(); setShowBank(false);
    } catch { toast.error('Failed to import.'); } finally { setImportingBank(false); }
  };

  if (loading) return <AdminLayout><div className="flex justify-center items-center h-64"><div className="spinner w-8 h-8"></div></div></AdminLayout>;
  if (!exam) return <AdminLayout><div className="page-content text-slate-500">Exam not found.</div></AdminLayout>;

  const totalQuestions = exam.isMultiSection
    ? (exam.sections || []).reduce((acc, s) => acc + (s.questions?.length || 0), 0)
    : (exam.questions?.length || 0);

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{exam.title}</h1>
              {exam.isMultiSection && (
                <span className="badge badge-purple flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Multi-Section ({exam.sections?.length || 0})
                </span>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-2 mt-1.5">
              <span className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 font-semibold">{exam.examCode}</span>
              <span className="text-sm text-slate-500">{totalQuestions} questions</span>
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {exam.duration} mins
              </span>
              {exam.subject && <span className="badge badge-blue">{exam.subject}</span>}
              <span className={`badge ${exam.publishResults ? 'badge-green' : 'badge-gray'}`}>
                {exam.publishResults ? '● Results Published' : '○ Results Hidden'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="notify-students-btn"
              type="button"
              onClick={handleNotifyStudents}
              disabled={notifying}
              className="btn-secondary text-blue-600 border-blue-200 hover:bg-blue-50 min-w-[160px]"
              title="Send email notifications to all students matching this exam's branch and domains"
            >
              {notifying ? (
                <>
                  <div className="spinner w-4 h-4" />
                  {notifyProgress
                    ? `Sending ${notifyProgress.sent}/${notifyProgress.total}`
                    : 'Starting...'}
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Notify Students
                </>
              )}
            </button>

            <button
              id="publish-results-btn"
              type="button"
              onClick={handlePublishToggle}
              disabled={publishing}
              className={`btn ${
                exam.publishResults
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-900 text-white'
              }`}
            >
              {publishing ? (
                <div className="spinner w-4 h-4" />
              ) : exam.publishResults ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              {exam.publishResults ? 'Results Published' : 'Publish Results'}
            </button>

            {exam.isMultiSection && (
              <button
                id="add-section-btn"
                onClick={() => setShowSectionModal(true)}
                className="btn-secondary text-purple-700 border-purple-200 hover:bg-purple-50"
              >
                <Plus className="w-4 h-4" /> Add Section
              </button>
            )}

            <button id="open-bank" onClick={() => openBank()} className="btn-secondary">
              <BookOpen className="w-4 h-4" /> Bank
            </button>
            <button id="toggle-edit" onClick={() => setEditingExam(!editingExam)} className="btn-secondary">
              <Edit className="w-4 h-4" /> {editingExam ? 'Cancel' : 'Edit'}
            </button>
            {!exam.isMultiSection && (
              <button id="add-q-btn" onClick={() => startAddQ()} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Question
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="page-content space-y-5">
        {/* Results Published Alert Banner */}
        {exam.publishResults && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 text-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span><strong>Results are currently Published.</strong> Students can view their scores, detailed solutions, and leaderboard rankings.</span>
            </div>
            <button onClick={handlePublishToggle} className="text-xs font-semibold text-emerald-700 hover:underline">
              Unpublish
            </button>
          </div>
        )}

        {/* Add Section Modal */}
        {showSectionModal && (
          <div className="modal-overlay" onClick={() => setShowSectionModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" /> Add Section
                </h3>
                <button onClick={() => setShowSectionModal(false)} className="btn-ghost btn-sm"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddSection} className="p-6 space-y-4">
                <div>
                  <label className="form-label">Section Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Section 3 - Coding & Tech"
                    value={newSection.title}
                    onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Section Duration (mins) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newSection.duration}
                    onChange={(e) => setNewSection({ ...newSection, duration: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowSectionModal(false)} className="btn-ghost">Cancel</button>
                  <button type="submit" className="btn-primary">Add Section</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Exam Edit Panel */}
        {editingExam && (
          <div className="card border-primary-200">
            <div className="card-header bg-primary-50"><h3 className="font-semibold text-primary-800">Edit Exam Information</h3></div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[['Title', 'title'], ['Subject', 'subject'], ['Duration (mins)', 'duration', 'number'], ['Marks/Q', 'marksPerQuestion', 'number'], ['Start Time', 'startTime', 'datetime-local'], ['End Time', 'endTime', 'datetime-local'], ['Unlock Code', 'unlockCode'], ['Violation Threshold', 'violationThreshold', 'number']].map(([label, name, type]) => (
                  <div key={name}><label className="form-label">{label}</label><input type={type || 'text'} value={examForm[name] || ''} onChange={(e) => setExamForm({ ...examForm, [name]: e.target.value })} className="form-input" /></div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="edit-neg" checked={examForm.negativeMarking} onChange={(e) => setExamForm({ ...examForm, negativeMarking: e.target.checked })} className="w-4 h-4 rounded text-primary-600" />
                <label htmlFor="edit-neg" className="font-medium text-sm text-slate-700">Negative Marking</label>
                {examForm.negativeMarking && <input type="number" step="0.25" min="0" value={examForm.negativeMarkValue} onChange={(e) => setExamForm({ ...examForm, negativeMarkValue: e.target.value })} className="form-input w-28 py-1.5 text-sm" />}
              </div>
              <div><label className="form-label">Branches</label><div className="flex flex-wrap gap-2">{BRANCHES.map((b) => <button key={b} type="button" onClick={() => toggleBranch(b)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${examForm.eligibleBranches?.includes(b) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200'}`}>{b}</button>)}</div></div>
              <div><label className="form-label">Years</label><div className="flex gap-2">{YEARS.map((y) => <button key={y} type="button" onClick={() => toggleYear(y)} className={`w-14 py-1.5 rounded-lg text-sm font-medium border transition-all ${examForm.eligibleYears?.includes(y) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200'}`}>Y{y}</button>)}</div></div>

              {/* Domain Targeting (Mandatory) */}
              <div>
                <label className="form-label flex items-center gap-1.5 font-semibold text-slate-800">
                  <Tag className="w-3.5 h-3.5 text-primary-600" /> Eligible Domains *{' '}
                  <span className="text-primary-700 font-medium text-xs">(Mandatory — select at least one domain)</span>
                </label>
                <div className="space-y-3 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {allDomainCategories.map(cat => (
                    <div key={cat.category}>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{cat.category}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.domains.map(domain => {
                          const selected = examForm.eligibleDomains?.includes(domain);
                          return (
                            <button key={domain} type="button" onClick={() => toggleDomain(domain)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${selected ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}>
                              {selected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                              {domain}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {examForm.eligibleDomains?.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1.5">{examForm.eligibleDomains.length} domain{examForm.eligibleDomains.length > 1 ? 's' : ''} targeted</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setEditingExam(false)} className="btn-ghost">Cancel</button>
                <button id="save-exam-info" onClick={handleExamSave} disabled={savingExam} className="btn-primary">{savingExam ? <div className="spinner" /> : <><Save className="w-4 h-4" /> Save</>}</button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Question Panel */}
        {showAddQ && (
          <div className="card border-emerald-200">
            <div className="card-header bg-emerald-50 flex items-center justify-between">
              <h3 className="font-semibold text-emerald-800">
                {editQId ? 'Edit Question' : 'Add New Question'}
              </h3>
              <button onClick={() => { setShowAddQ(false); setEditQId(null); }} className="btn-ghost btn-sm"><X className="w-4 h-4" /></button>
            </div>
            <div className="card-body space-y-4">
              {/* If Multi-Section: Target Section Selector */}
              {exam.isMultiSection && exam.sections?.length > 0 && (
                <div>
                  <label className="form-label font-semibold text-purple-900">Target Section *</label>
                  <select
                    value={targetSectionId || exam.sections[0]?._id}
                    onChange={(e) => setTargetSectionId(e.target.value)}
                    className="form-select"
                  >
                    {exam.sections.map((s, idx) => (
                      <option key={s._id} value={s._id}>
                        Section {idx + 1}: {s.title} ({s.duration} mins) — {s.questions?.length || 0} Qs
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type selector */}
              <div>
                <label className="form-label">Question Type</label>
                <div className="flex gap-3">
                  {[{ v: 'MCQ', l: 'MCQ', d: 'Single correct', I: CheckSquare }, { v: 'MSQ', l: 'MSQ', d: 'Multi correct', I: CheckSquare }, { v: 'FILL_BLANK', l: 'Fill Blank', d: 'Text or numeric', I: Type }].map(({ v, l, d, I }) => (
                    <button key={v} type="button" id={`qtype-${v}`} onClick={() => setQForm((p) => ({ ...p, type: v, correctOptions: [] }))}
                      className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${qForm.type === v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`}><I className="w-5 h-5" /><span className="text-sm font-semibold">{l}</span><span className="text-xs opacity-70">{d}</span></button>
                  ))}
                </div>
              </div>

              <div><label className="form-label">Question Text *</label><textarea id="q-text" name="questionText" rows={3} value={qForm.questionText} onChange={handleQChange} placeholder="Enter your question..." className="form-input resize-none" /></div>

              <div>
                <label className="form-label">Image (Optional)</label>
                <div className="flex items-center gap-3">
                  <label htmlFor="q-image" className="btn-secondary btn-sm cursor-pointer"><Upload className="w-4 h-4" /> Upload</label>
                  <input id="q-image" type="file" accept="image/*" onChange={handleQChange} className="hidden" />
                  {qForm.image && <span className="text-sm text-slate-600 truncate max-w-xs">{qForm.image.name}</span>}
                  {qForm.existingImageUrl && !qForm.image && <a href={qForm.existingImageUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm"><Eye className="w-3.5 h-3.5" /> View</a>}
                </div>
              </div>

              {/* MCQ / MSQ Options */}
              {(qForm.type === 'MCQ' || qForm.type === 'MSQ') && (
                <div>
                  <label className="form-label">Options & Correct Answer{qForm.type === 'MSQ' ? 's' : ''}</label>
                  <div className="space-y-2">
                    {qForm.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <button type="button" id={`correct-${idx}`} onClick={() => toggleCorrect(idx)}
                          className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${qForm.correctOptions.includes(idx) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                          {qForm.correctOptions.includes(idx) && <span className="text-xs">✓</span>}
                        </button>
                        <input value={opt} onChange={(e) => updateOpt(idx, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + idx)}`} className="form-input flex-1" />
                        {qForm.options.length > 2 && <button type="button" onClick={() => removeOpt(idx)} className="btn-ghost btn-sm text-red-500"><X className="w-4 h-4" /></button>}
                      </div>
                    ))}
                    <button type="button" onClick={addOpt} className="btn-ghost btn-sm text-primary-600"><Plus className="w-4 h-4" /> Add Option</button>
                  </div>
                </div>
              )}

              {/* FILL_BLANK */}
              {qForm.type === 'FILL_BLANK' && (
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Answer Type</label>
                    <div className="flex gap-3">
                      {[{ v: 'text', l: 'Text', I: Type }, { v: 'number', l: 'Numeric', I: Hash }].map(({ v, l, I }) => (
                        <button key={v} type="button" onClick={() => setQForm((p) => ({ ...p, fillBlankType: v }))}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${qForm.fillBlankType === v ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`}><I className="w-4 h-4" /> {l}</button>
                      ))}
                    </div>
                  </div>
                  {qForm.fillBlankType === 'text' ? (
                    <div>
                      <label className="form-label">Accepted Answers</label>
                      <div className="space-y-2">
                        {qForm.acceptedTexts.map((t, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input value={t} onChange={(e) => updateAccepted(idx, e.target.value)} placeholder={`Answer ${idx + 1}`} className="form-input flex-1" />
                            {qForm.acceptedTexts.length > 1 && <button type="button" onClick={() => removeAccepted(idx)} className="btn-ghost btn-sm text-red-500"><X className="w-4 h-4" /></button>}
                          </div>
                        ))}
                        <button type="button" onClick={addAccepted} className="btn-ghost btn-sm text-primary-600"><Plus className="w-4 h-4" /> Add Alternate</button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="form-label">Correct Value</label><input id="numeric-value" name="numericValue" type="number" step="any" value={qForm.numericValue} onChange={handleQChange} className="form-input" /></div>
                      <div><label className="form-label">Tolerance (±)</label><input id="numeric-tol" name="numericTolerance" type="number" min="0" step="any" value={qForm.numericTolerance} onChange={handleQChange} className="form-input" /></div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div><label className="form-label">Subject Tag</label><input name="subject" value={qForm.subject} onChange={handleQChange} className="form-input" /></div>
                <div><label className="form-label">Topic Tag</label><input name="topic" value={qForm.topic} onChange={handleQChange} className="form-input" /></div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowAddQ(false); setEditQId(null); }} className="btn-ghost">Cancel</button>
                <button id="save-q" onClick={handleSaveQ} disabled={savingQ} className="btn-primary">{savingQ ? <div className="spinner" /> : <><Save className="w-4 h-4" /> {editQId ? 'Update' : 'Add'}</>}</button>
              </div>
            </div>
          </div>
        )}

        {/* Bank Import Modal */}
        {showBank && (
          <div className="modal-overlay" onClick={() => setShowBank(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 text-lg">Import from Question Bank</h3>
                <button onClick={() => setShowBank(false)} className="btn-ghost btn-sm"><X className="w-4 h-4" /></button>
              </div>
              <div className="overflow-y-auto flex-1 p-6 space-y-4">
                <div>
                  <label className="form-label">Select Exam</label>
                  <select className="form-select" onChange={(e) => selectBankExam(e.target.value)} defaultValue="">
                    <option value="" disabled>Choose a previous exam...</option>
                    {bankExams.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.title} ({e.examCode}) — {e.questionsCount !== undefined ? e.questionsCount : (e.questions?.length || 0)} Qs
                      </option>
                    ))}
                  </select>
                </div>
                {bankQs.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-slate-700">{bankQs.length} questions</p>
                      <button onClick={() => setSelectedBankQIds(selectedBankQIds.length === bankQs.length ? [] : bankQs.map((q) => q._id))} className="text-sm text-primary-600 hover:underline">
                        {selectedBankQIds.length === bankQs.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {bankQs.map((q, idx) => (
                        <div key={q._id} onClick={() => toggleBankQ(q._id)} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedBankQIds.includes(q._id) ? 'border-primary-400 bg-primary-50' : 'border-slate-200'}`}>
                          <div className={`w-5 h-5 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center ${selectedBankQIds.includes(q._id) ? 'bg-primary-600 border-primary-600' : 'border-slate-300'}`}>{selectedBankQIds.includes(q._id) && <span className="text-white text-xs">✓</span>}</div>
                          <div><span className="text-xs font-medium text-slate-500 mr-2">{idx + 1}. [{q.type}]</span><span className="text-sm text-slate-700">{q.questionText?.slice(0, 100)}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setShowBank(false)} className="btn-ghost">Cancel</button>
                <button onClick={importSelectedQs} disabled={importingBank || selectedBankQIds.length === 0} className="btn-primary">{importingBank ? <div className="spinner" /> : <><Plus className="w-4 h-4" /> Import {selectedBankQIds.length}</>}</button>
              </div>
            </div>
          </div>
        )}

        {/* Questions Display */}
        {exam.isMultiSection ? (
          <div className="space-y-6">
            {(!exam.sections || exam.sections.length === 0) ? (
              <div className="card text-center py-16">
                <Layers className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No sections added yet</p>
                <button onClick={() => setShowSectionModal(true)} className="btn-primary mt-4">
                  <Plus className="w-4 h-4" /> Add Section
                </button>
              </div>
            ) : (
              exam.sections.map((section, sIdx) => (
                <div key={section._id} className="card border-slate-200 overflow-hidden">
                  <div className="card-header bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                        {sIdx + 1}
                      </span>
                      {editingSectionId === section._id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editSectionData.title}
                            onChange={(e) => setEditSectionData({ ...editSectionData, title: e.target.value })}
                            className="form-input text-sm py-1"
                          />
                          <input
                            type="number"
                            min="1"
                            value={editSectionData.duration}
                            onChange={(e) => setEditSectionData({ ...editSectionData, duration: e.target.value })}
                            className="form-input text-sm py-1 w-20"
                          />
                          <button onClick={() => handleUpdateSection(section._id)} className="btn-primary btn-sm">Save</button>
                          <button onClick={() => setEditingSectionId(null)} className="btn-ghost btn-sm">Cancel</button>
                        </div>
                      ) : (
                        <div>
                          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            {section.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                            <span className="font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                              <Clock className="w-3 h-3 inline mr-1" />{section.duration} minutes
                            </span>
                            <span>•</span>
                            <span>{section.questions?.length || 0} questions</span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {editingSectionId !== section._id && (
                        <button
                          onClick={() => {
                            setEditingSectionId(section._id);
                            setEditSectionData({ title: section.title, duration: section.duration });
                          }}
                          className="btn-ghost btn-sm text-slate-500"
                          title="Edit section info"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openBank(section._id)}
                        className="btn-secondary btn-sm text-xs"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Bank
                      </button>
                      <button
                        onClick={() => startAddQ(section._id)}
                        className="btn-primary btn-sm text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Question
                      </button>
                      <button
                        onClick={() => handleDeleteSection(section._id)}
                        className="btn-ghost btn-sm text-red-500 p-1.5 hover:bg-red-50 rounded-lg"
                        title="Delete section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {(!section.questions || section.questions.length === 0) ? (
                    <div className="p-8 text-center bg-slate-50/50">
                      <p className="text-xs text-slate-400">No questions in this section yet.</p>
                      <button
                        onClick={() => startAddQ(section._id)}
                        className="btn-ghost btn-sm text-primary-600 mt-2 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Question to {section.title}
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {section.questions.map((q, idx) => (
                        <QuestionCard
                          key={q._id}
                          q={q}
                          idx={idx}
                          onEdit={() => startEditQ(q, section._id)}
                          onDelete={() => handleDeleteQ(q._id)}
                          deleting={deletingQId === q._id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Single-Section flat questions list */
          <div className="card">
            <div className="card-header"><h2 className="font-semibold text-slate-800">Questions ({exam.questions?.length || 0})</h2></div>
            {(!exam.questions || exam.questions.length === 0) ? (
              <div className="card-body text-center py-16">
                <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No questions yet</p>
                <button onClick={() => startAddQ()} className="btn-primary mt-4"><Plus className="w-4 h-4" /> Add First Question</button>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {exam.questions.map((q, idx) => (
                  <QuestionCard
                    key={q._id}
                    q={q}
                    idx={idx}
                    onEdit={() => startEditQ(q)}
                    onDelete={() => handleDeleteQ(q._id)}
                    deleting={deletingQId === q._id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const QuestionCard = ({ q, idx, onEdit, onDelete, deleting }) => {
  const [expanded, setExpanded] = useState(false);
  const tc = { MCQ: { l: 'MCQ', c: 'badge-blue' }, MSQ: { l: 'MSQ', c: 'badge-yellow' }, FILL_BLANK: { l: 'Fill Blank', c: 'badge-gray' } }[q.type] || { l: 'MCQ', c: 'badge-blue' };

  return (
    <div className="px-6 py-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-start gap-4">
        <span className="text-slate-400 font-mono text-sm mt-0.5 w-7 flex-shrink-0">{idx + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className="text-slate-800 font-medium text-sm leading-relaxed line-clamp-2">{q.questionText}</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={tc.c}>{tc.l}</span>
              {q.imageUrl && <span className="badge badge-gray"><Image className="w-3 h-3" /></span>}
              <button onClick={() => setExpanded(!expanded)} className="btn-ghost btn-sm text-slate-500 p-1">{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
              <button onClick={onEdit} className="btn-ghost btn-sm text-primary-600 p-1"><Edit className="w-4 h-4" /></button>
              <button onClick={onDelete} disabled={deleting} className="btn-ghost btn-sm text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          {q.subject && <div className="flex gap-2 mt-1.5"><span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{q.subject}</span>{q.topic && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{q.topic}</span>}</div>}
          {expanded && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-2">
              {q.imageUrl && <img src={q.imageUrl} alt="Question" className="max-h-48 rounded-lg object-contain" />}
              {(q.type === 'MCQ' || q.type === 'MSQ') && q.options?.map((opt, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm ${q.correctOptions?.includes(i) ? 'text-emerald-700 font-medium' : 'text-slate-600'}`}>
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs flex-shrink-0 ${q.correctOptions?.includes(i) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>{String.fromCharCode(65 + i)}</span>
                  {opt} {q.correctOptions?.includes(i) && <span className="text-xs text-emerald-600">✓</span>}
                </div>
              ))}
              {q.type === 'FILL_BLANK' && <div className="text-sm text-slate-600">{q.fillBlankType === 'number' ? <p>Answer: <strong>{q.numericValue}</strong> ± {q.numericTolerance}</p> : <p>Accepted: <strong>{q.acceptedTexts?.join(', ')}</strong></p>}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamDetail;
