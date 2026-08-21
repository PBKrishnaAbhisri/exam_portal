import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/common/AdminLayout';
import { createExam } from '../../api';
import toast from 'react-hot-toast';
import { Save, Info, Clock, Users, Settings, ChevronRight } from 'lucide-react';

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
  const [form, setForm] = useState({
    title: '', description: '', subject: '', duration: 60,
    startTime: '', endTime: '', marksPerQuestion: 1,
    negativeMarking: false, negativeMarkValue: 0.25,
    eligibleBranches: [], eligibleYears: [],
    shuffleQuestions: false, shuffleOptions: false,
    unlockCode: '', violationThreshold: 3,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.eligibleBranches.length === 0) { toast.error('Select at least one branch.'); return; }
    if (form.eligibleYears.length === 0) { toast.error('Select at least one year.'); return; }
    if (new Date(form.endTime) <= new Date(form.startTime)) { toast.error('End time must be after start time.'); return; }

    setLoading(true);
    try {
      const { data } = await createExam({
        ...form, duration: Number(form.duration), marksPerQuestion: Number(form.marksPerQuestion),
        negativeMarkValue: Number(form.negativeMarkValue), violationThreshold: Number(form.violationThreshold),
      });
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
          </Section>

          <Section icon={Clock} title="Timing">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Duration (minutes) *</label>
                <input id="exam-duration" name="duration" type="number" min="1" required value={form.duration} onChange={handleChange} className="form-input" />
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
