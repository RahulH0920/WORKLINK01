import { useState } from 'react';
import TrustRing from '../../components/TrustRing/TrustRing';
import './TrustPage.css';

const TRUST_SIGNALS_FULL = [
  { label: "Average Rating", value: 96, weight: "40%", icon: "⭐", color: "var(--amber)", desc: "Based on employer reviews from 14 completed jobs." },
  { label: "Completion Rate", value: 98, weight: "30%", icon: "✅", color: "var(--teal)", desc: "You completed 14 of 14 accepted jobs successfully." },
  { label: "Responsiveness", value: 79, weight: "15%", icon: "⚡", color: "var(--indigo)", desc: "Average response time to new messages: ~2 hours." },
  { label: "Doc Verification", value: 100, weight: "15%", icon: "🛡️", color: "var(--coral)", desc: "All required documents verified." },
];

const TRUST_SIGNALS_NEW = [
  { label: "Average Rating", value: 0, weight: "40%", icon: "⭐", color: "var(--amber)", desc: "Complete jobs and earn ratings from employers." },
  { label: "Completion Rate", value: 0, weight: "30%", icon: "✅", color: "var(--teal)", desc: "Accept and complete jobs to build your completion rate." },
  { label: "Responsiveness", value: 0, weight: "15%", icon: "⚡", color: "var(--indigo)", desc: "Respond quickly to messages to improve this signal." },
  { label: "Doc Verification", value: 0, weight: "15%", icon: "🛡️", color: "var(--coral)", desc: "Upload and verify your identity documents." },
];

const HISTORY = [];

const TIPS_NEW = [
  { icon: "📄", title: "Verify Your Identity", desc: "Upload Aadhaar or PAN card to get started.", impact: "+15", priority: "high" },
  { icon: "💼", title: "Complete Your First Job", desc: "Apply and finish a job to earn your first rating.", impact: "+12", priority: "high" },
  { icon: "⏱️", title: "Be Responsive", desc: "Reply to messages within 1 hour.", impact: "+5", priority: "medium" },
];

const TIPS = [
  { icon: "⏱️", title: "Respond Faster", desc: "Bring response time under 1h.", impact: "+5", priority: "high" },
  { icon: "📄", title: "Upload PAN Card", desc: "One more verified doc boosts score.", impact: "+3", priority: "medium" },
  { icon: "💼", title: "Complete More Jobs", desc: "Each 4+ star job adds reliability.", impact: "+2", priority: "low" },
];

export default function TrustPage({ user }) {
  const [expanded, setExpanded] = useState(null);
  const isNewUser = !user || user.trustScore <= 0;
  const trustSignals = isNewUser ? TRUST_SIGNALS_NEW : TRUST_SIGNALS_FULL;
  const tips = isNewUser ? TIPS_NEW : TIPS;
  const history = isNewUser ? [{ date: "Today", score: user?.trustScore || 0, event: "Account created — initial score", delta: "—" }] : HISTORY;

  const score = isNewUser
    ? (user?.trustScore || 0)
    : Math.round(trustSignals.reduce((s, x) => s + x.value * parseFloat(x.weight) / 100, 0));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Trust Engine</h1>
        <p>{isNewUser ? 'Build your trust score to unlock more opportunities.' : 'Understand how your trust score is calculated and improve it.'}</p>
      </div>

      <div className="trust-overview fade-up">
        <div className="trust-main-card card">
          <div className="trust-score-section">
            <TrustRing score={score} size={160} stroke={12} />
            <div className="trust-score-meta">
              <div className="trust-score-title">Your Trust Score</div>
              <div className="trust-score-subtitle">
                {isNewUser
                  ? 'Start building your score by completing the steps below'
                  : `Calculated from ${trustSignals.length} weighted performance signals`
                }
              </div>
              <div className="trust-formula">
                <span className="formula-label">Formula:</span>
                <code className="formula-code">Σ (signal × weight) → 0–100</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fade-up-2" style={{ marginBottom: 24 }}>
        <div className="section-heading"><h2>Signal Breakdown</h2><span className="text-muted">Click to expand</span></div>
        <div className="trust-signals-grid">
          {trustSignals.map((s, i) => (
            <div key={s.label} className={`trust-signal-card card ${expanded === i ? "expanded" : ""}`}
              onClick={() => setExpanded(expanded === i ? null : i)}>
              <div className="trust-signal-header">
                <div className="trust-signal-icon" style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="trust-signal-label">{s.label}</div>
                  <div className="trust-signal-weight">Weight: {s.weight}</div>
                </div>
                <div className="trust-signal-value" style={{ color: s.color }}>{s.value}</div>
              </div>
              <div className="progress-bar-track" style={{ marginTop: 12 }}>
                <div className="progress-bar-fill" style={{ width: `${s.value}%`, background: s.color }} />
              </div>
              {expanded === i && (
                <div className="trust-signal-detail">
                  <p>{s.desc}</p>
                  <div className="trust-signal-contribution">
                    Contribution: <strong>{Math.round(s.value * parseFloat(s.weight) / 100)} pts</strong>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2 fade-up-3">
        <div className="card">
          <div className="section-heading"><h2>How to Improve</h2><span className="tag teal">AI Tips</span></div>
          {tips.map((t, i) => (
            <div key={i} className="tip-card">
              <div className="tip-icon">{t.icon}</div>
              <div style={{ flex: 1 }}>
                <div className="tip-title">{t.title}</div>
                <div className="tip-desc">{t.desc}</div>
              </div>
              <div className="tip-impact">
                <div className="tip-impact-value">{t.impact}</div>
                <div className="tip-impact-label">pts</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-heading"><h2>Score History</h2><span className="text-muted">Timeline</span></div>
          <div className="trust-timeline">
            {history.map((h, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-date">{h.date}</span>
                    <span className="timeline-score">Score: {h.score}</span>
                    {h.delta !== "—" && <span className="timeline-delta up">{h.delta}</span>}
                  </div>
                  <div className="timeline-event">{h.event}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
