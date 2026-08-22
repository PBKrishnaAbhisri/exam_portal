import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { startExam, saveAnswers, logViolation, unlockExam, submitExam, heartbeatExam, nextSection } from '../../api';
import { initYOLO, startDetectionLoop, stopDetectionLoop, captureSnapshot, getActiveBackend } from '../../utils/yoloDetector';
import { Clock, Lock, ChevronLeft, ChevronRight, Send, Eye, Shield, AlertTriangle, Maximize, Layers } from 'lucide-react';

const STATUS = { NOT_VISITED: 'nv', ANSWERED: 'ans', NOT_ANSWERED: 'na', REVIEW: 'rev' };

// ── Violation debounce cooldowns ─────────────────────────────────────────────
const VIOLATION_COOLDOWNS = {
  'tab-switch': 2000,
  'fullscreen-exit': 2000,
  'copy-attempt': 1500,
  'paste-attempt': 1500,
  'right-click': 1500,
  'phone-detected': 3500,
};
const lastViolationTs = {};

const canLogViolation = (type) => {
  const now = Date.now();
  const cooldown = VIOLATION_COOLDOWNS[type] || 2000;
  if (now - (lastViolationTs[type] || 0) < cooldown) return false;
  lastViolationTs[type] = now;
  return true;
};

const ExamEnvironment = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Init & Loading Phase ──────────────────────────────────────────────────
  const [initPhase, setInitPhase] = useState('loading'); // 'loading' | 'ready'
  const [initStatusText, setInitStatusText] = useState('Initializing proctoring engine...');
  const [modelProgress, setModelProgress] = useState(0);

  // ── Fullscreen state ──────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(true);

  // ── Exam data ─────────────────────────────────────────────────────────────
  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [statuses, setStatuses] = useState({});
  const [curIdx, setCurIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // ── Multi-Section State ───────────────────────────────────────────────────
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionTimeRemaining, setSectionTimeRemaining] = useState(null);
  const [showNextSectionModal, setShowNextSectionModal] = useState(false);
  const [advancingSection, setAdvancingSection] = useState(false);

  // ── Anti-cheat state ──────────────────────────────────────────────────────
  const [violationCount, setViolationCount] = useState(0);
  const [violations, setViolations] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockCode, setUnlockCode] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [showViolations, setShowViolations] = useState(false);
  const [phoneDetected, setPhoneDetected] = useState(false);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [timeRemaining, setTimeRemaining] = useState(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const detectionHandleRef = useRef(null);
  const autoSaveIntervalRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const timerTimeoutRef = useRef(null);
  const sectionTimeoutRef = useRef(null);
  const subRef = useRef(null);
  const ansRef = useRef({});
  const lockedRef = useRef(false);
  const examRef = useRef(null);
  const currentSectionRef = useRef(0);

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTACH WEBCAM STREAM
  // ═══════════════════════════════════════════════════════════════════════════
  const attachStreamToVideo = useCallback((videoEl) => {
    if (videoEl && webcamStreamRef.current) {
      if (videoEl.srcObject !== webcamStreamRef.current) {
        videoEl.srcObject = webcamStreamRef.current;
        videoEl.play().catch(() => {});
      }
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // FULLSCREEN HELPER
  // ═══════════════════════════════════════════════════════════════════════════
  const enterFullscreen = useCallback(async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();
      else if (el.msRequestFullscreen) await el.msRequestFullscreen();
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request:', err);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Bootstrap: Model + Camera + Session + Detection Loop
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let isCancelled = false;
    let detectionRunning = true;
    let currentlyFlagged = false;
    let lastDetectAt = 0;

    const bootstrap = async () => {
      try {
        // 1. Request Webcam (480x360)
        setInitStatusText('Starting webcam...');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 480, height: 360 },
            audio: false,
          });
          webcamStreamRef.current = stream;
        } catch (camErr) {
          console.error('[ExamEnv] Webcam error:', camErr);
          toast.error('Webcam access is required for proctoring.');
          navigate('/student');
          return;
        }

        // 2. Load YOLO Model
        setInitStatusText('Loading YOLOv8 AI Proctor (GPU WebGPU / WASM)...');
        try {
          await initYOLO((p) => {
            if (!isCancelled) setModelProgress(p);
          });
        } catch (yoloErr) {
          console.warn('[ExamEnv] YOLO fallback to standard proctoring:', yoloErr);
        }

        if (isCancelled) return;

        // 3. Connect to Exam Session
        setInitStatusText('Connecting to exam session...');
        const { data: sd } = await startExam(examId);

        // Guard: already submitted
        const sub = sd.submission;
        if (sub.status === 'submitted' || sub.status === 'auto-submitted') {
          cleanup();
          toast('You have already submitted this exam.', { icon: '🔒' });
          navigate(`/student/result/${examId}`, { replace: true });
          return;
        }

        if (isCancelled) return;

        setSubmission(sub);
        subRef.current = sub;
        examRef.current = sd.exam;
        setExam(sd.exam);

        // Rebuild answers and status maps
        const initAns = {};
        const initSt = {};
        sub.answers?.forEach((a) => {
          initAns[a.questionId] = {
            selectedOptions: a.selectedOptions || [],
            textResponse: a.textResponse || '',
          };
          initSt[a.questionId] =
            a.selectedOptions?.length > 0 || a.textResponse?.trim()
              ? STATUS.ANSWERED
              : STATUS.NOT_VISITED;
        });
        setAnswers(initAns);
        ansRef.current = initAns;
        setStatuses(initSt);
        setViolationCount(sub.violationCount || 0);
        setIsLocked(sub.isLocked || false);
        lockedRef.current = sub.isLocked || false;
        setViolations(sub.violations || []);

        // Section initialization
        const currSec = sub.currentSection || 0;
        setCurrentSection(currSec);
        currentSectionRef.current = currSec;

        // Global Timer
        const now = Date.now();
        const end = new Date(sd.exam.endTime).getTime();
        const dur = sd.exam.duration * 60000;
        const started = new Date(sub.startedAt).getTime();
        const elapsed = now - started;
        setTimeRemaining(Math.floor(Math.max(0, Math.min(end - now, dur - elapsed)) / 1000));

        // Multi-Section Isolated Timer
        if (sd.exam.isMultiSection && sd.exam.sections?.[currSec]) {
          const secDur = (sd.exam.sections[currSec].duration || 30) * 60000;
          const secStarted = sub.sectionStartedAt ? new Date(sub.sectionStartedAt).getTime() : started;
          const secElapsed = now - secStarted;
          setSectionTimeRemaining(Math.floor(Math.max(0, secDur - secElapsed) / 1000));
        }

        // Check Fullscreen
        setIsFullscreen(!!document.fullscreenElement);

        setInitPhase('ready');

        // 4. Start Auto-Save (every 25s)
        autoSaveIntervalRef.current = setInterval(async () => {
          if (lockedRef.current || !subRef.current) return;
          try {
            await saveAnswers(
              subRef.current._id,
              Object.entries(ansRef.current).map(([qid, a]) => ({
                questionId: qid,
                selectedOptions: a.selectedOptions || [],
                textResponse: a.textResponse || '',
              }))
            );
          } catch { /* silent auto-save fail */ }
        }, 25000);

        // 5. Start Heartbeat (every 5s) — keeps admin live monitor accurate and low latency
        const sendHeartbeat = async () => {
          if (!subRef.current) return;
          try { await heartbeatExam(subRef.current._id); } catch { /* silent */ }
        };
        sendHeartbeat(); // immediate ping on load
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, 5000);

        // 6. Mark disconnect on tab-close / back-navigation via sendBeacon
        //    (sendBeacon works even when the page is being unloaded)
        const handleUnload = () => {
          if (!subRef.current) return;
          const token = localStorage.getItem('token');
          const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/submissions/${subRef.current._id}/heartbeat`;
          // Stop heartbeat immediately — don't send a beacon since we want the
          // 45s window to naturally expire and remove the student from live view.
          clearInterval(heartbeatIntervalRef.current);
        };
        window.addEventListener('beforeunload', handleUnload);
        window.addEventListener('pagehide', handleUnload);

        // 7. Attach Anti-Cheat Listeners
        attachAntiCheat();
      } catch (err) {
        console.error('[ExamEnv] Init error:', err);
        const msg = err.response?.data?.message || 'Failed to initialize exam.';
        if (
          err.response?.status === 400 &&
          (err.response?.data?.alreadySubmitted || msg.includes('already submitted'))
        ) {
          clearInterval(heartbeatIntervalRef.current);
          toast('You have already submitted this exam.', { icon: '🔒' });
          navigate(`/student/result/${examId}`, { replace: true });
        } else {
          toast.error(msg);
          navigate('/student');
        }
      }
    };

    bootstrap();

    return () => {
      isCancelled = true;
      clearInterval(heartbeatIntervalRef.current);
      window.removeEventListener('beforeunload', () => clearInterval(heartbeatIntervalRef.current));
      window.removeEventListener('pagehide', () => clearInterval(heartbeatIntervalRef.current));
      // Stop webcam
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach((t) => t.stop());
        webcamStreamRef.current = null;
      }
      clearInterval(autoSaveIntervalRef.current);
      clearTimeout(timerTimeoutRef.current);
      stopDetectionLoop();
    };
  }, [examId]);


  // Keep webcam attached whenever videoRef mounts or updates
  useEffect(() => {
    if (initPhase === 'ready' && videoRef.current) {
      attachStreamToVideo(videoRef.current);
    }
  }, [initPhase, attachStreamToVideo]);

  // Start YOLO device detection loop once component is ready and video DOM element exists
  useEffect(() => {
    if (initPhase !== 'ready' || !videoRef.current) return;

    let currentlyFlagged = false;
    startDetectionLoop(videoRef.current, (detections) => {
      if (lockedRef.current) return;

      if (detections.length > 0) {
        setPhoneDetected(true);
        if (!currentlyFlagged) {
          currentlyFlagged = true;
          const loggedThisTick = new Set();
          detections.forEach((p) => {
            const devName = p.className || p.class;
            if (loggedThisTick.has(devName)) return;
            loggedThisTick.add(devName);
            const snap = captureSnapshot(videoRef.current);
            pushViolation(
              'phone-detected',
              `Prohibited device detected: ${devName} (${(p.score * 100).toFixed(0)}%)`,
              snap
            );
          });
        }
      } else {
        setPhoneDetected(false);
        currentlyFlagged = false;
      }
    });

    return () => {
      stopDetectionLoop();
    };
  }, [initPhase]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL TIMER TICK
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (timeRemaining === null || initPhase !== 'ready') return;
    if (timeRemaining <= 0) {
      handleAutoSubmit();
      return;
    }
    timerTimeoutRef.current = setTimeout(() => setTimeRemaining((t) => t - 1), 1000);
    return () => clearTimeout(timerTimeoutRef.current);
  }, [timeRemaining, initPhase]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION TIMER TICK
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (sectionTimeRemaining === null || initPhase !== 'ready') return;
    if (sectionTimeRemaining <= 0) {
      handleAutoAdvanceSection();
      return;
    }
    sectionTimeoutRef.current = setTimeout(() => setSectionTimeRemaining((t) => t - 1), 1000);
    return () => clearTimeout(sectionTimeoutRef.current);
  }, [sectionTimeRemaining, initPhase]);

  // ═══════════════════════════════════════════════════════════════════════════
  // VIOLATION LOGGER
  // ═══════════════════════════════════════════════════════════════════════════
  const pushViolation = async (type, desc = '', snap = null) => {
    if (!subRef.current || lockedRef.current) return;
    if (!canLogViolation(type)) return;

    // Store captured image snapshot ONLY for device detection violations
    let evidenceSnapshot = null;
    if (type === 'phone-detected' || type === 'device-detected') {
      evidenceSnapshot = snap || (videoRef.current ? captureSnapshot(videoRef.current) : null);
    }

    try {
      const { data } = await logViolation(subRef.current._id, {
        type,
        description: desc,
        evidenceSnapshot,
      });

      setViolationCount(data.violationCount);
      setViolations((prev) => [
        ...prev,
        { type, description: desc, timestamp: new Date(), evidenceSnapshot },
      ]);

      if (data.isLocked) {
        setIsLocked(true);
        lockedRef.current = true;
        toast.error('🔒 Exam Locked: Violation limit reached!', { duration: 6000 });
      } else {
        const threshold = examRef.current?.violationThreshold || 3;
        const left = threshold - data.violationCount;
        toast.error(
          `⚠ Violation (${type.replace(/-/g, ' ')}): ${data.violationCount}/${threshold} logged! (${left} remaining)`,
          { duration: 4000 }
        );
      }
    } catch (err) {
      console.error('Violation push error:', err);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ANTI-CHEAT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════
  const attachAntiCheat = () => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' || document.hidden) {
        if (!lockedRef.current) {
          pushViolation('tab-switch', 'Tab switched or browser window minimized');
        }
      }
    };

    const onBlur = () => {
      if (!lockedRef.current && (!document.hasFocus() || document.visibilityState === 'hidden')) {
        pushViolation('tab-switch', 'Switched application focus away from exam');
      }
    };

    const onFullscreenChange = () => {
      const inFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(inFs);
      if (!inFs && !lockedRef.current) {
        pushViolation('fullscreen-exit', 'Exited fullscreen mode');
      }
    };

    const onCopy = (e) => {
      e.preventDefault();
      pushViolation('copy-attempt', 'Copy command blocked (Ctrl+C / copy)');
    };

    const onPaste = (e) => {
      e.preventDefault();
      pushViolation('paste-attempt', 'Paste command blocked (Ctrl+V / paste)');
    };

    const onContextMenu = (e) => {
      e.preventDefault();
      pushViolation('right-click', 'Right-click menu blocked');
    };

    const onKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        pushViolation('copy-attempt', 'PrintScreen shortcut blocked');
      }
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        if (e.key.toLowerCase() === 'c') pushViolation('copy-attempt', 'Ctrl+C shortcut blocked');
        else if (e.key.toLowerCase() === 'v') pushViolation('paste-attempt', 'Ctrl+V shortcut blocked');
      }
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i'))) {
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);

    window.__acCleanup = () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════
  const cleanup = useCallback(() => {
    stopDetectionLoop();
    clearInterval(autoSaveIntervalRef.current);
    clearTimeout(timerTimeoutRef.current);
    clearTimeout(sectionTimeoutRef.current);
    webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
    window.__acCleanup?.();
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    } catch { /* ignore */ }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBMIT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleAutoSubmit = useCallback(async () => {
    if (!subRef.current) return;
    cleanup();
    try {
      await submitExam(subRef.current._id, true);
      toast.success('Time is up! Exam auto-submitted.');
    } catch { /* ignore */ }
    navigate(`/student/result/${examId}`, { replace: true });
  }, [cleanup, navigate, examId]);

  const handleManualSubmit = async () => {
    if (!subRef.current) return;
    setSubmitting(true);
    cleanup();
    try {
      await saveAnswers(
        subRef.current._id,
        Object.entries(ansRef.current).map(([qid, a]) => ({
          questionId: qid,
          selectedOptions: a.selectedOptions || [],
          textResponse: a.textResponse || '',
        }))
      );
      await submitExam(subRef.current._id, false);
      toast.success('Exam submitted successfully!');
      navigate(`/student/result/${examId}`, { replace: true });
    } catch {
      toast.error('Failed to submit exam. Please try again.');
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MULTI-SECTION PROGRESSION
  // ═══════════════════════════════════════════════════════════════════════════
  const handleAutoAdvanceSection = useCallback(async () => {
    if (!examRef.current?.isMultiSection || !subRef.current) return;
    const totalSecs = examRef.current.sections?.length || 0;
    const curSec = currentSectionRef.current;
    if (curSec >= totalSecs - 1) {
      handleAutoSubmit();
    } else {
      try {
        await saveAnswers(
          subRef.current._id,
          Object.entries(ansRef.current).map(([qid, a]) => ({
            questionId: qid,
            selectedOptions: a.selectedOptions || [],
            textResponse: a.textResponse || '',
          }))
        );
        const { data } = await nextSection(subRef.current._id, 0);
        setCurrentSection(data.currentSection);
        currentSectionRef.current = data.currentSection;
        setCurIdx(0);
        const nextSecDur = (examRef.current.sections[data.currentSection]?.duration || 30) * 60;
        setSectionTimeRemaining(nextSecDur);
        toast.success(
          `Section time completed. Moved to Section ${data.currentSection + 1}: ${examRef.current.sections[data.currentSection]?.title}`
        );
      } catch (err) {
        console.error('Auto next section error:', err);
      }
    }
  }, [handleAutoSubmit]);

  const handleManualNextSection = async () => {
    if (!subRef.current || advancingSection) return;
    setAdvancingSection(true);
    try {
      await saveAnswers(
        subRef.current._id,
        Object.entries(ansRef.current).map(([qid, a]) => ({
          questionId: qid,
          selectedOptions: a.selectedOptions || [],
          textResponse: a.textResponse || '',
        }))
      );
      const { data } = await nextSection(subRef.current._id, sectionTimeRemaining || 0);
      setCurrentSection(data.currentSection);
      currentSectionRef.current = data.currentSection;
      setCurIdx(0);
      const nextSecDur = (examRef.current.sections[data.currentSection]?.duration || 30) * 60;
      setSectionTimeRemaining(nextSecDur);
      setShowNextSectionModal(false);
      toast.success(
        `Entered Section ${data.currentSection + 1}: ${examRef.current.sections[data.currentSection]?.title}`
      );
    } catch (err) {
      toast.error('Failed to advance to next section. Please try again.');
    } finally {
      setAdvancingSection(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // UNLOCK HANDLER
  // ═══════════════════════════════════════════════════════════════════════════
  const handleUnlock = async () => {
    if (!unlockCode.trim()) {
      toast.error('Please enter the unlock code.');
      return;
    }
    setUnlocking(true);
    try {
      const { data } = await unlockExam(subRef.current._id, unlockCode.trim());
      setIsLocked(false);
      lockedRef.current = false;
      setUnlockCode('');
      setViolationCount(data.violationCount);
      toast.success(data.message || 'Exam unlocked! Resuming your session.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Incorrect unlock code. Please contact faculty.';
      toast.error(msg);
    } finally {
      setUnlocking(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ANSWER SELECTION
  // ═══════════════════════════════════════════════════════════════════════════
  const handleAnswer = (qid, type, val) => {
    setAnswers((prev) => {
      const updated = {
        ...prev,
        [qid]: { ...prev[qid], ...(type === 'text' ? { textResponse: val } : { selectedOptions: val }) },
      };
      ansRef.current = updated;
      return updated;
    });
    setStatuses((prev) => ({ ...prev, [qid]: STATUS.ANSWERED }));
  };

  const toggleMCQ = (qid, idx) => handleAnswer(qid, 'opts', [idx]);
  const toggleMSQ = (qid, idx) => {
    const cur = answers[qid]?.selectedOptions || [];
    handleAnswer(qid, 'opts', cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx]);
  };
  const toggleReview = (qid) =>
    setStatuses((prev) => ({
      ...prev,
      [qid]:
        prev[qid] === STATUS.REVIEW
          ? answers[qid]?.selectedOptions?.length || answers[qid]?.textResponse?.trim()
            ? STATUS.ANSWERED
            : STATUS.NOT_ANSWERED
          : STATUS.REVIEW,
    }));

  const formatTime = (s) => {
    if (s === null || s === undefined) return '--:--';
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL LOADING VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (initPhase === 'loading') {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 text-center px-4">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 border-4 border-primary-900 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-primary-400 rounded-full animate-spin" />
          <Shield className="absolute inset-0 m-auto w-8 h-8 text-primary-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Launching Exam Environment</h2>
        <p className="text-slate-400 text-sm mb-5">{initStatusText}</p>
        <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${modelProgress}%` }}
          />
        </div>
        <p className="text-slate-500 text-xs">{modelProgress}% Complete</p>
      </div>
    );
  }

  const isMulti = exam?.isMultiSection && exam?.sections?.length > 0;
  const currentSectionData = isMulti ? exam.sections[currentSection] : null;
  const qs = isMulti ? (currentSectionData?.questions || []) : (exam?.questions || []);
  const curQ = qs[curIdx];
  const curAns = curQ ? answers[curQ._id] || {} : {};
  const isLastSection = !isMulti || (currentSection >= (exam?.sections?.length || 1) - 1);
  const answeredCount = qs.filter((q) => statuses[q._id] === STATUS.ANSWERED).length;

  const timerCls =
    timeRemaining === null
      ? 'text-slate-600'
      : timeRemaining < 300
      ? 'text-red-600 animate-pulse font-extrabold'
      : timeRemaining < 600
      ? 'text-amber-600'
      : 'text-slate-800';

  const secTimerCls =
    sectionTimeRemaining === null
      ? 'text-purple-700'
      : sectionTimeRemaining < 180
      ? 'text-red-600 animate-pulse font-extrabold'
      : sectionTimeRemaining < 300
      ? 'text-amber-600'
      : 'text-purple-700';

  return (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden select-none">
      {/* ── FULLSCREEN PROMPT OVERLAY ───────────────────────────────────────── */}
      {!isFullscreen && !isLocked && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-center text-white shadow-2xl">
            <div className="w-16 h-16 bg-primary-500/20 text-primary-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Maximize className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Fullscreen Mode Required</h2>
            <p className="text-slate-400 text-sm mb-6">
              To prevent cheating, this exam must be taken in full screen mode.
            </p>
            <button
              onClick={enterFullscreen}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              <Maximize className="w-5 h-5" /> Enter Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* ── LOCK SCREEN ─────────────────────────────────────────────────────── */}
      {isLocked && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md w-full animate-slide-up">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-red-500/30">
              <Lock className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Exam Locked</h2>
            <p className="text-red-300 mb-6 text-sm">
              Your exam has been locked because you reached the maximum allowed violations limit.
            </p>

            <button
              onClick={() => setShowViolations(!showViolations)}
              className="mb-4 px-4 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-xs font-medium hover:bg-white/20 transition-all"
            >
              <Eye className="w-3.5 h-3.5 inline mr-1.5" />
              {showViolations ? 'Hide' : 'View'} Violation Log ({violationCount})
            </button>

            {showViolations && violations.length > 0 && (
              <div className="bg-red-950/60 rounded-xl border border-red-800/50 p-4 mb-6 text-left space-y-2 max-h-48 overflow-y-auto">
                {violations.map((v, i) => (
                  <div key={i} className="text-sm">
                    <span className="text-red-300 font-medium capitalize">
                      {i + 1}. {v.type?.replace(/-/g, ' ')}
                    </span>
                    {v.description && <p className="text-red-400 text-xs mt-0.5">{v.description}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-slate-300 text-sm mb-3">
                Enter the unlock code provided by your faculty / invigilator:
              </p>
              <div className="flex gap-2">
                <input
                  id="unlock-input"
                  value={unlockCode}
                  onChange={(e) => setUnlockCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  placeholder="Enter Unlock Code"
                  className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500/60 text-center font-mono tracking-wider"
                />
                <button
                  id="unlock-btn"
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="px-5 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-500 disabled:opacity-50 transition-all"
                >
                  {unlocking ? '...' : 'Unlock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NEXT SECTION CONFIRM MODAL ───────────────────────────────────────── */}
      {showNextSectionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Proceed to Next Section?
            </h3>
            <p className="text-sm font-medium text-purple-800 mb-3">
              Completing: {currentSectionData?.title}
            </p>
            <div className="space-y-2 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5">
              <p className="text-amber-900 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                Important: One-Way Progression
              </p>
              <p>
                Once you proceed to the next section, your answers for this section will be finalized and locked. You <strong>cannot navigate back</strong> to this section later.
              </p>
              <p>
                You have answered <strong>{answeredCount}</strong> of <strong>{qs.length}</strong> questions in this section.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNextSectionModal(false)}
                className="btn-ghost"
              >
                Return to Questions
              </button>
              <button
                onClick={handleManualNextSection}
                disabled={advancingSection}
                className="btn-primary bg-purple-600 hover:bg-purple-700"
              >
                {advancingSection ? <div className="spinner" /> : 'Yes, Proceed to Next Section'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBMIT CONFIRM MODAL ─────────────────────────────────────────────── */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Submit Exam?</h3>
            <div className="space-y-2 text-sm text-slate-600 mb-5">
              <p>
                You've answered <strong className="text-slate-800">{answeredCount}</strong> of{' '}
                <strong className="text-slate-800">{qs.length}</strong> questions in this section.
              </p>
              {answeredCount < qs.length && (
                <p className="text-amber-600 font-medium">
                  ⚠ Unanswered questions will receive 0 marks.
                </p>
              )}
              <p>Are you sure you want to finalize and submit your entire exam?</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSubmitModal(false)} className="btn-ghost">
                Cancel
              </button>
              <button
                id="confirm-submit"
                onClick={handleManualSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? <div className="spinner" /> : <><Send className="w-4 h-4" /> Submit Exam</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP HEADER BAR ──────────────────────────────────────────────────── */}
      <div className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-5 flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary-600 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm truncate max-w-xs">{exam?.title}</span>
            {isMulti && (
              <span className="badge badge-purple text-xs font-semibold flex items-center gap-1">
                <Layers className="w-3 h-3" /> Sec {currentSection + 1}/{exam.sections.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {!isFullscreen && (
            <button
              onClick={enterFullscreen}
              className="btn-secondary btn-sm flex items-center gap-1.5 text-xs text-amber-600 border-amber-300 bg-amber-50"
            >
              <Maximize className="w-3.5 h-3.5" /> Fullscreen
            </button>
          )}

          {phoneDetected && (
            <span className="badge badge-red animate-pulse text-xs">⚠ Device Detected!</span>
          )}

          {/* Section Isolated Timer if Multi-Section */}
          {isMulti && (
            <div className={`flex items-center gap-1 font-mono font-bold text-sm bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 ${secTimerCls}`} title="Section Remaining Time">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-normal text-purple-600 mr-0.5">Section:</span>
              {formatTime(sectionTimeRemaining)}
            </div>
          )}

          {/* Global Exam Timer */}
          <div className={`flex items-center gap-1 font-mono font-bold text-sm bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 ${timerCls}`} title="Total Exam Remaining Time">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-normal text-slate-500 mr-0.5">Total:</span>
            {formatTime(timeRemaining)}
          </div>

          <div
            className={`badge text-xs font-semibold ${
              violationCount === 0
                ? 'badge-green'
                : violationCount >= (exam?.violationThreshold || 3) - 1
                ? 'badge-red'
                : 'badge-yellow'
            }`}
          >
            {violationCount}/{exam?.violationThreshold || 3} Violations
          </div>

          {isLastSection ? (
            <button id="submit-btn" onClick={() => setShowSubmitModal(true)} className="btn-primary btn-sm">
              <Send className="w-3.5 h-3.5" /> Submit
            </button>
          ) : (
            <button
              id="next-section-header-btn"
              onClick={() => setShowNextSectionModal(true)}
              className="btn-primary btn-sm bg-purple-600 hover:bg-purple-700"
            >
              Next Section <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN EXAM LAYOUT ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── SECURITY WATERMARK OVERLAY ── */}
        <div className="exam-watermark-container pointer-events-none select-none z-0">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} className="exam-watermark-item">
              {user?.name || 'STUDENT'} • {user?.rollNumber || user?.email || 'RGUKT'} • {exam?.examCode || 'EXAM'}
            </span>
          ))}
        </div>

        {/* ── LEFT: QUESTION VIEWER & NAVIGATION ───────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          {/* Section banner header if multi-section */}
          {isMulti && (
            <div className="px-6 py-2.5 bg-purple-50/80 border-b border-purple-100 flex items-center justify-between text-xs backdrop-blur-sm">
              <span className="font-semibold text-purple-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                Section {currentSection + 1} of {exam.sections.length}: <strong>{currentSectionData?.title}</strong>
              </span>
              <span className="text-purple-700 font-medium">
                {qs.length} Questions in this section
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {curQ ? (
              <div className="max-w-3xl mx-auto space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold text-slate-700">
                      Question {curIdx + 1} <span className="text-slate-400 font-normal text-sm">of {qs.length}</span>
                    </span>
                    <span
                      className={`badge text-xs font-semibold px-2.5 py-0.5 ${
                        curQ.type === 'MCQ' ? 'badge-blue' : curQ.type === 'MSQ' ? 'badge-yellow' : 'badge-gray'
                      }`}
                    >
                      {curQ.type}
                    </span>
                    <span className="badge badge-gray text-xs">+{exam?.marksPerQuestion} mark</span>
                    {exam?.negativeMarking && (
                      <span className="badge badge-red text-xs">−{exam?.negativeMarkValue} mark</span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleReview(curQ._id)}
                    className={`btn-ghost btn-sm text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                      statuses[curQ._id] === STATUS.REVIEW
                        ? 'text-amber-700 bg-amber-100 border-amber-300 shadow-sm'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⭐ {statuses[curQ._id] === STATUS.REVIEW ? 'Marked for Review' : 'Mark for Review'}
                  </button>
                </div>

                {/* Question Box */}
                <div className="card shadow-sm border border-slate-200/80">
                  <div className="p-6">
                    <p className="text-slate-800 font-semibold leading-relaxed text-lg">{curQ.questionText}</p>
                    {curQ.imageUrl && (
                      <img
                        src={curQ.imageUrl}
                        alt="Question Diagram"
                        className="mt-4 max-h-72 rounded-xl object-contain border border-slate-100 shadow-sm"
                      />
                    )}
                  </div>
                </div>

                {/* Answer Options Box */}
                <div className="card shadow-sm border border-slate-200/80">
                  <div className="p-6 space-y-3.5">
                    {/* MCQ */}
                    {curQ.type === 'MCQ' &&
                      curQ.options?.map((opt, idx) => {
                        const isSelected = curAns.selectedOptions?.includes(idx);
                        return (
                          <label
                            key={idx}
                            className={`flex items-center gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-primary-600 bg-primary-50/70 shadow-sm ring-1 ring-primary-300'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`mcq-${curQ._id}`}
                              checked={isSelected || false}
                              onChange={() => toggleMCQ(curQ._id, idx)}
                              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                            />
                            <span
                              className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-primary-600 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className={`text-sm ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                              {opt}
                            </span>
                          </label>
                        );
                      })}

                    {/* MSQ */}
                    {curQ.type === 'MSQ' && (
                      <>
                        <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                          <span>☑ Select all correct options that apply:</span>
                        </p>
                        {curQ.options?.map((opt, idx) => {
                          const isSelected = curAns.selectedOptions?.includes(idx);
                          return (
                            <label
                              key={idx}
                              className={`flex items-center gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-primary-600 bg-primary-50/70 shadow-sm ring-1 ring-primary-300'
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected || false}
                                onChange={() => toggleMSQ(curQ._id, idx)}
                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                              />
                              <span
                                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className={`text-sm ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                                {opt}
                              </span>
                            </label>
                          );
                        })}
                      </>
                    )}

                    {/* FILL_BLANK */}
                    {curQ.type === 'FILL_BLANK' && (
                      <div className="space-y-2">
                        <label className="form-label font-medium text-slate-700">Type your answer below:</label>
                        <input
                          type={curQ.fillBlankType === 'number' ? 'number' : 'text'}
                          step="any"
                          value={curAns.textResponse || ''}
                          onChange={(e) => handleAnswer(curQ._id, 'text', e.target.value)}
                          placeholder={
                            curQ.fillBlankType === 'number' ? 'Enter numerical value (e.g. 42 or 3.14)...' : 'Type exact answer...'
                          }
                          className="form-input max-w-md text-base py-3 px-4 font-mono"
                          autoComplete="off"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Navigation Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                  <button
                    id="prev-q"
                    onClick={() => setCurIdx((i) => Math.max(0, i - 1))}
                    disabled={curIdx === 0}
                    className="btn-secondary px-6 py-2.5 text-sm font-semibold rounded-xl w-full sm:w-auto"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous Question
                  </button>

                  <span className="text-xs text-slate-500 font-medium order-first sm:order-none">
                    <strong>{answeredCount}</strong> of <strong>{qs.length}</strong> questions answered
                  </span>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button
                      id="next-q"
                      onClick={() => setCurIdx((i) => Math.min(qs.length - 1, i + 1))}
                      disabled={curIdx === qs.length - 1}
                      className="btn-secondary px-6 py-2.5 text-sm font-semibold rounded-xl flex-1 sm:flex-initial"
                    >
                      Next Question <ChevronRight className="w-4 h-4" />
                    </button>

                    {!isLastSection && curIdx === qs.length - 1 && (
                      <button
                        onClick={() => setShowNextSectionModal(true)}
                        className="btn-primary px-6 py-2.5 text-sm font-bold bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md flex-1 sm:flex-initial"
                      >
                        Next Section <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-20">No questions available in this section.</div>
            )}
          </div>
        </div>

        {/* ── RIGHT: LIVE PROCTOR CAMERA & PALETTE ─────────────────────────── */}
        <div className="w-72 bg-white border-l border-slate-200 flex flex-col overflow-hidden flex-shrink-0 relative z-10 shadow-sm">
          {/* Live Webcam Tile */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
            <div
              className={`relative rounded-2xl overflow-hidden bg-slate-900 shadow-sm ${
                phoneDetected ? 'ring-2 ring-red-500 shadow-lg shadow-red-500/30' : 'ring-1 ring-slate-200'
              }`}
              style={{ aspectRatio: '4/3' }}
            >
              <video
                ref={(el) => {
                  videoRef.current = el;
                  attachStreamToVideo(el);
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2">
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    phoneDetected ? 'bg-red-600 text-white' : 'bg-emerald-600/90 text-white backdrop-blur-sm'
                  }`}
                >
                  {phoneDetected ? '⚠ Device' : '● Live Face'}
                </span>
              </div>
            </div>
            {phoneDetected && (
              <p className="text-red-600 text-xs font-bold mt-1.5 text-center animate-pulse">
                Unauthorized device detected!
              </p>
            )}
          </div>

          {/* Question Palette with Enlarged Controls */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isMulti ? `Section ${currentSection + 1} Palette` : 'Question Palette'}
              </p>
              <span className="text-xs text-slate-400 font-medium">{qs.length} Total</span>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-200 flex-shrink-0" />
                <span className="text-slate-600">Not Visited</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 flex-shrink-0" />
                <span className="text-slate-600">Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-100 border border-red-200 flex-shrink-0" />
                <span className="text-slate-600">Not Answered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400 flex-shrink-0" />
                <span className="text-slate-600">Marked Review</span>
              </div>
            </div>

            {/* Enlarged Palette Grid */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {qs.map((q, idx) => {
                const st = statuses[q._id] || STATUS.NOT_VISITED;
                const isCur = idx === curIdx;

                let btnClass = 'palette-not-visited';
                if (isCur) {
                  btnClass = 'palette-current';
                } else if (st === STATUS.ANSWERED) {
                  btnClass = 'palette-answered';
                } else if (st === STATUS.REVIEW) {
                  btnClass = 'palette-review';
                } else if (st === STATUS.NOT_ANSWERED) {
                  btnClass = 'palette-not-answered';
                }

                return (
                  <button
                    key={q._id}
                    id={`palette-q-${idx + 1}`}
                    onClick={() => setCurIdx(idx)}
                    className={btnClass}
                    title={`Question ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Indicator and Answered Counter */}
          <div className="p-3.5 border-t border-slate-100 bg-slate-50 space-y-2">
            {isMulti && (
              <div className="text-xs bg-white p-2.5 rounded-xl border border-slate-200 text-center shadow-sm">
                <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Active Section</p>
                <p className="font-bold text-purple-900 truncate mt-0.5">
                  {currentSection + 1}. {currentSectionData?.title}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs text-center">
              <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-100">
                <p className="font-extrabold text-emerald-600 text-xl">{answeredCount}</p>
                <p className="text-slate-400 text-[11px] font-medium">Answered</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 shadow-sm border border-slate-100">
                <p className="font-extrabold text-slate-600 text-xl">{qs.length - answeredCount}</p>
                <p className="text-slate-400 text-[11px] font-medium">Remaining</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamEnvironment;
