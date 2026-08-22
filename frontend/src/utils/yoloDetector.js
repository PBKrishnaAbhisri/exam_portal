import * as ort from 'onnxruntime-web';

// ── Configuration Constants ──────────────────────────────────────────────────
const MODEL_URL = '/models/yolov8m.onnx';
const MODEL_INPUT_SIZE = 640;

const TARGET_CLASSES = {
  67: 'cell phone',
  63: 'laptop',
  62: 'tv',
  65: 'remote',
};

const CLASS_THRESHOLDS = {
  'cell phone': 0.35,
  'laptop': 0.55,
  'tv': 0.55,
  'remote': 0.5,
};

const MODEL_MIN_SCORE = 0.3;
const NMS_IOU_THRESHOLD = 0.45;
export const DETECTION_INTERVAL_MS = 250;

// ── Session & State Variables ────────────────────────────────────────────────
let ortSession = null;
let activeBackend = null;
let lastInferenceLatency = 0;

// Loop management
let detectionRunning = false;
let detectionHandle = null;
let inferenceRunning = false;
let lastDetectAt = 0;

// Offscreen Letterbox Canvas
const letterboxCanvas = document.createElement('canvas');
letterboxCanvas.width = MODEL_INPUT_SIZE;
letterboxCanvas.height = MODEL_INPUT_SIZE;
const lctx = letterboxCanvas.getContext('2d', { willReadFrequently: true });

/**
 * Helper to dynamically determine the exact installed onnxruntime-web version.
 * 1. Checks Vite build-time define `__ORT_VERSION__` (read from node_modules)
 * 2. Checks runtime ONNX Runtime environment versions (ort.env.versions.web / common)
 * 3. Falls back to installed base version '1.27.0'
 */
export function getOrtVersion() {
  if (typeof __ORT_VERSION__ !== 'undefined' && __ORT_VERSION__) {
    return __ORT_VERSION__;
  }
  if (ort.env?.versions?.web) {
    return ort.env.versions.web;
  }
  if (ort.env?.versions?.common) {
    return ort.env.versions.common;
  }
  return '1.27.0';
}

// ── 1. Model Initialization (Dynamic CDN with Local Fallback) ────────────────
/**
 * Initializes the YOLOv8m ONNX session.
 * 
 * PRIMARY PATH:
 *   Loads matching runtime files from jsDelivr CDN using the dynamically detected version
 *   of onnxruntime-web (`https://cdn.jsdelivr.net/npm/onnxruntime-web@<version>/dist/`).
 *   Tries WebGPU provider first, then falls back to WASM provider.
 * 
 * FALLBACK PATH:
 *   If the CDN is unreachable / blocked, attempts to initialize using local assets
 *   at `/models/` or local paths as a last-resort fallback.
 * 
 * If all paths fail, throws an error so ExamEnvironment falls back to standard proctoring.
 *
 * @param {Function} [onProgress] - Optional progress callback (0 - 100)
 * @returns {Promise<string>} The active backend ('webgpu' or 'wasm')
 */
export async function initYOLO(onProgress) {
  if (ortSession) {
    if (onProgress) onProgress(100);
    return activeBackend;
  }

  const report = (p) => {
    if (typeof onProgress === 'function') onProgress(p);
  };

  report(10);

  const installedVersion = getOrtVersion();
  const cdnWasmPath = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${installedVersion}/dist/`;

  console.log(`[YOLO] Detected onnxruntime-web version: ${installedVersion}`);
  console.log(`[YOLO] Setting primary CDN wasmPaths: ${cdnWasmPath}`);

  // PRIMARY: Configure dynamic CDN path matching the exact installed version
  ort.env.wasm.wasmPaths = cdnWasmPath;
  ort.env.wasm.numThreads = navigator.hardwareConcurrency
    ? Math.min(navigator.hardwareConcurrency, 4)
    : 2;

  let primaryCdnError = null;

  // ── ATTEMPT 1 (PRIMARY): CDN Path with WebGPU ──
  try {
    report(30);
    ortSession = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['webgpu'],
      graphOptimizationLevel: 'all',
    });
    activeBackend = 'webgpu';
    report(80);
  } catch (gpuError) {
    console.warn('[YOLO] Primary CDN WebGPU provider initialization failed:', gpuError);
  }

  // ── ATTEMPT 2 (PRIMARY): CDN Path with WASM ──
  if (!ortSession) {
    try {
      report(50);
      ortSession = await ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      activeBackend = 'wasm';
      report(80);
    } catch (wasmError) {
      console.warn('[YOLO] Primary CDN WASM provider initialization failed:', wasmError);
      primaryCdnError = wasmError;
    }
  }

  // ── ATTEMPT 3 (FALLBACK): If CDN completely failed, try local fallback at /models/ ──
  if (!ortSession) {
    console.warn('[YOLO] CDN failed for both WebGPU and WASM. Attempting local fallback path (/models/)...');
    try {
      report(60);
      ort.env.wasm.wasmPaths = '/models/';
      
      // Try WebGPU locally
      try {
        ortSession = await ort.InferenceSession.create(MODEL_URL, {
          executionProviders: ['webgpu'],
          graphOptimizationLevel: 'all',
        });
        activeBackend = 'webgpu';
      } catch {
        // Try WASM locally
        ortSession = await ort.InferenceSession.create(MODEL_URL, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });
        activeBackend = 'wasm';
      }
      report(80);
    } catch (localError) {
      console.error('[YOLO] Local fallback initialization also failed:', localError);
      report(100);
      throw new Error(
        `Failed to initialize YOLO model (CDN & Local fallback failed): ${primaryCdnError?.message || localError?.message || 'Initialization failed'}`
      );
    }
  }

  // ── Step C: Warm-up inference ──
  try {
    const dummyInput = new ort.Tensor(
      'float32',
      new Float32Array(3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE),
      [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]
    );
    await ortSession.run({
      [ortSession.inputNames[0]]: dummyInput,
    });
  } catch (warmupError) {
    console.warn('[YOLO] Warmup inference warning:', warmupError);
  }

  report(100);
  console.log(
    `%c[YOLO] Ready on backend: ${activeBackend.toUpperCase()} (Version: ${installedVersion})`,
    'color: #10b981; font-weight: bold;'
  );
  return activeBackend;
}


// ── 2. Status & Inspection Functions ─────────────────────────────────────────
export function isModelLoaded() {
  return ortSession !== null;
}

export function getActiveBackend() {
  return activeBackend;
}

export function isDetectionRunning() {
  return detectionRunning;
}

export function getLastInferenceLatency() {
  return lastInferenceLatency;
}

// ── 3. Preprocessing: Letterbox Frame ─────────────────────────────────────────
function letterboxFrame(video) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  const scale = Math.min(MODEL_INPUT_SIZE / vw, MODEL_INPUT_SIZE / vh);
  const newW = Math.round(vw * scale);
  const newH = Math.round(vh * scale);
  const padX = Math.floor((MODEL_INPUT_SIZE - newW) / 2);
  const padY = Math.floor((MODEL_INPUT_SIZE - newH) / 2);

  lctx.fillStyle = 'rgb(114,114,114)';
  lctx.fillRect(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  lctx.drawImage(video, 0, 0, vw, vh, padX, padY, newW, newH);

  return { scale, padX, padY };
}

// Pre-allocated static buffer for CHW Float32 tensor (avoids 4.9MB allocation every 250ms)
const tensorBuffer = new Float32Array(3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);

// ── 4. Preprocessing: Frame to Float32 Tensor (CHW, /255) ─────────────────────
function frameToTensor() {
  const { data } = lctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const size = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;

  for (let i = 0; i < size; i++) {
    tensorBuffer[i] = data[i * 4] / 255;             // R
    tensorBuffer[size + i] = data[i * 4 + 1] / 255;  // G
    tensorBuffer[2 * size + i] = data[i * 4 + 2] / 255; // B
  }

  return new ort.Tensor('float32', tensorBuffer, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
}

// ── 5. Postprocessing: Decode YOLOv8 Output Tensor ───────────────────────────
function decodeDetections(output, letterboxInfo, videoW, videoH) {
  if (!output || !output.data || !output.dims) {
    return [];
  }

  const data = output.data;
  const dims = output.dims; // [1, 84, 8400]
  const numBoxes = dims[2] || 8400;
  const { scale, padX, padY } = letterboxInfo;
  const candidates = [];

  for (let i = 0; i < numBoxes; i++) {
    for (const clsIdxStr in TARGET_CLASSES) {
      const clsIdx = Number(clsIdxStr);
      const score = data[(4 + clsIdx) * numBoxes + i];
      const className = TARGET_CLASSES[clsIdx];

      if (score < MODEL_MIN_SCORE || score < (CLASS_THRESHOLDS[className] ?? 0.5)) {
        continue;
      }

      const cx = data[0 * numBoxes + i];
      const cy = data[1 * numBoxes + i];
      const w = data[2 * numBoxes + i];
      const h = data[3 * numBoxes + i];

      const x1 = (cx - w / 2 - padX) / scale;
      const y1 = (cy - h / 2 - padY) / scale;
      const bw = w / scale;
      const bh = h / scale;

      const cx0 = Math.max(0, x1);
      const cy0 = Math.max(0, y1);

      candidates.push({
        class: className,
        className: className,
        score: score,
        bbox: [
          cx0,
          cy0,
          Math.min(bw, videoW - cx0),
          Math.min(bh, videoH - cy0),
        ],
      });
    }
  }

  return nms(candidates);
}

// ── 6. Non-Maximum Suppression (NMS) ──────────────────────────────────────────
function iou(a, b) {
  const [ax, ay, aw, ah] = a.bbox;
  const [bx, by, bw, bh] = b.bbox;

  const x1 = Math.max(ax, bx);
  const y1 = Math.max(ay, by);
  const x2 = Math.min(ax + aw, bx + bw);
  const y2 = Math.min(ay + ah, by + bh);

  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const inter = interW * interH;
  const union = aw * ah + bw * bh - inter;

  return union <= 0 ? 0 : inter / union;
}

function nms(boxes) {
  const byClass = {};
  boxes.forEach((b) => {
    (byClass[b.class] ??= []).push(b);
  });

  const kept = [];
  for (const cls in byClass) {
    const arr = byClass[cls].sort((a, b) => b.score - a.score);
    const used = new Array(arr.length).fill(false);

    for (let i = 0; i < arr.length; i++) {
      if (used[i]) continue;
      kept.push(arr[i]);

      for (let j = i + 1; j < arr.length; j++) {
        if (!used[j] && iou(arr[i], arr[j]) > NMS_IOU_THRESHOLD) {
          used[j] = true;
        }
      }
    }
  }

  return kept;
}

// ── 7. Single Frame Detection ─────────────────────────────────────────────────
/**
 * Performs detection on a single frame from the provided HTMLVideoElement.
 * Protects against concurrent runs with the `inferenceRunning` flag.
 * Explicitly disposes input and output tensors to prevent WebAssembly memory leaks.
 *
 * @param {HTMLVideoElement} video - Active webcam video element
 * @returns {Promise<Array<{class: string, className: string, score: number, bbox: number[]}>>}
 */
export async function detectFrame(video) {
  if (!ortSession || !video || video.readyState < 2 || !video.videoWidth) {
    return [];
  }

  if (inferenceRunning) {
    return [];
  }

  inferenceRunning = true;
  const startTime = performance.now();
  let inputTensor = null;
  let results = null;

  try {
    // Step 1: Letterbox frame
    const letterboxInfo = letterboxFrame(video);

    // Step 2: Convert to CHW Float32 tensor
    inputTensor = frameToTensor();

    // Step 3: Run inference on active provider (WebGPU/WASM)
    results = await ortSession.run({
      [ortSession.inputNames[0]]: inputTensor,
    });

    // Step 4: Extract and decode target bounding boxes
    const output = results[ortSession.outputNames[0]];
    const detections = decodeDetections(output, letterboxInfo, video.videoWidth, video.videoHeight);

    lastInferenceLatency = Math.round(performance.now() - startTime);
    return detections;
  } catch (err) {
    console.warn('[YOLO] detectFrame error:', err);
    return [];
  } finally {
    // CRITICAL: Explicitly release WebAssembly / WebGPU tensor buffers to prevent memory exhaustion
    try {
      if (inputTensor && typeof inputTensor.dispose === 'function') {
        inputTensor.dispose();
      }
    } catch {}

    try {
      if (results) {
        for (const name of Object.keys(results)) {
          if (results[name] && typeof results[name].dispose === 'function') {
            results[name].dispose();
          }
        }
      }
    } catch {}

    inferenceRunning = false;
  }
}


// ── 8. Continuous Detection Loop ──────────────────────────────────────────────
/**
 * Starts a continuous detection loop on the webcam video element.
 * Throttles inference to ~250ms via requestAnimationFrame.
 * Prevents multiple concurrent loops.
 *
 * @param {HTMLVideoElement} video - Active webcam video element
 * @param {Function} onDetections - Callback receiving the detections array
 */
export function startDetectionLoop(video, onDetections) {
  if (detectionRunning) return; // Prevent creating duplicate loops
  if (!video) {
    console.warn('[YOLO] Cannot start detection loop: video element is null');
    return;
  }

  detectionRunning = true;
  lastDetectAt = 0;

  async function tick(now) {
    if (!detectionRunning) return;

    // Throttle inference: check interval, model session, video readyState, and concurrent run
    if (
      ortSession &&
      video.readyState === 4 &&
      !inferenceRunning &&
      now - lastDetectAt >= DETECTION_INTERVAL_MS
    ) {
      lastDetectAt = now;
      const detections = await detectFrame(video);
      if (typeof onDetections === 'function' && detectionRunning) {
        onDetections(detections);
      }
    }

    if (detectionRunning) {
      detectionHandle = requestAnimationFrame(tick);
    }
  }

  detectionHandle = requestAnimationFrame(tick);
}

/**
 * Stops the continuous detection loop, cancels pending animation frames,
 * and resets detection state.
 */
export function stopDetectionLoop() {
  detectionRunning = false;
  if (detectionHandle !== null) {
    cancelAnimationFrame(detectionHandle);
    detectionHandle = null;
  }
  inferenceRunning = false;
  lastDetectAt = 0;
}

// ── 9. Snapshot Utility ───────────────────────────────────────────────────────
export function captureSnapshot(video) {
  if (!video) return null;
  try {
    const width = video.videoWidth || video.clientWidth || 480;
    const height = video.videoHeight || video.clientHeight || 360;
    if (width <= 0 || height <= 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.65);
  } catch (err) {
    console.error('[captureSnapshot] Error capturing evidence frame:', err);
    return null;
  }
}
