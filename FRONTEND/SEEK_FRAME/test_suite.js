function simulateBlinkSession(frames) {
  const tracker = {
    state: 'EYES_OPEN',
    closedStartTime: 0,
    lastBlinkTime: 0,
    openBaseline: 0,
    smoothedEAR: 0,
    count: 0,
    isProcessing: false,
    timeoutStarted: false,
    faceMissingStartTime: 0,
  };

  let completedBlinks = 0;
  let verificationTriggered = false;

  for (const frame of frames) {
    const { time, avgEAR, minEAR = avgEAR, faceDetected = true } = frame;
    const now = time;

    if (!faceDetected) {
      if (!tracker.faceMissingStartTime) {
        tracker.faceMissingStartTime = now;
      } else if (now - tracker.faceMissingStartTime > 1200) {
        if (tracker.state === 'EYES_CLOSED') {
          tracker.state = 'EYES_OPEN';
          tracker.closedStartTime = 0;
        }
      }
      continue;
    }

    tracker.faceMissingStartTime = 0;
    const rawEAR = avgEAR;
    const currentEAR = tracker.smoothedEAR === 0
      ? rawEAR
      : (tracker.smoothedEAR * 0.25 + rawEAR * 0.75);
    tracker.smoothedEAR = currentEAR;

    if (!tracker.openBaseline) {
      tracker.openBaseline = currentEAR;
    } else if (tracker.state === 'EYES_OPEN') {
      if (currentEAR > tracker.openBaseline) {
        tracker.openBaseline = tracker.openBaseline * 0.8 + currentEAR * 0.2;
      } else if (currentEAR > tracker.openBaseline * 0.90) {
        tracker.openBaseline = tracker.openBaseline * 0.98 + currentEAR * 0.02;
      }
    }

    const base = Math.max(0.20, tracker.openBaseline);
    const closedThreshold = Math.min(0.23, base * 0.82);
    const openThreshold = Math.max(0.21, base * 0.90);

    const isClosed = (rawEAR <= closedThreshold) || (currentEAR <= closedThreshold) || (minEAR <= 0.19);
    const isOpen = (rawEAR >= openThreshold) || (currentEAR >= openThreshold);

    if (tracker.state === 'EYES_OPEN') {
      if (now - tracker.lastBlinkTime >= 180) {
        if (isClosed) {
          tracker.state = 'EYES_CLOSED';
          tracker.closedStartTime = now;
        }
      }
    } else if (tracker.state === 'EYES_CLOSED') {
      const closedDuration = now - tracker.closedStartTime;

      if (isOpen) {
        if (closedDuration >= 25 && closedDuration <= 950) {
          tracker.count += 1;
          tracker.lastBlinkTime = now;
          tracker.state = 'EYES_OPEN';
          completedBlinks = tracker.count;

          if (tracker.count >= 2) {
            verificationTriggered = true;
            break;
          }
        } else {
          tracker.lastBlinkTime = now;
          tracker.state = 'EYES_OPEN';
        }
      } else if (closedDuration > 1000) {
        tracker.state = 'EYES_HELD';
      }
    } else if (tracker.state === 'EYES_HELD') {
      if (isOpen) {
        tracker.state = 'EYES_OPEN';
        tracker.lastBlinkTime = now;
      }
    }
  }

  return { completedBlinks, verificationTriggered };
}

// Test 1: Standard natural blinking (resting EAR 0.27)
console.log('--- Test 1: Standard Natural Blinking (resting EAR 0.27) ---');
const frames1 = [];
let t = 0;
for (; t < 800; t += 30) frames1.push({ time: t, avgEAR: 0.27 });
// Blink 1 (120ms)
frames1.push({ time: t, avgEAR: 0.18 }); t += 30;
frames1.push({ time: t, avgEAR: 0.15 }); t += 30;
frames1.push({ time: t, avgEAR: 0.16 }); t += 30;
frames1.push({ time: t, avgEAR: 0.18 }); t += 30;
// Open
for (let i = 0; i < 20; i++) { frames1.push({ time: t, avgEAR: 0.27 }); t += 30; }
// Blink 2 (90ms)
frames1.push({ time: t, avgEAR: 0.17 }); t += 30;
frames1.push({ time: t, avgEAR: 0.15 }); t += 30;
frames1.push({ time: t, avgEAR: 0.18 }); t += 30;
// Open
for (let i = 0; i < 10; i++) { frames1.push({ time: t, avgEAR: 0.27 }); t += 30; }

const res1 = simulateBlinkSession(frames1);
console.log('Result 1:', res1);
if (res1.completedBlinks !== 2 || !res1.verificationTriggered) process.exit(1);

// Test 2: Narrow/smaller eyes (resting EAR 0.22)
console.log('--- Test 2: Narrow/Smaller Eyes (resting EAR 0.22) ---');
const frames2 = [];
t = 0;
for (; t < 800; t += 30) frames2.push({ time: t, avgEAR: 0.22 });
// Blink 1
frames2.push({ time: t, avgEAR: 0.16 }); t += 30;
frames2.push({ time: t, avgEAR: 0.14 }); t += 30;
// Open
for (let i = 0; i < 15; i++) { frames2.push({ time: t, avgEAR: 0.22 }); t += 30; }
// Blink 2
frames2.push({ time: t, avgEAR: 0.15 }); t += 30;
frames2.push({ time: t, avgEAR: 0.14 }); t += 30;
// Open
for (let i = 0; i < 10; i++) { frames2.push({ time: t, avgEAR: 0.22 }); t += 30; }

const res2 = simulateBlinkSession(frames2);
console.log('Result 2:', res2);
if (res2.completedBlinks !== 2 || !res2.verificationTriggered) process.exit(1);

// Test 3: Wider eyes (resting EAR 0.33)
console.log('--- Test 3: Wider Eyes (resting EAR 0.33) ---');
const frames3 = [];
t = 0;
for (; t < 800; t += 30) frames3.push({ time: t, avgEAR: 0.33 });
// Blink 1
frames3.push({ time: t, avgEAR: 0.22 }); t += 30;
frames3.push({ time: t, avgEAR: 0.19 }); t += 30;
// Open
for (let i = 0; i < 15; i++) { frames3.push({ time: t, avgEAR: 0.33 }); t += 30; }
// Blink 2
frames3.push({ time: t, avgEAR: 0.21 }); t += 30;
// Open
for (let i = 0; i < 10; i++) { frames3.push({ time: t, avgEAR: 0.33 }); t += 30; }

const res3 = simulateBlinkSession(frames3);
console.log('Result 3:', res3);
if (res3.completedBlinks !== 2 || !res3.verificationTriggered) process.exit(1);

// Test 4: Fast single-frame blink (50ms)
console.log('--- Test 4: Fast single-frame blink ---');
const frames4 = [];
t = 0;
for (; t < 500; t += 30) frames4.push({ time: t, avgEAR: 0.26 });
// Blink 1: single frame
frames4.push({ time: t, avgEAR: 0.16 }); t += 30;
for (let i = 0; i < 10; i++) { frames4.push({ time: t, avgEAR: 0.26 }); t += 30; }
// Blink 2: single frame
frames4.push({ time: t, avgEAR: 0.17 }); t += 30;
for (let i = 0; i < 10; i++) { frames4.push({ time: t, avgEAR: 0.26 }); t += 30; }

const res4 = simulateBlinkSession(frames4);
console.log('Result 4:', res4);
if (res4.completedBlinks !== 2 || !res4.verificationTriggered) process.exit(1);

// Test 5: Prolonged eyes closed (>1.5s)
console.log('--- Test 5: Prolonged closure (>1s) ---');
const frames5 = [];
t = 0;
for (; t < 500; t += 30) frames5.push({ time: t, avgEAR: 0.27 });
for (let i = 0; i < 40; i++) { frames5.push({ time: t, avgEAR: 0.12 }); t += 30; }
for (let i = 0; i < 10; i++) { frames5.push({ time: t, avgEAR: 0.27 }); t += 30; }

const res5 = simulateBlinkSession(frames5);
console.log('Result 5:', res5);
if (res5.completedBlinks !== 0 || res5.verificationTriggered) process.exit(1);

console.log('\nALL 5 AUTOMATED UNIT TESTS PASSED!');
