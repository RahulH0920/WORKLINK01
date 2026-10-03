// Test camera cleanup logic for StepComplete component

function createMockTrack() {
  let state = 'live';
  return {
    get readyState() { return state; },
    stop() { state = 'ended'; },
  };
}

function createMockStream() {
  const tracks = [createMockTrack(), createMockTrack()];
  return {
    getTracks() { return tracks; },
    getVideoTracks() { return [tracks[0]]; },
  };
}

class CameraCleanupTester {
  constructor() {
    this.streamRef = { current: null };
    this.activeStreamsRef = { current: [] };
    this.videoRef = { current: { srcObject: null } };
    this.animFrameRef = { current: 123 };
    this.timeoutRef = { current: 456 };
    this.isLoopActiveRef = { current: true };
    this.verificationFinishedRef = { current: false };
    this.isMountedRef = { current: true };
    this.isCameraStartingRef = { current: false };
    this.cameraActive = false;
  }

  startCameraMock() {
    if (this.verificationFinishedRef.current || !this.isMountedRef.current) return false;
    this.isCameraStartingRef.current = true;
    const stream = createMockStream();
    this.activeStreamsRef.current.push(stream);

    if (!this.isCameraStartingRef.current || !this.isMountedRef.current || this.verificationFinishedRef.current) {
      stream.getTracks().forEach(t => t.stop());
      this.activeStreamsRef.current = this.activeStreamsRef.current.filter(s => s !== stream);
      if (this.videoRef.current) this.videoRef.current.srcObject = null;
      return false;
    }

    if (this.streamRef.current && this.streamRef.current !== stream) {
      this.streamRef.current.getTracks().forEach(t => t.stop());
    }

    this.streamRef.current = stream;
    this.videoRef.current.srcObject = stream;
    this.cameraActive = true;
    this.isCameraStartingRef.current = false;
    return true;
  }

  stopDetectionLoop() {
    this.isLoopActiveRef.current = false;
    if (this.animFrameRef.current) {
      this.animFrameRef.current = null;
    }
    if (this.timeoutRef.current) {
      this.timeoutRef.current = null;
    }
  }

  stopCamera() {
    this.isCameraStartingRef.current = false;
    this.stopDetectionLoop();

    // 1. Stop every stored stream in activeStreamsRef
    if (this.activeStreamsRef.current && this.activeStreamsRef.current.length > 0) {
      this.activeStreamsRef.current.forEach((stream) => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      });
      this.activeStreamsRef.current = [];
    }

    // 2. Stop streamRef.current
    if (this.streamRef.current) {
      this.streamRef.current.getTracks().forEach((track) => track.stop());
      this.streamRef.current = null;
    }

    // 3. Stop and clear videoRef.current.srcObject
    if (this.videoRef.current) {
      if (this.videoRef.current.srcObject && typeof this.videoRef.current.srcObject.getTracks === 'function') {
        this.videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
      this.videoRef.current.srcObject = null;
    }

    this.cameraActive = false;
  }

  simulateSuccess() {
    this.verificationFinishedRef.current = true;
    this.stopCamera();
  }

  simulateFailure() {
    this.verificationFinishedRef.current = true;
    this.stopCamera();
  }

  simulateTimeout() {
    this.verificationFinishedRef.current = true;
    this.stopCamera();
  }

  simulateUnmount() {
    this.isMountedRef.current = false;
    this.stopCamera();
  }
}

console.log('=== Camera Cleanup Tests ===');

// Test 1: Complete Verification -> Camera OFF
{
  const tester = new CameraCleanupTester();
  tester.startCameraMock();
  const stream = tester.streamRef.current;
  console.log('Camera started, active:', tester.cameraActive);
  if (!tester.cameraActive || !stream) throw new Error('Failed to start camera');

  tester.simulateSuccess();
  console.log('After Success: cameraActive =', tester.cameraActive);
  console.log('All tracks ended:', stream.getTracks().every(t => t.readyState === 'ended'));
  console.log('srcObject is null:', tester.videoRef.current.srcObject === null);
  console.log('Loop active:', tester.isLoopActiveRef.current);
  console.log('AnimFrame cleared:', tester.animFrameRef.current === null);
  console.log('Timeout cleared:', tester.timeoutRef.current === null);

  if (
    tester.cameraActive !== false ||
    !stream.getTracks().every(t => t.readyState === 'ended') ||
    tester.videoRef.current.srcObject !== null ||
    tester.isLoopActiveRef.current !== false ||
    tester.animFrameRef.current !== null ||
    tester.timeoutRef.current !== null
  ) {
    throw new Error('Test 1 failed: Camera was not cleanly stopped on success');
  }

  // Verify that getUserMedia will NOT start again after verification finished
  const restarted = tester.startCameraMock();
  if (restarted) throw new Error('Camera restarted after verification finished!');
  console.log('✓ TEST 1 PASSED: Camera turned OFF cleanly on verification success & cannot restart\n');
}

// Test 2: Failed Verification -> Camera OFF
{
  const tester = new CameraCleanupTester();
  tester.startCameraMock();
  const stream = tester.streamRef.current;

  tester.simulateFailure();
  if (!stream.getTracks().every(t => t.readyState === 'ended') || tester.videoRef.current.srcObject !== null) {
    throw new Error('Test 2 failed: Camera not stopped on failure');
  }
  const restarted = tester.startCameraMock();
  if (restarted) throw new Error('Camera restarted after failure!');
  console.log('✓ TEST 2 PASSED: Camera turned OFF cleanly on verification failure & cannot restart\n');
}

// Test 3: Timeout -> Camera OFF
{
  const tester = new CameraCleanupTester();
  tester.startCameraMock();
  const stream = tester.streamRef.current;

  tester.simulateTimeout();
  if (!stream.getTracks().every(t => t.readyState === 'ended') || tester.videoRef.current.srcObject !== null) {
    throw new Error('Test 3 failed: Camera not stopped on timeout');
  }
  console.log('✓ TEST 3 PASSED: Camera turned OFF cleanly on timeout\n');
}

// Test 4: Navigate away from Step 4 (unmount) -> Camera OFF
{
  const tester = new CameraCleanupTester();
  tester.startCameraMock();
  const stream = tester.streamRef.current;

  tester.simulateUnmount();
  if (!stream.getTracks().every(t => t.readyState === 'ended') || tester.videoRef.current.srcObject !== null) {
    throw new Error('Test 4 failed: Camera not stopped on unmount');
  }
  console.log('✓ TEST 4 PASSED: Camera turned OFF cleanly on unmount/navigation away\n');
}

// Test 5: Multiple streams opened -> Every stored stream stopped
{
  const tester = new CameraCleanupTester();
  tester.startCameraMock();
  const stream1 = tester.streamRef.current;
  tester.startCameraMock();
  const stream2 = tester.streamRef.current;

  console.log('Total streams tracked:', tester.activeStreamsRef.current.length + 1); // stream1 was stopped on replace, stream2 is current
  tester.stopCamera();

  const allStream1TracksEnded = stream1.getTracks().every(t => t.readyState === 'ended');
  const allStream2TracksEnded = stream2.getTracks().every(t => t.readyState === 'ended');
  if (!allStream1TracksEnded || !allStream2TracksEnded) {
    throw new Error('Test 5 failed: Not all multiple streams were stopped');
  }
  console.log('✓ TEST 5 PASSED: All multiple camera streams stopped\n');
}

console.log('====================================================');
console.log('🎉 ALL CAMERA CLEANUP TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
