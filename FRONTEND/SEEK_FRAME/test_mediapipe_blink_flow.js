// Comprehensive Test Suite for MediaPipe Face Landmarker Blink Detection & Verification Flow

function createBlinkTracker() {
  return {
    state: 'EYES_OPEN', // 'EYES_OPEN' | 'EYES_CLOSED' | 'EYES_HELD'
    closedStartTime: 0,
    lastBlinkTime: 0,
    count: 0,
    isProcessing: false,
    timeoutStarted: false,
    faceMissingStartTime: 0,
  };
}

function processMediaPipeBlinkFrame(tracker, frame) {
  const {
    now,
    faceDetected = true,
    eyeBlinkLeft = 0,
    eyeBlinkRight = 0,
    earLeft = 0.28,
    earRight = 0.28,
  } = frame;

  if (!faceDetected) {
    if (!tracker.faceMissingStartTime) {
      tracker.faceMissingStartTime = now;
    } else if (now - tracker.faceMissingStartTime > 1200) {
      if (tracker.state === 'EYES_CLOSED') {
        tracker.state = 'EYES_OPEN';
        tracker.closedStartTime = 0;
      }
    }
    return { count: tracker.count, verified: tracker.count >= 2, faceDetected: false };
  }

  tracker.faceMissingStartTime = 0;

  const avgBlinkScore = (eyeBlinkLeft + eyeBlinkRight) / 2;
  const maxBlinkScore = Math.max(eyeBlinkLeft, eyeBlinkRight);
  const avgEAR = (earLeft + earRight) / 2;

  // Closure criteria (blendshapes + EAR)
  const isClosed = avgBlinkScore >= 0.45 || maxBlinkScore >= 0.52 || (avgEAR > 0 && avgEAR < 0.17);
  // Open criteria
  const isOpen = avgBlinkScore <= 0.22 || (avgEAR >= 0.21 && avgBlinkScore < 0.35);

  // 1. Eyes are open: detect natural transition to closed
  if (tracker.state === 'EYES_OPEN') {
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
      // Natural blink duration: 50ms to 800ms
      if (closedDuration >= 50 && closedDuration <= 800) {
        tracker.count += 1;
        tracker.lastBlinkTime = now;
        tracker.state = 'EYES_OPEN';
      } else if (closedDuration < 50) {
        tracker.state = 'EYES_OPEN';
      } else {
        tracker.state = 'EYES_OPEN';
        tracker.lastBlinkTime = now;
      }
    } else if (closedDuration > 900) {
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

  return {
    count: tracker.count,
    verified: tracker.count >= 2,
    faceDetected: true,
    state: tracker.state,
    displayCounter: `Blinks detected: ${tracker.count}/2${tracker.count >= 2 ? ' ✓' : ''}`,
  };
}

// Mock face comparison logic (matches faceMatcher.js euclidean distance logic)
function compareFaceDescriptors(uploadedDescriptor, liveDescriptor, threshold = 0.55) {
  if (!uploadedDescriptor || !liveDescriptor) {
    return { success: false, match: false, error: 'Descriptor missing' };
  }
  // Compute euclidean distance
  let sum = 0;
  for (let i = 0; i < uploadedDescriptor.length; i++) {
    const diff = uploadedDescriptor[i] - liveDescriptor[i];
    sum += diff * diff;
  }
  const distance = Math.sqrt(sum);
  const match = distance < threshold;
  const score = Math.max(0, Math.min(100, Math.round((1 - (distance / 1.1)) * 100)));

  return {
    success: true,
    match,
    distance: Number(distance.toFixed(3)),
    score,
    error: match ? null : 'Face verification failed: The uploaded photo and live selfie do not match.',
  };
}

// Verification requirement: BOTH 2 genuine blinks AND face match
function verifyIdentity(blinksCompleted, comparisonResult) {
  const blinksPassed = blinksCompleted >= 2;
  const faceMatchPassed = Boolean(comparisonResult && comparisonResult.success && comparisonResult.match);

  if (blinksPassed && faceMatchPassed) {
    return {
      status: 'verified',
      blinksVerified: true,
      faceVerified: true,
      score: comparisonResult.score,
      message: `Identity Match Confirmed (Confidence: ${comparisonResult.score}%)`,
    };
  } else {
    return {
      status: 'failed',
      blinksVerified: false,
      faceVerified: false,
      score: 0,
      message: !blinksPassed
        ? 'Liveness verification failed: 2 natural eye blinks required.'
        : (comparisonResult?.error || 'Face verification failed: The uploaded photo and live selfie do not match.'),
    };
  }
}

// ----------------------------------------------------
// RUN TESTS
// ----------------------------------------------------

console.log('=== TEST 1: Natural Blinking Cycle (0/2 -> 1/2 -> 2/2 ✓) ===');
{
  const tracker = createBlinkTracker();
  let now = 1000;
  const history = [];

  // 1. Eyes Open resting (300ms)
  for (let i = 0; i < 10; i++) {
    const res = processMediaPipeBlinkFrame(tracker, { now, eyeBlinkLeft: 0.05, eyeBlinkRight: 0.06 });
    now += 30;
  }
  console.log('Resting open: count =', tracker.count);

  // 2. Blink 1 closure (150ms)
  for (let i = 0; i < 5; i++) {
    processMediaPipeBlinkFrame(tracker, { now, eyeBlinkLeft: 0.85, eyeBlinkRight: 0.88 });
    now += 30;
  }
  // 3. Eyes Reopen
  const afterBlink1 = processMediaPipeBlinkFrame(tracker, { now, eyeBlinkLeft: 0.08, eyeBlinkRight: 0.07 });
  console.log('After Blink 1:', afterBlink1.displayCounter);
  if (afterBlink1.count !== 1 || afterBlink1.displayCounter !== 'Blinks detected: 1/2') {
    throw new Error('Test 1 failed on Blink 1');
  }

  // Intermediate open period (300ms)
  for (let i = 0; i < 10; i++) {
    processMediaPipeBlinkFrame(tracker, { now, eyeBlinkLeft: 0.06, eyeBlinkRight: 0.05 });
    now += 30;
  }

  // 4. Blink 2 closure (180ms)
  for (let i = 0; i < 6; i++) {
    processMediaPipeBlinkFrame(tracker, { now, eyeBlinkLeft: 0.90, eyeBlinkRight: 0.92 });
    now += 30;
  }
  // 5. Eyes Reopen
  const afterBlink2 = processMediaPipeBlinkFrame(tracker, { now, eyeBlinkLeft: 0.05, eyeBlinkRight: 0.06 });
  console.log('After Blink 2:', afterBlink2.displayCounter);
  if (afterBlink2.count !== 2 || afterBlink2.displayCounter !== 'Blinks detected: 2/2 ✓') {
    throw new Error('Test 1 failed on Blink 2');
  }
  console.log('✓ TEST 1 PASSED: Successfully transitioned 0/2 -> 1/2 -> 2/2 ✓\n');
}

console.log('=== TEST 2: Static Photo Shown to Webcam (Must NOT count blinks) ===');
{
  const tracker = createBlinkTracker();
  let now = 1000;

  // Static photo with eyes open for 4000ms
  for (let i = 0; i < 120; i++) {
    processMediaPipeBlinkFrame(tracker, { now, eyeBlinkLeft: 0.05, eyeBlinkRight: 0.05 });
    now += 30;
  }
  console.log('Static photo (eyes open): count =', tracker.count);
  if (tracker.count !== 0) throw new Error('Static photo triggered false blink!');

  // Static photo with eyes closed for 4000ms
  const tracker2 = createBlinkTracker();
  now = 1000;
  for (let i = 0; i < 120; i++) {
    processMediaPipeBlinkFrame(tracker2, { now, eyeBlinkLeft: 0.85, eyeBlinkRight: 0.85 });
    now += 30;
  }
  console.log('Static photo (eyes closed): count =', tracker2.count);
  if (tracker2.count !== 0) throw new Error('Static photo triggered false blink!');

  console.log('✓ TEST 2 PASSED: Static photo rejected, count remains 0/2\n');
}

console.log('=== TEST 3: Prolonged Eye Closure / Sleeping (> 900ms) ===');
{
  const tracker = createBlinkTracker();
  let now = 1000;

  // Open 300ms
  for (let i = 0; i < 10; i++) {
    processMediaPipeBlinkFrame(tracker, { now, eyeBlinkLeft: 0.05, eyeBlinkRight: 0.05 });
    now += 30;
  }
  // Eyes held shut for 1500ms
  for (let i = 0; i < 50; i++) {
    processMediaPipeBlinkFrame(tracker, { now, eyeBlinkLeft: 0.90, eyeBlinkRight: 0.90 });
    now += 30;
  }
  // Reopen
  for (let i = 0; i < 10; i++) {
    processMediaPipeBlinkFrame(tracker, { now, eyeBlinkLeft: 0.05, eyeBlinkRight: 0.05 });
    now += 30;
  }
  console.log('Prolonged closure count =', tracker.count, 'state =', tracker.state);
  if (tracker.count !== 0) throw new Error('Prolonged closure counted as blink!');

  console.log('✓ TEST 3 PASSED: Prolonged closure (>900ms) ignored as required\n');
}

console.log('=== TEST 4: 2 Genuine Blinks + Matching Photo (MUST PASS) ===');
{
  const myUploadedFaceDescriptor = new Float32Array(128).fill(0.15);
  const myLiveSelfieDescriptor = new Float32Array(128).fill(0.16); // Small variation (euclidean distance ~0.11 < 0.55)

  const comparison = compareFaceDescriptors(myUploadedFaceDescriptor, myLiveSelfieDescriptor);
  console.log('Comparison result (match):', comparison);

  const finalResult = verifyIdentity(2, comparison);
  console.log('Final verification result:', finalResult);

  if (finalResult.status !== 'verified' || !finalResult.faceVerified || !finalResult.blinksVerified) {
    throw new Error('Test 4 failed: Matching face verification should pass');
  }
  console.log('✓ TEST 4 PASSED: Matching photo + 2 genuine blinks verified successfully!\n');
}

console.log('=== TEST 5: 2 Genuine Blinks + Different Person / Friend Photo (MUST FAIL) ===');
{
  const friendsUploadedFaceDescriptor = new Float32Array(128).fill(0.75); // Friend's face
  const myLiveSelfieDescriptor = new Float32Array(128).fill(0.16); // Live face

  const comparison = compareFaceDescriptors(friendsUploadedFaceDescriptor, myLiveSelfieDescriptor);
  console.log('Comparison result (mismatch):', comparison);

  const finalResult = verifyIdentity(2, comparison);
  console.log('Final verification result:', finalResult);

  if (finalResult.status !== 'failed' || finalResult.faceVerified || finalResult.blinksVerified) {
    throw new Error('Test 5 failed: Mismatched face must be rejected even with 2 blinks');
  }
  console.log('✓ TEST 5 PASSED: Mismatched photo rejected despite 2 blinks!\n');
}

console.log('=== TEST 6: Incomplete Blinks (0/2 or 1/2) (MUST FAIL) ===');
{
  const myUploadedFaceDescriptor = new Float32Array(128).fill(0.15);
  const myLiveSelfieDescriptor = new Float32Array(128).fill(0.16);
  const comparison = compareFaceDescriptors(myUploadedFaceDescriptor, myLiveSelfieDescriptor);

  const resZeroBlinks = verifyIdentity(0, comparison);
  const resOneBlink = verifyIdentity(1, comparison);

  if (resZeroBlinks.status !== 'failed' || resOneBlink.status !== 'failed') {
    throw new Error('Test 6 failed: Incomplete blinks must fail verification');
  }
  console.log('✓ TEST 6 PASSED: Incomplete blinks fail verification\n');
}

console.log('====================================================');
console.log('🎉 ALL 6 COMPREHENSIVE WORKFLOW TESTS PASSED!');
console.log('====================================================');
