import { useState, useEffect } from 'react';
import './TrustRing.css';

export default function TrustRing({ score, size = 120, stroke = 9 }) {
  const targetScore = Math.min(100, Math.max(0, Number(score) || 0));
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 900;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      setAnimatedScore(Math.round(easeProgress * targetScore));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [targetScore]);

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = targetScore >= 90 ? "#16a34a" : targetScore >= 75 ? "#2563eb" : "#ea580c";
  const label = targetScore >= 90 ? "Excellent" : targetScore >= 75 ? "Good" : "Fair";

  return (
    <div className="trust-ring-wrap">
      <div className="trust-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E8EF" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={circ - (animatedScore / 100) * circ}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.1s linear" }} />
        </svg>
        <div className="trust-ring-value">
          <span className="trust-ring-num" style={{ color }}>{animatedScore}</span>
          <span className="trust-ring-lbl">/ 100</span>
        </div>
      </div>
      <span className="trust-label" style={{ color }}>{label} Trust</span>
    </div>
  );
}
