import React, { useState, useEffect, useRef } from 'react';
import {
  loadFaceModels,
  detectSingleFaceDescriptor,
  compareWithPrecomputedDescriptor,
  compareFaces,
} from '../../../utils/faceMatcher';
import {
  initMediaPipeFaceLandmarker,
  detectLiveBlink,
  resetMediaPipeTimestamp,
} from '../../../utils/mediaPipeFaceLandmarker';

export default function StepComplete({ data, onChange, user, verificationResult, onFinalSubmit, saving }) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const activeStreamsRef = useRef([]);
  const verificationFinishedRef = useRef(false);
  const isMountedRef = useRef(true);
  const isCameraStartingRef = useRef(false);

  const documents = data?.documents || {};
  const photoFile = documents.photo?.file;

  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedSelfieUrl, setCapturedSelfieUrl] = useState(documents.selfieUrl || '');

  // Pre-computed uploaded photo face descriptor
  const [uploadedDescriptor, setUploadedDescriptor] = useState(documents.uploadedDescriptor || null);
  const [uploadedPhotoError, setUploadedPhotoError] = useState('');
  const [modelsReady, setModelsReady] = useState(false);

  // Blink verification state
  const [blinkCount, setBlinkCount] = useState(documents.blinksCompleted || 0);
  const [blinksVerified, setBlinksVerified] = useState(documents.blinksVerified || false);
  const [faceDetectedLive, setFaceDetectedLive] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(documents.faceVerificationStatus || 'idle'); // 'idle' | 'ready' | 'verifying' | 'verified' | 'failed'
  const [statusMessage, setStatusMessage] = useState(documents.faceStatusMessage || '');
  const [faceScore, setFaceScore] = useState(documents.faceMatchScore || 0);

  // Blink detection animFrame, timeout & tracking ref
  const animFrameRef = useRef(null);
  const isLoopActiveRef = useRef(false);
  const timeoutRef = useRef(null);
  const blinkTrackerRef = useRef({
    state: 'EYES_OPEN', // 'EYES_OPEN' | 'EYES_CLOSED'
    closedStartTime: 0,
    lastBlinkTime: 0,
    openBaseline: 0,
    smoothedEAR: 0,
    count: 0,
    isProcessing: false,
    timeoutStarted: false,
    faceMissingStartTime: 0,
  });

  // 1. Generate preview URL for uploaded photo
  useEffect(() => {
    if (photoFile instanceof File || photoFile instanceof Blob) {
      const url = URL.createObjectURL(photoFile);
      setPhotoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof photoFile === 'string') {
      setPhotoPreviewUrl(photoFile);
    }
  }, [photoFile]);

  // 2. Pre-load models & pre-calculate uploaded photo descriptor ONCE when step mounts
  useEffect(() => {
    let isMounted = true;

    async function initAndPrecompute() {
      if (documents.faceVerified && documents.blinksVerified) return;

      try {
        setStatusMessage('Preparing face verification...');
        await Promise.all([
          loadFaceModels(),
          initMediaPipeFaceLandmarker(),
        ]);
        if (!isMounted) return;
        setModelsReady(true);

        if (photoFile && !uploadedDescriptor) {
          const res = await detectSingleFaceDescriptor(photoFile);
          if (!isMounted) return;

          if (res.faceCount === 0) {
            setUploadedPhotoError('Face not detected in the uploaded photo.');
            setVerificationStatus('failed');
            setStatusMessage('Face not detected in the uploaded photo. Please go back to Step 3 and upload a clear photo.');
          } else if (res.faceCount > 1) {
            setUploadedPhotoError('Please upload a photo containing only one person.');
            setVerificationStatus('failed');
            setStatusMessage('Multiple faces detected in the uploaded photo. Please go back to Step 3 and upload a photo with only one person.');
          } else {
            setUploadedDescriptor(res.descriptor);
            setVerificationStatus('ready');
            setStatusMessage('Look at the camera and blink naturally twice.');
          }
        } else if (uploadedDescriptor) {
          setVerificationStatus('ready');
          setStatusMessage('Look at the camera and blink naturally twice.');
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (isMounted) {
          setVerificationStatus('failed');
          setStatusMessage(err.message || 'Failed to initialize face recognition.');
        }
      }
    }

    initAndPrecompute();

    return () => {
      isMounted = false;
    };
  }, [photoFile]);

  // Auto-start camera once models and uploaded photo are ready
  useEffect(() => {
    if (
      !verificationFinishedRef.current &&
      modelsReady &&
      photoFile &&
      !cameraActive &&
      !capturedSelfieUrl &&
      verificationStatus === 'ready' &&
      !uploadedPhotoError
    ) {
      startCamera();
    }
  }, [modelsReady, photoFile, verificationStatus]);

  // Stop live frame detection loop and timeout
  const stopDetectionLoop = () => {
    isLoopActiveRef.current = false;
    if (animFrameRef.current) {
      if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
        cancelAnimationFrame(animFrameRef.current);
      } else {
        clearTimeout(animFrameRef.current);
      }
      animFrameRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Clean up all camera streams, video elements, and detection loops
  const stopCamera = () => {
    isCameraStartingRef.current = false;
    stopDetectionLoop();

    // 1. Stop every stored stream in activeStreamsRef
    if (activeStreamsRef.current && activeStreamsRef.current.length > 0) {
      activeStreamsRef.current.forEach((stream) => {
        if (stream) {
          try {
            stream.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch (e) {
                console.warn('Error stopping track:', e);
              }
            });
          } catch (e) {
            console.warn('Error stopping stream:', e);
          }
        }
      });
      activeStreamsRef.current = [];
    }

    // 2. Stop streamRef.current
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Error stopping stream track:', e);
          }
        });
      } catch (e) {
        console.warn('Error stopping streamRef:', e);
      }
      streamRef.current = null;
    }

    // 3. Stop and clear videoRef.current.srcObject
    if (videoRef.current) {
      try {
        const videoStream = videoRef.current.srcObject;
        if (videoStream && typeof videoStream.getTracks === 'function') {
          videoStream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (e) {
              console.warn('Error stopping video srcObject track:', e);
            }
          });
        }
      } catch (e) {
        console.warn('Error stopping video srcObject:', e);
      }
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  // Handle camera stream unexpected termination or becoming inactive
  const handleCameraInactive = (errorMessage) => {
    verificationFinishedRef.current = true;
    stopCamera();
    setVerificationStatus('failed');
    setBlinksVerified(false);
    const errorText = errorMessage || 'Camera stream stopped or became inactive. Please check your camera connection and try again.';
    setStatusMessage(errorText);
    if (onChange) {
      onChange({
        ...data,
        documents: {
          ...documents,
          faceVerified: false,
          blinksVerified: false,
          blinksCompleted: 0,
          faceMatchScore: 0,
          faceVerificationStatus: 'failed',
          faceStatusMessage: errorText,
        },
      });
    }
  };

  // Check if camera stream is active and operational
  const checkCameraActive = () => {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video) return false;

    const tracks = stream.getVideoTracks();
    if (!tracks || tracks.length === 0) return false;

    const track = tracks[0];
    if (track.readyState === 'ended' || !track.enabled) return false;
    if (video.ended) return false;

    return true;
  };

  // Cleanup on unmount - ensures camera is stopped completely when leaving Step 4
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []);

  // Capture selfie and perform face comparison after 2 blinks
  const captureSelfieAndVerify = async (completedBlinks = 2) => {
    if (!videoRef.current) return;
    stopDetectionLoop();

    // Condition 1 check: 2 genuine blinks required
    if (completedBlinks < 2) {
      verificationFinishedRef.current = true;
      stopCamera();
      setVerificationStatus('failed');
      setBlinksVerified(false);
      setStatusMessage('Face verification failed: 2 natural eye blinks required.');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const dim = 360;
      canvas.width = dim;
      canvas.height = dim;
      const ctx = canvas.getContext('2d');

      // Draw mirrored video frame
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const selfieDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedSelfieUrl(selfieDataUrl);

      // Stop camera stream immediately upon capture
      stopCamera();

      // Convert data URL to Blob
      const res = await fetch(selfieDataUrl);
      const selfieBlob = await res.blob();

      // Run face verification
      setVerifying(true);
      setVerificationStatus('verifying');
      setStatusMessage('Comparing live face with uploaded photo...');

      let comparison;
      if (uploadedDescriptor) {
        // Fast comparison using pre-computed descriptor (< 300ms)
        comparison = await compareWithPrecomputedDescriptor(uploadedDescriptor, canvas, 0.55);
      } else {
        comparison = await compareFaces(photoFile, canvas, 0.55, 6000);
      }

      // Both conditions are mandatory: 2 blinks = PASS and face match = PASS
      const blinksPassed = completedBlinks >= 2;
      const faceMatchPassed = Boolean(comparison && comparison.success && comparison.match);

      verificationFinishedRef.current = true;
      stopCamera();

      if (blinksPassed && faceMatchPassed) {
        setVerificationStatus('verified');
        setBlinksVerified(true);
        setStatusMessage(`Identity Match Confirmed (Confidence: ${comparison.score}%)`);
        setFaceScore(comparison.score);

        if (onChange) {
          onChange({
            ...data,
            documents: {
              ...documents,
              faceVerified: true,
              blinksVerified: true,
              blinksCompleted: 2,
              faceMatchScore: comparison.score,
              selfieUrl: selfieDataUrl,
              selfieBlob,
              uploadedDescriptor,
              faceVerificationStatus: 'verified',
              faceStatusMessage: `Identity Match Confirmed (Confidence: ${comparison.score}%)`,
            },
          });
        }
      } else {
        setVerificationStatus('failed');
        setBlinksVerified(false);
        const errorText = !blinksPassed
          ? 'Liveness verification failed: 2 natural eye blinks required.'
          : (comparison?.error || 'Face verification failed: The uploaded photo and live selfie do not match.');
        setStatusMessage(errorText);

        if (onChange) {
          onChange({
            ...data,
            documents: {
              ...documents,
              faceVerified: false,
              blinksVerified: false,
              blinksCompleted: blinksPassed ? 2 : completedBlinks,
              faceMatchScore: 0,
              selfieUrl: selfieDataUrl,
              selfieBlob,
              faceVerificationStatus: 'failed',
              faceStatusMessage: errorText,
            },
          });
        }
      }
    } catch (err) {
      console.error('Face verification error:', err);
      verificationFinishedRef.current = true;
      stopCamera();
      setVerificationStatus('failed');
      setBlinksVerified(false);
      setStatusMessage(err.message || 'Face verification failed. Please try again.');

      if (onChange) {
        onChange({
          ...data,
          documents: {
            ...documents,
            faceVerified: false,
            blinksVerified: false,
            faceMatchScore: 0,
            faceVerificationStatus: 'failed',
            faceStatusMessage: err.message || 'Face verification failed. Please try again.',
          },
        });
      }
    } finally {
      setVerifying(false);
      stopCamera();
    }
  };

  // Start real-time 2-blink detection loop using MediaPipe Face Landmarker with ~8-second timeout
  const startDetectionLoop = () => {
    stopDetectionLoop();
    resetMediaPipeTimestamp();
    isLoopActiveRef.current = true;
    blinkTrackerRef.current = {
      state: 'EYES_OPEN',
      closedStartTime: 0,
      lastBlinkTime: 0,
      count: 0,
      isProcessing: false,
      timeoutStarted: false,
      faceMissingStartTime: 0,
    };
    setBlinkCount(0);
    setBlinksVerified(false);
    setStatusMessage('Look at the camera and blink naturally twice.');

    const requestNextFrame = (callback) => {
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        return window.requestAnimationFrame(callback);
      }
      return setTimeout(callback, 20);
    };

    const processFrame = async () => {
      if (!isLoopActiveRef.current) return;

      const video = videoRef.current;
      if (!checkCameraActive()) {
        handleCameraInactive('Camera stream stopped or became inactive. Please check camera connection and try again.');
        return;
      }

      if (!video || video.paused || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        if (isLoopActiveRef.current) {
          animFrameRef.current = requestNextFrame(processFrame);
        }
        return;
      }

      if (blinkTrackerRef.current.isProcessing || blinkTrackerRef.current.count >= 2) {
        if (isLoopActiveRef.current && blinkTrackerRef.current.count < 2) {
          animFrameRef.current = requestNextFrame(processFrame);
        }
        return;
      }

      blinkTrackerRef.current.isProcessing = true;
      try {
        const result = detectLiveBlink(video);
        if (!isLoopActiveRef.current) return;

        const tracker = blinkTrackerRef.current;
        const now = performance.now();

        if (!result || !result.faceDetected) {
          setFaceDetectedLive(false);
          if (!tracker.faceMissingStartTime) {
            tracker.faceMissingStartTime = now;
          } else if (now - tracker.faceMissingStartTime > 1200) {
            // Face missing for over 1.2s, reset closed state
            if (tracker.state === 'EYES_CLOSED') {
              tracker.state = 'EYES_OPEN';
              tracker.closedStartTime = 0;
            }
          }
        } else {
          setFaceDetectedLive(true);
          tracker.faceMissingStartTime = 0;

          // Arm ~8-second liveness monitoring timeout once live face is first detected
          if (!tracker.timeoutStarted) {
            tracker.timeoutStarted = true;
            timeoutRef.current = setTimeout(() => {
              if (isLoopActiveRef.current && blinkTrackerRef.current.count < 2) {
                verificationFinishedRef.current = true;
                stopCamera();
                setVerificationStatus('failed');
                setBlinksVerified(false);
                const timeoutMsg = 'Liveness check timed out: 2 natural blinks were not detected within 8 seconds. Please try again.';
                setStatusMessage(timeoutMsg);
                if (onChange) {
                  onChange({
                    ...data,
                    documents: {
                      ...documents,
                      faceVerified: false,
                      blinksVerified: false,
                      blinksCompleted: blinkTrackerRef.current.count,
                      faceMatchScore: 0,
                      faceVerificationStatus: 'failed',
                      faceStatusMessage: timeoutMsg,
                    },
                  });
                }
              }
            }, 8000);
          }

          const { isClosed, isOpen } = result;

          // 1. Eyes are open: detect natural transition to closed
          if (tracker.state === 'EYES_OPEN') {
            // Debounce cooldown: minimum 200ms since previous completed blink to prevent double counting
            if (now - tracker.lastBlinkTime >= 200) {
              if (isClosed) {
                tracker.state = 'EYES_CLOSED';
                tracker.closedStartTime = now;
              }
            }
          }
          // 2. Eyes are closed: detect transition back to open (eyes open -> eyes close -> eyes open)
          else if (tracker.state === 'EYES_CLOSED') {
            const closedDuration = now - tracker.closedStartTime;

            if (isOpen) {
              // Natural blink duration check: 50ms to 800ms
              if (closedDuration >= 50 && closedDuration <= 800) {
                tracker.count += 1;
                tracker.lastBlinkTime = now;
                tracker.state = 'EYES_OPEN';

                const currentCount = tracker.count;
                setBlinkCount(currentCount);

                if (currentCount >= 2) {
                  // Exactly 2 genuine blinks completed! Stop loop and trigger face comparison
                  stopDetectionLoop();
                  setBlinksVerified(true);
                  captureSelfieAndVerify(currentCount);
                  return;
                }
              } else if (closedDuration < 50) {
                // Too brief to be genuine
                tracker.state = 'EYES_OPEN';
              } else {
                // Held closed longer than 800ms
                tracker.state = 'EYES_OPEN';
                tracker.lastBlinkTime = now;
              }
            } else if (closedDuration > 900) {
              // Eyes held shut longer than 900ms: not a natural blink
              tracker.state = 'EYES_HELD';
            }
          }
          // 3. Eyes held closed: wait until eyes reopen to return to open state without counting
          else if (tracker.state === 'EYES_HELD') {
            if (isOpen) {
              tracker.state = 'EYES_OPEN';
              tracker.lastBlinkTime = now;
            }
          }
        }
      } catch (err) {
        console.warn('Live MediaPipe blink detection error:', err);
      } finally {
        blinkTrackerRef.current.isProcessing = false;
        if (isLoopActiveRef.current && blinkTrackerRef.current.count < 2) {
          animFrameRef.current = requestNextFrame(processFrame);
        }
      }
    };

    animFrameRef.current = requestNextFrame(processFrame);
  };

  // Start live webcam stream
  const startCamera = async () => {
    if (verificationFinishedRef.current || !isMountedRef.current) return;
    setUploadedPhotoError('');
    isCameraStartingRef.current = true;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVerificationStatus('failed');
        setStatusMessage('Camera API is not supported in this browser. Please use a modern browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 480 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      // Track stream in active streams list
      activeStreamsRef.current.push(stream);

      // Check if camera was stopped, unmounted, or verification finished while awaiting getUserMedia
      if (!isCameraStartingRef.current || !isMountedRef.current || verificationFinishedRef.current) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Error stopping canceled track:', e);
          }
        });
        activeStreamsRef.current = activeStreamsRef.current.filter((s) => s !== stream);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        return;
      }

      // If an existing stream was already set, stop its tracks before replacing
      if (streamRef.current && streamRef.current !== stream) {
        try {
          streamRef.current.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn('Error stopping previous stream track:', e);
        }
      }

      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          handleCameraInactive('Camera stream stopped unexpectedly. Please check your camera.');
        };
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play warning:', playErr);
        }
      }
      setCameraActive(true);
      if (verificationStatus !== 'verified') {
        setVerificationStatus('ready');
        setStatusMessage('Look at the camera and blink naturally twice.');
      }
      // Launch real-time natural blink detection
      startDetectionLoop();
    } catch (err) {
      console.error('Camera access error:', err);
      setVerificationStatus('failed');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatusMessage('Camera permission is required for identity verification. Please allow camera access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setStatusMessage('No camera detected on your device.');
      } else {
        setStatusMessage(`Camera error: ${err.message || 'Unable to access camera.'}`);
      }
    } finally {
      isCameraStartingRef.current = false;
    }
  };

  // Retake selfie & reset blink verification
  const handleRetake = () => {
    verificationFinishedRef.current = false;
    stopCamera();
    setCapturedSelfieUrl('');
    setBlinkCount(0);
    setBlinksVerified(false);
    setVerificationStatus('ready');
    setStatusMessage('Look at the camera and blink naturally twice.');
    setFaceScore(0);

    if (onChange) {
      onChange({
        ...data,
        documents: {
          ...documents,
          faceVerified: false,
          blinksVerified: false,
          blinksCompleted: 0,
          faceMatchScore: 0,
          selfieUrl: '',
          selfieBlob: null,
          faceVerificationStatus: 'ready',
          faceStatusMessage: '',
        },
      });
    }

    startCamera();
  };

  // Confetti effect on final completion
  const isProfileSubmitted = Boolean(verificationResult?.user || user?.profileComplete);
  const isIdentityVerified = Boolean(user?.isVerified || verificationResult?.verified);

  useEffect(() => {
    if (!isProfileSubmitted || !isIdentityVerified) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ['#00C9A7', '#5B6CF8', '#FFB547', '#FF6B6B', '#E0E5EC'];
    const particles = [];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 4,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.15,
        opacity: 1,
        decay: 0.008 + Math.random() * 0.008,
      });
    }

    let animId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      particles.forEach((p) => {
        if (p.opacity <= 0) return;
        alive = true;

        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.opacity -= p.decay;
        p.vx *= 0.99;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (alive) animId = requestAnimationFrame(animate);
    };

    const timer = setTimeout(() => animate(), 200);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animId);
    };
  }, [isProfileSubmitted, isIdentityVerified]);

  const displayName = user ? (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()) : 'User';
  const initials = user
    ? (user.name
        ? user.name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
        : `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}` || 'U')
    : 'U';

  // Case A: Profile Submitted Successfully
  if (isProfileSubmitted) {
    return (
      <div className="wizard-step-content wizard-complete-step">
        {isIdentityVerified && <canvas ref={canvasRef} className="wizard-confetti-canvas" />}

        <div className="wizard-complete-emoji">{isIdentityVerified ? '🎉' : '⚠️'}</div>
        <h2 className="wizard-step-title">
          {isIdentityVerified ? 'Profile & Identity Verified!' : 'Profile Saved (Pending Review)'}
        </h2>
        <p className="wizard-step-desc" style={{ maxWidth: 460, margin: '0 auto 20px' }}>
          {verificationResult?.message || 'Your identity and live face verification matched successfully!'}
        </p>

        <div
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: isIdentityVerified ? 'rgba(0, 201, 167, 0.08)' : 'rgba(255, 181, 71, 0.1)',
            border: `1px solid ${isIdentityVerified ? 'var(--teal)' : 'var(--amber, #f59e0b)'}`,
            color: 'var(--ink)',
            fontSize: 13,
            textAlign: 'left',
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{isIdentityVerified ? '🛡️ Identity & Face Matched' : '⏳ Review Required'}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.5 }}>
            {isIdentityVerified
              ? documents.panNumber || documents.pan?.file
                ? 'Your live webcam selfie, Aadhaar OCR, and PAN matched the WorkLink reference dataset (+15 Trust Points awarded).'
                : 'Your live webcam selfie and Aadhaar OCR matched the WorkLink reference dataset (+15 Trust Points awarded).'
              : 'Your documents have been uploaded and saved.'}
          </div>
        </div>

        <div className="wizard-preview-card">
          <div className="wizard-preview-header">
            <div className="wizard-preview-avatar">{initials}</div>
            <div className="wizard-preview-info">
              <div className="wizard-preview-name">{displayName}</div>
              <div className="wizard-preview-location">📍 {data.location || 'Not set'}</div>
            </div>
            <div className="wizard-preview-trust">
              <div className="wizard-preview-trust-label">Trust</div>
              <div className="wizard-preview-trust-score" style={{ color: isIdentityVerified ? 'var(--teal)' : 'var(--muted)' }}>
                {user?.trustScore || 0}
              </div>
            </div>
          </div>

          <p className="wizard-preview-bio">{data.bio || 'No bio provided.'}</p>

          <div className="wizard-preview-docs">
            <span className="wizard-preview-doc-badge">
              {isIdentityVerified ? '✅' : '⏳'} Aadhaar: {documents.aadhaarNumber ? `...${documents.aadhaarNumber.slice(-4)}` : 'Uploaded'}
            </span>
            {(documents.panNumber || documents.pan?.file) && (
              <span className="wizard-preview-doc-badge">
                {isIdentityVerified ? '✅' : '⏳'} PAN: {documents.panNumber || 'Uploaded'}
              </span>
            )}
            <span className="wizard-preview-doc-badge">✅ Live Face Match</span>
          </div>
        </div>
      </div>
    );
  }

  // Case B: Live Identity Verification View
  return (
    <div className="wizard-step-content face-verify-container">
      <div className="step-heading" style={{ marginBottom: 18 }}>
        <h2 className="wizard-step-title">Live Identity Verification</h2>
        <p className="wizard-step-desc">
          Compare your uploaded photo against a live webcam selfie to confirm your identity before final profile submission.
        </p>
      </div>

      <div className="face-verify-grid">
        {/* Card 1: Uploaded Photo */}
        <div className={`face-card ${verificationStatus === 'verified' ? 'verified' : uploadedPhotoError ? 'error' : ''}`}>
          <div className="face-card-title">
            <span>🖼️</span> Recent ID Photo
          </div>

          <div className="face-preview-viewport">
            {photoPreviewUrl ? (
              <img src={photoPreviewUrl} alt="Uploaded recent photo" className="face-preview-img" />
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: 12, padding: 12 }}>
                No recent photo found from Step 3.
              </div>
            )}
          </div>

          <div className="face-card-actions">
            <span style={{ fontSize: 11, color: uploadedPhotoError ? 'var(--coral)' : 'var(--muted)', fontWeight: 600 }}>
              {uploadedPhotoError || documents.photo?.fileName || 'Uploaded Photo'}
            </span>
          </div>
        </div>

        {/* Card 2: Live Webcam Selfie */}
        <div className={`face-card ${verificationStatus === 'verified' ? 'verified' : verificationStatus === 'failed' ? 'error' : ''}`}>
          <div className="face-card-title">
            <span>📹</span> Live Webcam Selfie
          </div>

          <div className="face-preview-viewport">
            {capturedSelfieUrl ? (
              <img src={capturedSelfieUrl} alt="Captured live selfie" className="face-preview-img" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="face-video-stream"
                  style={{ display: cameraActive ? 'block' : 'none' }}
                />

                {cameraActive && (
                  <>
                    <div className="face-guide-overlay" />
                    <div className="face-instruction-banner">
                      <span>Look at the camera and blink naturally twice.</span>
                    </div>
                  </>
                )}

                {!cameraActive && (
                  <div style={{ textAlign: 'center', padding: 16 }}>
                    <div style={{ fontSize: 32, marginBottom: 6 }}>📷</div>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                      Camera is currently off
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="face-card-actions">
            {!cameraActive && !capturedSelfieUrl && (
              <button
                type="button"
                className="face-btn face-btn-primary"
                onClick={startCamera}
                disabled={verifying || Boolean(uploadedPhotoError)}
              >
                <span>📷</span> Start Camera
              </button>
            )}

            {cameraActive && (
              <div className="face-live-counter-pill">
                <span className="face-pulse-dot" />
                <span>Blinks detected: {blinkCount}/2{blinkCount >= 2 ? ' ✓' : ''}</span>
              </div>
            )}

            {capturedSelfieUrl && (
              <button
                type="button"
                className="face-btn face-btn-secondary"
                onClick={handleRetake}
                disabled={verifying || saving}
              >
                <span>🔄</span> Retake Selfie
              </button>
            )}

            {verificationStatus === 'failed' && !cameraActive && !capturedSelfieUrl && (
              <button
                type="button"
                className="face-btn face-btn-primary"
                onClick={handleRetake}
                disabled={verifying || saving}
              >
                <span>🔄</span> Try Again
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verifying && (
        <div className="face-status-card info">
          <div className="face-status-title">
            <div className="wizard-mini-spinner" />
            <span>Verifying Face Biometrics...</span>
          </div>
          <div className="face-status-desc">
            Comparing live selfie against uploaded photo...
          </div>
        </div>
      )}

      {verificationStatus === 'verified' && !verifying && (
        <div className="face-status-card success">
          <div className="face-status-title">
            <span>✓</span> Face Verification Successful
          </div>
          <div className="face-status-desc">
            {statusMessage || 'Identity Match Confirmed. You may now submit your profile.'}
          </div>
        </div>
      )}

      {verificationStatus === 'failed' && !verifying && (
        <div className="face-status-card error">
          <div className="face-status-title">
            <span>✗</span> Verification Failed
          </div>
          <div className="face-status-desc">
            {statusMessage || 'Face or liveness verification failed. Please try again.'}
          </div>
        </div>
      )}

      {!cameraActive && (verificationStatus === 'ready' || verificationStatus === 'idle') && !verifying && !uploadedPhotoError && (
        <div className="wizard-tip">
          <span className="wizard-tip-icon">💡</span>
          <span>Position your face in the camera frame and blink naturally twice when ready.</span>
        </div>
      )}
    </div>
  );
}

StepComplete.isValid = (data) => {
  const documents = data?.documents || {};
  return Boolean(documents.faceVerified && documents.blinksVerified && (documents.blinksCompleted >= 2));
};


