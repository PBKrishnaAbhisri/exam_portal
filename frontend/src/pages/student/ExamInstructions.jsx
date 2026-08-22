import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExamStudent } from '../../api';
import toast from 'react-hot-toast';
import { Shield, Camera, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';

const ExamInstructions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [webcamGranted, setWebcamGranted] = useState(false);
  const [webcamDenied, setWebcamDenied] = useState(false);
  const [checking, setChecking] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const fetch = async () => {
      try { const { data } = await getExamStudent(examId); setExam(data.exam); } catch (err) { toast.error(err.response?.data?.message || 'Failed to load exam.'); navigate('/student'); } finally { setLoading(false); }
    };
    fetch();
  }, [examId]);

  const requestWebcam = async () => {
    setChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setWebcamGranted(true); setWebcamDenied(false); toast.success('Webcam access granted!');
    } catch { setWebcamGranted(false); setWebcamDenied(true); toast.error('Webcam access denied.'); } finally { setChecking(false); }
  };

  const handleStart = () => {
    if (!accepted) { toast.error('Accept exam rules first.'); return; }
    if (!webcamGranted) { toast.error('Webcam access is required.'); return; }
    
    // Request fullscreen immediately within the user click gesture
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }

    navigate(`/student/exam/${examId}/take`);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="spinner w-8 h-8"></div></div>;
  if (!exam) return null;

  const rules = [
    'Do NOT switch browser tabs or windows during the exam.',
    'Do NOT exit fullscreen mode at any time.',
    'Do NOT use copy (Ctrl+C) or paste (Ctrl+V) shortcuts.',
    'Do NOT right-click anywhere on the exam page.',
    'Keep your webcam unobstructed and your face visible.',
    'Do NOT bring any mobile phone or electronic device into view.',
    `Violations will be logged. ${exam.violationThreshold || 3} violations will lock your exam.`,
    'Ensure a stable internet connection before starting.',
    'The exam will auto-submit when time runs out.',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-primary-950 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl border border-white/20 mb-4"><Shield className="w-7 h-7 text-white" /></div>
          <h1 className="text-2xl font-bold text-white">{exam.title}</h1>
          <p className="text-slate-300 mt-1">{exam.subject} · {exam.examCode}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
            <h2 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Exam Details</h2>
            <div className="space-y-2 text-sm">
              {(() => {
                const totalQuestions =
                  (exam.sections || []).reduce((acc, s) => acc + (s.questions?.length || 0), 0) +
                  (exam.questions?.length || 0);
                return [
                  ['Duration', `${exam.duration} minutes`],
                  ['Questions', totalQuestions],
                  ['Marks/Q', exam.marksPerQuestion],
                  ['Total Marks', totalQuestions * (exam.marksPerQuestion || 1)],
                  ['Negative Marking', exam.negativeMarking ? `Yes (−${exam.negativeMarkValue})` : 'No'],
                  ['Violation Limit', `${exam.violationThreshold || 3} = Locked`],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between">
                    <span className="text-slate-400">{l}</span>
                    <span className={`font-medium text-white ${l === 'Negative Marking' && exam.negativeMarking ? 'text-red-400' : ''}`}>
                      {v}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
            <h2 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Webcam Check</h2>
            <div className="relative rounded-xl overflow-hidden bg-slate-800 mb-3 aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {!webcamGranted && <div className="absolute inset-0 flex items-center justify-center"><Camera className="w-10 h-10 text-slate-500" /></div>}
            </div>
            {!webcamGranted ? (
              <button id="grant-webcam" onClick={requestWebcam} disabled={checking}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${webcamDenied ? 'bg-red-600 text-white' : 'bg-white text-primary-700'}`}>
                {checking ? 'Requesting...' : webcamDenied ? '⚠ Denied – Try Again' : '📷 Grant Camera Access'}
              </button>
            ) : <div className="flex items-center justify-center gap-2 py-2 text-emerald-400 text-sm font-medium"><CheckCircle className="w-4 h-4" /> Camera active</div>}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5 mb-5">
          <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Exam Rules</h2>
          <ul className="space-y-2">{rules.map((rule, idx) => <li key={idx} className="flex items-start gap-2 text-sm text-slate-300"><span className="text-amber-400 font-bold flex-shrink-0 mt-0.5">{idx + 1}.</span>{rule}</li>)}</ul>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <label htmlFor="accept-rules" className="flex items-start gap-3 cursor-pointer mb-4">
            <input id="accept-rules" type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="w-5 h-5 mt-0.5 rounded text-primary-600 flex-shrink-0" />
            <span className="text-slate-200 text-sm">I have read and agree to follow all exam rules. I understand violations will be logged and may lock my exam.</span>
          </label>
          <button id="start-exam" onClick={handleStart} disabled={!accepted || !webcamGranted}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all ${accepted && webcamGranted ? 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}>
            Start Exam (Enters Fullscreen) <ChevronRight className="w-5 h-5" />
          </button>
          {!webcamGranted && <p className="text-center text-red-400 text-xs mt-2">⚠ Camera access required</p>}
        </div>
      </div>
    </div>
  );
};

export default ExamInstructions;
