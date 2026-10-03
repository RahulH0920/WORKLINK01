import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelLoadingPromise = null;

/**
 * Load lightweight Tiny Face Detector, Tiny 68-Landmark Net, and Face Recognition Net
 * Loaded ONLY ONCE and reused for all detections.
 */
export async function loadFaceModels() {
  if (modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const MODEL_URL = '/models';
      // Load fast Tiny detector + high-precision 68 landmark net for reliable blink detection
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL).catch(() => faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      if (!faceapi.nets.faceLandmark68Net.isLoaded && !faceapi.nets.faceLandmark68TinyNet.isLoaded) {
        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
      }
      modelsLoaded = true;
      return true;
    } catch (err) {
      console.warn('Face model load warning:', err);
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL).catch(() => faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        modelsLoaded = true;
        return true;
      } catch (fallbackErr) {
        console.error('Face models failed to load:', fallbackErr);
        throw new Error('Failed to load face recognition models.');
      }
    }
  })();

  return modelLoadingPromise;
}

/**
 * Resize image/canvas to a standard max dimension (320px)
 * Prevents TensorFlow.js from allocating massive tensors, making inference instant
 */
export function getOptimizedCanvas(source, maxDim = 320) {
  const canvas = document.createElement('canvas');
  let width = source.naturalWidth || source.videoWidth || source.width || 320;
  let height = source.naturalHeight || source.videoHeight || source.height || 320;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  canvas.width = Math.max(width, 32);
  canvas.height = Math.max(height, 32);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Helper to convert a File/Blob/URL to an HTMLImageElement
 */
export function createImageElement(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for face detection.'));

    if (source instanceof Blob || source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else if (typeof source === 'string') {
      img.src = source;
    } else {
      reject(new Error('Invalid image source'));
    }
  });
}

/**
 * Detect a single face and extract its 128-d descriptor on an optimized 320px canvas
 */
export async function detectSingleFaceDescriptor(input) {
  await loadFaceModels();

  let imgElement = input;
  let isTempUrl = false;
  let tempUrl = null;

  if (input instanceof Blob || input instanceof File) {
    tempUrl = URL.createObjectURL(input);
    imgElement = await createImageElement(tempUrl);
    isTempUrl = true;
  }

  try {
    const optimizedCanvas = getOptimizedCanvas(imgElement, 320);

    const detectorOptions = faceapi.nets.tinyFaceDetector.isLoaded
      ? new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 })
      : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

    const detections = await faceapi
      .detectAllFaces(optimizedCanvas, detectorOptions)
      .withFaceLandmarks(faceapi.nets.faceLandmark68TinyNet.isLoaded)
      .withFaceDescriptors();

    return {
      faceCount: detections.length,
      detections,
      descriptor: detections.length === 1 ? detections[0].descriptor : null,
    };
  } finally {
    if (isTempUrl && tempUrl) {
      URL.revokeObjectURL(tempUrl);
    }
  }
}

/**
 * Fast comparison of a pre-extracted/cached uploaded descriptor with a live selfie
 */
export async function compareWithPrecomputedDescriptor(uploadedDescriptor, liveSelfieSource, threshold = 0.55) {
  if (!uploadedDescriptor) {
    throw new Error('Uploaded photo face descriptor is missing.');
  }

  // Detect face in live selfie
  const liveResult = await detectSingleFaceDescriptor(liveSelfieSource);
  if (liveResult.faceCount === 0) {
    return {
      success: false,
      match: false,
      error: 'Face not detected. Please position your face clearly in the camera.',
      code: 'NO_FACE_LIVE',
    };
  }
  if (liveResult.faceCount > 1) {
    return {
      success: false,
      match: false,
      error: 'Please make sure only one person is visible in the camera.',
      code: 'MULTIPLE_FACES_LIVE',
    };
  }

  // Distance computation (instant)
  const distance = faceapi.euclideanDistance(uploadedDescriptor, liveResult.descriptor);
  const match = distance < threshold;
  const score = Math.max(0, Math.min(100, Math.round((1 - (distance / 1.1)) * 100)));

  if (!match) {
    return {
      success: true,
      match: false,
      distance: Number(distance.toFixed(3)),
      score,
      error: 'Face verification failed: The uploaded photo and live selfie do not match.',
      code: 'FACE_MISMATCH',
    };
  }

  return {
    success: true,
    match: true,
    distance: Number(distance.toFixed(3)),
    score,
    message: 'Face Verification Successful! Identity match confirmed.',
  };
}

/**
 * Compare two faces: Uploaded Photo vs Live Webcam Selfie
 * With safety timeout protection (max 8 seconds)
 */
export async function compareFaces(uploadedPhotoSource, liveSelfieSource, threshold = 0.55, timeoutMs = 8000) {
  const comparePromise = (async () => {
    // 1. Detect face in uploaded photo
    const uploadedResult = await detectSingleFaceDescriptor(uploadedPhotoSource);
    if (uploadedResult.faceCount === 0) {
      return {
        success: false,
        match: false,
        error: 'Face not detected in the uploaded photo.',
        code: 'NO_FACE_UPLOADED',
      };
    }
    if (uploadedResult.faceCount > 1) {
      return {
        success: false,
        match: false,
        error: 'Please upload a photo containing only one person.',
        code: 'MULTIPLE_FACES_UPLOADED',
      };
    }

    return compareWithPrecomputedDescriptor(uploadedResult.descriptor, liveSelfieSource, threshold);
  })();

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Face verification is taking too long. Please try again.'));
    }, timeoutMs);
  });

  return Promise.race([comparePromise, timeoutPromise]);
}

/**
 * Calculate Eye Aspect Ratio (EAR) for a 6-point eye landmark contour
 * Formula: EAR = (||p1 - p5|| + ||p2 - p4||) / (2 * ||p0 - p3||)
 */
export function calculateEAR(eye) {
  if (!eye || eye.length < 6) return 0;
  const p0 = eye[0];
  const p1 = eye[1];
  const p2 = eye[2];
  const p3 = eye[3];
  const p4 = eye[4];
  const p5 = eye[5];

  const v1 = Math.hypot(p1.x - p5.x, p1.y - p5.y);
  const v2 = Math.hypot(p2.x - p4.x, p2.y - p4.y);
  const h = Math.hypot(p0.x - p3.x, p0.y - p3.y);

  if (h < 0.001) return 0;
  return (v1 + v2) / (2.0 * h);
}

let liveCanvas = null;
let liveCtx = null;

function getLiveVideoCanvas(videoElement, targetWidth = 320) {
  if (!liveCanvas) {
    liveCanvas = document.createElement('canvas');
    liveCtx = liveCanvas.getContext('2d', { willReadFrequently: true });
  }
  const vWidth = videoElement.videoWidth || 640;
  const vHeight = videoElement.videoHeight || 480;
  const targetHeight = Math.round((vHeight * targetWidth) / vWidth);

  if (liveCanvas.width !== targetWidth || liveCanvas.height !== targetHeight) {
    liveCanvas.width = targetWidth;
    liveCanvas.height = targetHeight;
  }
  liveCtx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);
  return liveCanvas;
}

/**
 * Fast detection of single face landmarks & EAR on a live video or canvas element
 * Processes on an optimized 320px frame (~20-25ms inference) for 35+ FPS sampling
 */
export async function detectLiveFaceLandmarks(videoElement) {
  if (!videoElement || videoElement.readyState < 2 || !videoElement.videoWidth || !videoElement.videoHeight) {
    return null;
  }
  await loadFaceModels();

  // Downsample to 320px canvas to achieve real-time 30+ FPS continuous sampling
  const inputSource = getLiveVideoCanvas(videoElement, 320);

  const detectorOptions = faceapi.nets.tinyFaceDetector.isLoaded
    ? new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.22 })
    : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.30 });

  const useTinyLandmark = !faceapi.nets.faceLandmark68Net.isLoaded && faceapi.nets.faceLandmark68TinyNet.isLoaded;
  const detection = await faceapi
    .detectSingleFace(inputSource, detectorOptions)
    .withFaceLandmarks(useTinyLandmark);

  if (!detection) {
    return { faceDetected: false, faceCount: 0 };
  }

  const landmarks = detection.landmarks;
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  const leftEAR = calculateEAR(leftEye);
  const rightEAR = calculateEAR(rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2;
  const minEAR = Math.min(leftEAR, rightEAR);

  return {
    faceDetected: true,
    faceCount: 1,
    leftEye,
    rightEye,
    leftEAR,
    rightEAR,
    avgEAR,
    minEAR,
    landmarks,
    detection,
  };
}

