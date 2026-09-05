import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import { createExam, getDomains } from '../../api';
import toast from 'react-hot-toast';
import { Save, Info, Clock, Users, Settings, ChevronRight, Tag, CheckSquare, Square, Layers, Plus, Trash2 } from 'lucide-react';

const BRANCHES = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSD', 'OTHER'];
const YEARS = [1, 2, 3, 4];

const Section = ({ icon: Icon, title, children }) => (
  <div className="card">
    <div className="card-header flex items-center gap-3">
      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary-600" />
      </div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
    </div>
    <div className="card-body space-y-4">{children}</div>
  </div>
);

const CreateExam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [allDomainCategories, setAllDomainCategories] = useState([]);
  const [isMultiSection, setIsMultiSection] = useState(false);
  const [sectionsList, setSectionsList] = useState([
    { title: 'Section 1 - General Aptitude', duration: 30 },
    { title: 'Section 2 - Core Subject', duration: 30 },
  ]);
  const [form, setForm] = useState({
    title: '', description: '', subject: '', duration: 60,
    startTime: '', endTime: '', marksPerQuestion: 1,
    negativeMarking: false, negativeMarkValue: 0.25,
    eligibleBranches: [], eligibleYears: [], eligibleDomains: [],
    shuffleQuestions: false, shuffleOptions: false,
    unlockCode: '', violationThreshold: 3,
    examType: null, // 'weekly' | 'monthly' | null
  });

  useEffect(() => {
    if (form.eligibleBranches && form.eligibleBranches.length > 0) {
      getDomains(form.eligibleBranches)
        .then(({ data }) => {
          const cats = data.categories || [];
          setAllDomainCategories(cats);
          const allowedDomains = cats.flatMap((c) => c.domains);
          setForm((prev) => ({
            ...prev,
            eligibleDomains: prev.eligibleDomains.filter((d) => allowedDomains.includes(d)),
          }));
        })
        .catch(() => {});
    } else {
      setAllDomainCategories([]);
      setForm((prev) => ({ ...prev, eligibleDomains: [] }));
    }
  }, [form.eligibleBranches]);

  // Sync total duration from sections when in multi-section mode
  useEffect(() => {
    if (isMultiSection && sectionsList.length > 0) {
      const total = sectionsList.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
      setForm((prev) => ({ ...prev, duration: total }));
    }
  }, [isMultiSection, sectionsList]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSectionChange = (index, field, value) => {
    setSectionsList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addSectionRow = () => {
    setSectionsList((prev) => [
      ...prev,
      { title: `Section ${prev.length + 1}`, duration: 30 },
    ]);
  };

  const removeSectionRow = (index) => {
    if (sectionsList.length <= 1) {
      toast.error('Multi-section exam must have at least 1 section.');
      return;
    }
    setSectionsList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleBranch = (branch) => {
    setForm((prev) => ({
      ...prev,
      eligibleBranches: prev.eligibleBranches.includes(branch)
        ? prev.eligibleBranches.filter((b) => b !== branch) : [...prev.eligibleBranches, branch],
    }));
  };

  const toggleYear = (year) => {
    setForm((prev) => ({
      ...prev,
      eligibleYears: prev.eligibleYears.includes(year)
        ? prev.eligibleYears.filter((y) => y !== year) : [...prev.eligibleYears, year],
    }));
  };

  const toggleDomain = (domain) => {
    setForm((prev) => ({
      ...prev,
      eligibleDomains: prev.eligibleDomains.includes(domain)
        ? prev.eligibleDomains.filter((d) => d !== domain) : [...prev.eligibleDomains, domain],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.eligibleBranches.length === 0) { toast.error('Select at least one branch.'); return; }
    if (form.eligibleYears.length === 0) { toast.error('Select at least one year.'); return; }
    if (form.eligibleDomains.length === 0) { toast.error('Select at least one eligible domain. Domain selection is mandatory.'); return; }
    if (new Date(form.endTime) <= new Date(form.startTime)) { toast.error('End time must be after start time.'); return; }

    if (isMultiSection) {
      if (sectionsList.length === 0) {
        toast.error('Add at least one section.');
        return;
      }
      for (let i = 0; i < sectionsList.length; i++) {
        if (!sectionsList[i].title.trim()) {
          toast.error(`Section ${i + 1} must have a title.`);
          return;
        }
        if (!sectionsList[i].duration || Number(sectionsList[i].duration) < 1) {
          toast.error(`Section ${i + 1} must have a duration of at least 1 minute.`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        duration: Number(form.duration),
        marksPerQuestion: Number(form.marksPerQuestion),
        negativeMarkValue: Number(form.negativeMarkValue),
        violationThreshold: Number(form.violationThreshold),
        isMultiSection,
        sections: isMultiSection
          ? sectionsList.map((s) => ({
              title: s.title.trim(),
              duration: Number(s.duration),
              questions: [],
            }))
          : [],
      };

      const { data } = await createExam(payload);
      toast.success('Exam created! Now add questions.');
      navigate(`/admin/exams/${data.exam._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create exam.');
    } finally { setLoading(false); }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <span>Exams</span><ChevronRight className="w-3 h-3" /><span className="text-slate-800 font-medium">Create New Exam</span>
        </div>
        <h1 className="text-xl font-bold text-slate-800">Create Exam</h1>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="page-content space-y-5">
          <Section icon={Info} title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="form-label">Exam Title *</label>
                <input id="exam-title" name="title" required value={form.title} onChange={handleChange}
                  placeholder="e.g., Mid Semester Exam - Data Structures" className="form-input" />
              </div>
              <div>
                <label className="form-label">Subject</label>
                <input id="exam-subject" name="subject" value={form.subject} onChange={handleChange}
                  placeholder="e.g., Data Structures" className="form-input" />
              </div>
              <div>
                <label className="form-label">Description</label>
                <input id="exam-desc" name="description" value={form.description} onChange={handleChange}
                  placeholder="Optional exam description" className="form-input" />
              </div>
            </div>

            {/* Exam Recurrence Type */}
            <div className="pt-2 border-t border-slate-100">
              <label className="form-label mb-2">
                Exam Recurrence Type <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="flex gap-2">
                {[
                  { value: null,      label: 'None',    desc: 'Light green',  cls: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
                  { value: 'weekly',  label: 'Weekly',  desc: 'Red',          cls: 'border-red-300 bg-red-50 text-red-800' },
                  { value: 'monthly', label: 'Monthly', desc: 'Blue',         cls: 'border-blue-300 bg-blue-50 text-blue-800' },
                ].map(({ value, label, desc, cls }) => (
                  <button
                    key={String(value)}
                    type="button"
                    id={`exam-type-${value ?? 'none'}`}
                    onClick={() => setForm(prev => ({ ...prev, examType: value }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.examType === value
                        ? cls + ' shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${
                      value === null ? 'bg-emerald-400' : value === 'weekly' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    {label}
                    <span className="text-xs font-normal opacity-70">({desc})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Structure Type: Single vs Multi-Section */}
            <div className="pt-2 border-t border-slate-100">
              <label className="form-label mb-2">Exam Structure Format</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  id="structure-single"
                  onClick={() => setIsMultiSection(false)}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                    !isMultiSection
                      ? 'border-primary-500 bg-primary-50 text-primary-900 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <p className="font-semibold text-sm">Single-Section Exam</p>
                  <p className="text-xs text-slate-500 mt-0.5">All questions in one unified sequence with a single timer</p>
                </button>
                <button
                  type="button"
                  id="structure-multi"
                  onClick={() => setIsMultiSection(true)}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-2.5 ${
                    isMultiSection
                      ? 'border-primary-500 bg-primary-50 text-primary-900 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <Layers className={`w-5 h-5 mt-0.5 ${isMultiSection ? 'text-primary-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="font-semibold text-sm">Multi-Section Exam</p>
                    <p className="text-xs text-slate-500 mt-0.5">Separate sections (e.g. Aptitude, Technical) with individual isolated timers</p>
                  </div>
                </button>
              </div>
            </div>
          </Section>

          {/* Multi-Section Builder if active */}
          {isMultiSection && (
            <Section icon={Layers} title="Section Configuration">
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Each section will have its own time limit. During the exam, students will complete sections sequentially with one-way progression.
                </p>
                <div className="space-y-2.5">
                  {sectionsList.map((sec, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Section Title (e.g., Section 1 - Logical Reasoning)"
                          value={sec.title}
                          onChange={(e) => handleSectionChange(idx, 'title', e.target.value)}
                          className="form-input text-sm py-1.5"
                        />
                      </div>
                      <div className="w-36 flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Mins"
                          value={sec.duration}
                          onChange={(e) => handleSectionChange(idx, 'duration', e.target.value)}
                          className="form-input text-sm py-1.5 w-20 text-center"
                        />
                        <span className="text-xs text-slate-500 font-medium">mins</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSectionRow(idx)}
                        disabled={sectionsList.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-30"
                        title="Remove Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={addSectionRow}
                    className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Section
                  </button>
                  <p className="text-xs text-slate-600 font-medium">
                    Total Duration:{' '}
                    <strong className="text-primary-700 font-bold">
                      {sectionsList.reduce((sum, s) => sum + (Number(s.duration) || 0), 0)} mins
                    </strong>
                  </p>
                </div>
              </div>
            </Section>
          )}

          <Section icon={Clock} title="Timing">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">
                  Duration (minutes) * {isMultiSection && <span className="text-xs text-slate-400">(sum of sections)</span>}
                </label>
                <input
                  id="exam-duration"
                  name="duration"
                  type="number"
                  min="1"
                  required
                  disabled={isMultiSection}
                  value={form.duration}
                  onChange={handleChange}
                  className={`form-input ${isMultiSection ? 'bg-slate-100 text-slate-600' : ''}`}
                />
              </div>
              <div>
                <label className="form-label">Start Time *</label>
                <input id="exam-start" name="startTime" type="datetime-local" required value={form.startTime} onChange={handleChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">End Time *</label>
                <input id="exam-end" name="endTime" type="datetime-local" required value={form.endTime} onChange={handleChange} className="form-input" />
              </div>
            </div>
          </Section>

          <Section icon={Settings} title="Marks & Rules">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Marks Per Question *</label>
                <input id="marks-per-q" name="marksPerQuestion" type="number" min="0.5" step="0.5" required value={form.marksPerQuestion} onChange={handleChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">Violation Threshold</label>
                <input id="violation-threshold" name="violationThreshold" type="number" min="1" max="10" value={form.violationThreshold} onChange={handleChange} className="form-input" />
              </div>
              <div>
                <label className="form-label">Unlock Code</label>
                <input id="unlock-code" name="unlockCode" value={form.unlockCode} onChange={handleChange} placeholder="e.g., UNLOCK123" className="form-input" />
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input id="negative-marking" name="negativeMarking" type="checkbox" checked={form.negativeMarking} onChange={handleChange} className="w-4 h-4 mt-0.5 rounded text-primary-600 border-slate-300 focus:ring-primary-500" />
              <div className="flex-1">
                <label htmlFor="negative-marking" className="font-medium text-slate-700 cursor-pointer">Enable Negative Marking</label>
                <p className="text-sm text-slate-500 mt-0.5">Deduct marks for wrong MCQ/MSQ answers</p>
                {form.negativeMarking && (
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-sm text-slate-600 font-medium">Deduction per wrong answer:</label>
                    <input id="neg-mark-value" name="negativeMarkValue" type="number" min="0" step="0.25" value={form.negativeMarkValue} onChange={handleChange} className="w-24 form-input py-1.5 text-sm" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              {[
                { id: 'shuffle-q', name: 'shuffleQuestions', label: 'Shuffle Questions', desc: 'Randomize question order per student' },
                { id: 'shuffle-o', name: 'shuffleOptions', label: 'Shuffle Options', desc: 'Randomize MCQ/MSQ option order' },
              ].map(({ id, name, label, desc }) => (
                <div key={name} className="flex items-start gap-3">
                  <input id={id} name={name} type="checkbox" checked={form[name]} onChange={handleChange} className="w-4 h-4 mt-0.5 rounded text-primary-600 border-slate-300 focus:ring-primary-500" />
                  <div>
                    <label htmlFor={id} className="font-medium text-slate-700 cursor-pointer text-sm">{label}</label>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={Users} title="Student Eligibility">
            <div>
              <label className="form-label">Eligible Branches *</label>
              <div className="flex flex-wrap gap-2">
                {BRANCHES.map((b) => (
                  <button key={b} type="button" id={`branch-${b}`} onClick={() => toggleBranch(b)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${form.eligibleBranches.includes(b) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}>{b}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Eligible Years *</label>
              <div className="flex flex-wrap gap-2">
                {YEARS.map((y) => (
                  <button key={y} type="button" id={`year-${y}`} onClick={() => toggleYear(y)}
                    className={`w-14 py-2 rounded-xl text-sm font-medium transition-all border ${form.eligibleYears.includes(y) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}>Year {y}</button>
                ))}
              </div>
            </div>

            {/* Domain Targeting */}
            <div>
              <label className="form-label flex items-center gap-1.5 font-semibold text-slate-800">
                <Tag className="w-3.5 h-3.5 text-primary-600" /> Eligible Domains *{' '}
                <span className="text-primary-700 font-medium text-xs">(Mandatory — select at least one domain)</span>
              </label>
              {form.eligibleBranches.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium flex items-center gap-2">
                  <span>⚠️ Please select at least one eligible branch above first to view and select domains.</span>
                </div>
              ) : allDomainCategories.length === 0 ? (
                <div className="flex justify-center py-4"><div className="spinner w-5 h-5" /></div>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {allDomainCategories.map(cat => (
                    <div key={cat.category}>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{cat.category}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.domains.map(domain => {
                          const selected = form.eligibleDomains.includes(domain);
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
              )}
              {form.eligibleDomains.length > 0 && (
                <p className="text-xs text-slate-500 mt-1.5">{form.eligibleDomains.length} domain{form.eligibleDomains.length > 1 ? 's' : ''} targeted</p>
              )}
            </div>
          </Section>

          <div className="flex justify-end gap-3 pb-4">
            <button type="button" onClick={() => navigate('/admin/exams')} className="btn-secondary">Cancel</button>
            <button id="create-exam-submit" type="submit" disabled={loading} className="btn-primary">
              {loading ? <div className="spinner" /> : <><Save className="w-4 h-4" /> Create Exam & Add Questions</>}
            </button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
};

export default CreateExam;
