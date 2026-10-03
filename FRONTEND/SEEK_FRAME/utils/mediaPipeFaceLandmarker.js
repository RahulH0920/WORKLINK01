import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

let landmarkerPromise = null;
let landmarkerInstance = null;
let lastVideoTime = -1;

/**
 * Initialize MediaPipe Face Landmarker singleton
 * Uses local wasm files and model with fallback to CDN
 */
export async function initMediaPipeFaceLandmarker() {
  if (landmarkerInstance) return landmarkerInstance;
  if (landmarkerPromise) return landmarkerPromise;

  landmarkerPromise = (async () => {
    try {
      // 1. Resolve wasm files (try local public folder, fallback to CDN)
      let filesetResolver;
      try {
        filesetResolver = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      } catch (wasmErr) {
        console.warn('Local MediaPipe wasm load warning, falling back to CDN:', wasmErr);
        filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
      }

      // 2. Load model & create FaceLandmarker with GPU delegate (fallback to CPU)
      const modelAssetPath = '/models/face_landmarker.task';
      try {
        landmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath,
            delegate: 'GPU',
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
      } catch (gpuErr) {
        console.warn('MediaPipe GPU delegate failed, falling back to CPU:', gpuErr);
        try {
          landmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath,
              delegate: 'CPU',
            },
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: false,
            runningMode: 'VIDEO',
            numFaces: 1,
          });
        } catch (localModelErr) {
          console.warn('Local model failed, falling back to CDN model:', localModelErr);
          landmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU',
            },
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: false,
            runningMode: 'VIDEO',
            numFaces: 1,
          });
        }
      }

      return landmarkerInstance;
    } catch (err) {
      console.error('Failed to initialize MediaPipe Face Landmarker:', err);
      landmarkerPromise = null;
      throw err;
    }
  })();

  return landmarkerPromise;
}

/**
 * Detect facial landmarks, blendshapes, and eye state on a live video frame
 * Returns instant eye openness, blendshape scores, and EAR
 */
export function detectLiveBlink(videoElement) {
  if (!landmarkerInstance) {
    return null;
  }
  if (!videoElement || videoElement.paused || videoElement.ended || videoElement.readyState < 2) {
    return null;
  }
  if (!videoElement.videoWidth || !videoElement.videoHeight) {
    return null;
  }

  // Ensure strictly monotonically increasing timestamps for MediaPipe VIDEO running mode
  let now = performance.now();
  if (now <= lastVideoTime) {
    now = lastVideoTime + 1;
  }
  lastVideoTime = now;

  let result;
  try {
    result = landmarkerInstance.detectForVideo(videoElement, now);
  } catch (err) {
    console.warn('MediaPipe detectForVideo warning:', err);
    return null;
  }

  if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
    return {
      faceDetected: false,
      faceCount: 0,
      eyeBlinkLeft: 0,
      eyeBlinkRight: 0,
      avgBlinkScore: 0,
      maxBlinkScore: 0,
      earLeft: 0,
      earRight: 0,
      avgEAR: 0,
      isClosed: false,
      isOpen: false,
    };
  }

  // 1. Extract MediaPipe Face Blendshapes (neural eye blink predictions)
  let eyeBlinkLeft = 0;
  let eyeBlinkRight = 0;
  if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
    const categories = result.faceBlendshapes[0].categories || [];
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      if (cat.categoryName === 'eyeBlinkLeft') {
        eyeBlinkLeft = cat.score;
      } else if (cat.categoryName === 'eyeBlinkRight') {
        eyeBlinkRight = cat.score;
      }
    }
  }

  // 2. Extract MediaPipe 478 3D Landmarks for geometric Eye Aspect Ratio (EAR)
  const landmarks = result.faceLandmarks[0];
  let earLeft = 0;
  let earRight = 0;

  if (landmarks && landmarks.length >= 468) {
    // Left eye: upper 159, 160; lower 145, 144; corners 33, 133
    const lUpper1 = landmarks[159];
    const lLower1 = landmarks[145];
    const lUpper2 = landmarks[160];
    const lLower2 = landmarks[144];
    const lOuter = landmarks[33];
    const lInner = landmarks[133];

    const vL1 = Math.hypot(lUpper1.x - lLower1.x, lUpper1.y - lLower1.y);
    const vL2 = Math.hypot(lUpper2.x - lLower2.x, lUpper2.y - lLower2.y);
    const hL = Math.hypot(lOuter.x - lInner.x, lOuter.y - lInner.y);
    if (hL > 0.001) earLeft = (vL1 + vL2) / (2.0 * hL);

    // Right eye: upper 386, 385; lower 374, 373; corners 362, 263
    const rUpper1 = landmarks[386];
    const rLower1 = landmarks[374];
    const rUpper2 = landmarks[385];
    const rLower2 = landmarks[373];
    const rInner = landmarks[362];
    const rOuter = landmarks[263];

    const vR1 = Math.hypot(rUpper1.x - rLower1.x, rUpper1.y - rLower1.y);
    const vR2 = Math.hypot(rUpper2.x - rLower2.x, rUpper2.y - rLower2.y);
    const hR = Math.hypot(rInner.x - rOuter.x, rInner.y - rOuter.y);
    if (hR > 0.001) earRight = (vR1 + vR2) / (2.0 * hR);
  }

  const avgBlinkScore = (eyeBlinkLeft + eyeBlinkRight) / 2;
  const maxBlinkScore = Math.max(eyeBlinkLeft, eyeBlinkRight);
  const avgEAR = (earLeft + earRight) / 2;

  // Closure criteria:
  // Blendshape eyeBlink >= 0.45 or either eye >= 0.52, or landmark EAR drops below 0.17
  const isClosed = avgBlinkScore >= 0.45 || maxBlinkScore >= 0.52 || (avgEAR > 0 && avgEAR < 0.17);

  // Open criteria:
  // Blendshape eyeBlink <= 0.22, or landmark EAR >= 0.21
  const isOpen = avgBlinkScore <= 0.22 || (avgEAR >= 0.21 && avgBlinkScore < 0.35);

  return {
    faceDetected: true,
    faceCount: 1,
    eyeBlinkLeft,
    eyeBlinkRight,
    avgBlinkScore,
    maxBlinkScore,
    earLeft,
    earRight,
    avgEAR,
    isClosed,
    isOpen,
    landmarks,
  };
}

export function resetMediaPipeTimestamp() {
  lastVideoTime = -1;
}
