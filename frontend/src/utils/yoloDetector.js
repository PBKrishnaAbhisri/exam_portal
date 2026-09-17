import * as ort from 'onnxruntime-web';

// ── Configuration Constants ──────────────────────────────────────────────────
const MODEL_URL = '/models/yolov8m.onnx';
const MODEL_INPUT_SIZE = 640;

// Target prohibited classes in standard COCO-80
export const TARGET_CLASSES = {
  67: 'cell phone',
  65: 'remote',      // Often triggered when holding phone by edges/back or calculators
  63: 'laptop',      // Prohibited secondary laptop/tablet screen
  62: 'tv',          // Prohibited external monitor
  73: 'book',        // Prohibited textbook/notes/cheat sheets
};

// Calibrated sensitivity thresholds:
// Phones held in hands in webcam view suffer from partial occlusion by fingers,
// angle, screen reflections, and webcam compression.
// Standard 0.35+ threshold causes massive false negatives.
export const CLASS_THRESHOLDS = {
  'cell phone': 0.20,  // Highly sensitive to phones held in hand / occluded
  'remote': 0.28,      // Phones held by edge or backside
  'laptop': 0.45,
  'tv': 0.50,
  'book': 0.32,
};

const MODEL_MIN_SCORE = 0.18;
const NMS_IOU_THRESHOLD = 0.45;
export const DETECTION_INTERVAL_MS = 100; // Ultra-fast ~10 FPS real-time capture

// ── Session & State Variables ────────────────────────────────────────────────
let ortSession = null;
let activeBackend = null;
let lastInferenceLatency = 0;

// Loop management
let detectionRunning = false;
let detectionHandle = null;
let inferenceRunning = false;
let lastDetectAt = 0;

// Offscreen Letterbox Canvas & Preallocated Tensor Buffer (Zero GC overhead)
const letterboxCanvas = document.createElement('canvas');
letterboxCanvas.width = MODEL_INPUT_SIZE;
letterboxCanvas.height = MODEL_INPUT_SIZE;
const lctx = letterboxCanvas.getContext('2d', { willReadFrequently: true });
if (lctx) {
  lctx.imageSmoothingEnabled = true;
  lctx.imageSmoothingQuality = 'high';
}
const sharedTensorData = new Float32Array(3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);

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
  ort.env.wasm.numThreads = 1; // Single-thread prevents SharedArrayBuffer memory access out-of-bounds issues
  ort.env.wasm.simd = true;
  ort.env.wasm.proxy = false;

  let primaryCdnError = null;

  // Session options optimized for YOLOv8m
  const gpuOptions = {
    executionProviders: ['webgpu'],
    graphOptimizationLevel: 'basic',
    enableCpuMemArena: false,
    enableMemPattern: false,
  };

  const wasmOptions = {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'basic',
    enableCpuMemArena: false,
    enableMemPattern: false,
  };

  // ── ATTEMPT 1 (PRIMARY): CDN Path with WebGPU ──
  try {
    report(30);
    ortSession = await ort.InferenceSession.create(MODEL_URL, gpuOptions);
    activeBackend = 'webgpu';
    report(80);
  } catch (gpuError) {
    console.warn('[YOLO] Primary CDN WebGPU provider initialization failed:', gpuError);
  }

  // ── ATTEMPT 2 (PRIMARY): CDN Path with WASM ──
  if (!ortSession) {
    try {
      report(50);
      ortSession = await ort.InferenceSession.create(MODEL_URL, wasmOptions);
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
      ort.env.wasm.numThreads = 1;
      
      // Try WebGPU locally
      try {
        ortSession = await ort.InferenceSession.create(MODEL_URL, gpuOptions);
        activeBackend = 'webgpu';
      } catch {
        // Try WASM locally with minimal optimization
        ortSession = await ort.InferenceSession.create(MODEL_URL, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'disabled',
          enableCpuMemArena: false,
          enableMemPattern: false,
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
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;

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

// ── 4. Preprocessing: Frame to Float32 Tensor (CHW, /255) ─────────────────────
function frameToTensor() {
  const { data } = lctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const size = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;

  for (let i = 0; i < size; i++) {
    sharedTensorData[i] = data[i * 4] / 255;             // R
    sharedTensorData[size + i] = data[i * 4 + 1] / 255;  // G
    sharedTensorData[2 * size + i] = data[i * 4 + 2] / 255; // B
  }

  return new ort.Tensor('float32', sharedTensorData, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
}

// ── 5. Postprocessing: Decode YOLOv8 Output Tensor ───────────────────────────
function decodeDetections(output, letterboxInfo, videoW, videoH) {
  if (!output || !output.data || !output.dims) {
    return [];
  }

  const data = output.data;
  const dims = output.dims; // e.g., [1, 84, 8400] or [1, 8400, 84]

  let isTransposed = false;
  let numBoxes = 8400;
  let totalChannels = 84;

  if (dims.length === 3) {
    if (dims[1] === 84 && dims[2] >= 84) {
      // Standard [1, 84, 8400]
      numBoxes = dims[2];
      totalChannels = dims[1];
      isTransposed = false;
    } else if (dims[2] === 84 && dims[1] >= 84) {
      // Transposed [1, 8400, 84]
      numBoxes = dims[1];
      totalChannels = dims[2];
      isTransposed = true;
    } else {
      numBoxes = dims[2] || 8400;
    }
  }

  const { scale, padX, padY } = letterboxInfo;
  const candidates = [];

  for (let i = 0; i < numBoxes; i++) {
    for (const clsIdxStr in TARGET_CLASSES) {
      const clsIdx = Number(clsIdxStr);
      const score = isTransposed
        ? data[i * totalChannels + (4 + clsIdx)]
        : data[(4 + clsIdx) * numBoxes + i];

      const className = TARGET_CLASSES[clsIdx];
      const threshold = CLASS_THRESHOLDS[className] ?? 0.30;

      if (score < MODEL_MIN_SCORE || score < threshold) {
        continue;
      }

      const cx = isTransposed ? data[i * totalChannels + 0] : data[0 * numBoxes + i];
      const cy = isTransposed ? data[i * totalChannels + 1] : data[1 * numBoxes + i];
      const w = isTransposed ? data[i * totalChannels + 2] : data[2 * numBoxes + i];
      const h = isTransposed ? data[i * totalChannels + 3] : data[3 * numBoxes + i];

      // Reverse letterbox transformation back to source video coordinates
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
          Math.round(cx0),
          Math.round(cy0),
          Math.round(Math.min(bw, videoW - cx0)),
          Math.round(Math.min(bh, videoH - cy0)),
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
 * Throttles inference via requestAnimationFrame.
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

    // Check interval, model session, video readyState (>=2), and avoid concurrent inference
    if (
      ortSession &&
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
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

// ── 9. Live Visual Overlay Bounding Box Utility ──────────────────────────────
/**
 * Draws real-time visual bounding boxes and labels onto an overlay canvas.
 *
 * @param {HTMLCanvasElement} canvas - The overlay canvas placed on top of the video
 * @param {HTMLVideoElement} video - The source webcam video element
 * @param {Array} detections - List of current detected objects
 */
export function drawDetections(canvas, video, detections) {
  if (!canvas || !video) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width || canvas.clientWidth || 320;
  const h = canvas.height || canvas.clientHeight || 240;

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.clearRect(0, 0, w, h);

  if (!detections || detections.length === 0) return;

  const vw = video.videoWidth || w;
  const vh = video.videoHeight || h;
  const scaleX = w / vw;
  const scaleY = h / vh;

  detections.forEach((d) => {
    const [bx, by, bw, bh] = d.bbox;
    const x = bx * scaleX;
    const y = by * scaleY;
    const boxW = bw * scaleX;
    const boxH = bh * scaleY;

    // Draw high-visibility detection box
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
    
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(x, y, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(x, y, boxW, boxH);
      ctx.strokeRect(x, y, boxW, boxH);
    }

    // Draw device badge label
    const className = d.className || d.class || 'device';
    const label = `🚨 ${className.toUpperCase()} ${(d.score * 100).toFixed(0)}%`;
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    const textWidth = ctx.measureText(label).width;
    const labelHeight = 18;

    const labelY = Math.max(0, y - labelHeight);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x, labelY, textWidth + 10, labelHeight);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x + 5, labelY + 13);
  });
}

// ── 10. Snapshot Utility ──────────────────────────────────────────────────────
export function captureSnapshot(video) {
  if (!video) return null;
  try {
    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 480;
    if (width <= 0 || height <= 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.75);
  } catch (err) {
    console.error('[captureSnapshot] Error capturing evidence frame:', err);
    return null;
  }
}

