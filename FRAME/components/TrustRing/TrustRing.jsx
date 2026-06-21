import './TrustRing.css';

export default function TrustRing({ score, size = 120, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 90 ? "#16a34a" : score >= 75 ? "#2563eb" : "#ea580c";
  const label = score >= 90 ? "Excellent" : score >= 75 ? "Good" : "Fair";

  return (
    <div className="trust-ring-wrap">
      <div className="trust-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E8EF" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset .8s" }} />
        </svg>
        <div className="trust-ring-value">
          <span className="trust-ring-num" style={{ color }}>{score}</span>
          <span className="trust-ring-lbl">/ 100</span>
        </div>
      </div>
      <span className="trust-label" style={{ color }}>{label} Trust</span>
    </div>
  );
}
