import { useState } from 'react';
import TrustRing from '../../components/TrustRing/TrustRing';
import './TrustPage.css';

export default function TrustPage({ user }) {
  const [expanded, setExpanded] = useState(null);
  const trustScore = user?.trustScore || 0;

  /* ── Real trust signals derived from actual user data ── */
  const hasDocuments = user?.documents?.length > 0;
  const isVerified = user?.isVerified;
  const profileDone = user?.profileComplete;
  const hasSkills = user?.skills?.length > 0;
  const hasBio = !!user?.bio;

  const trustSignals = [
    {
      label: "Document Verification",
      value: isVerified ? 100 : (hasDocuments ? 50 : 0),
      weight: "40%",
      icon: "🛡️",
      color: "var(--red)",
      desc: isVerified
        ? "All documents verified successfully."
        : hasDocuments
          ? "Documents uploaded, awaiting admin verification."
          : "Upload Aadhaar and PAN card to get verified.",
    },
    {
      label: "Profile Completeness",
      value: profileDone ? 100 : ((hasBio ? 30 : 0) + (hasSkills ? 30 : 0) + (hasDocuments ? 40 : 0)),
      weight: "30%",
      icon: "✅",
      color: "var(--green)",
      desc: profileDone
        ? "Your profile is fully complete."
        : `Complete your profile: ${!hasBio ? 'add a bio, ' : ''}${!hasSkills ? 'add skills, ' : ''}${!hasDocuments ? 'upload documents' : ''}`.replace(/, $/, '.'),
    },
    {
      label: "Account Age & Activity",
      value: trustScore > 0 ? Math.min(trustScore, 100) : 0,
      weight: "20%",
      icon: "⭐",
      color: "var(--orange)",
      desc: trustScore > 0
        ? `Your current trust score is ${trustScore}. This improves as you use the platform.`
        : "Your trust score will increase as you complete your profile and get verified.",
    },
    {
      label: "Responsiveness",
      value: 0,
      weight: "10%",
      icon: "⚡",
      color: "var(--accent)",
      desc: "This signal activates once you start responding to messages and job offers.",
    },
  ];

  const computedScore = Math.round(
    trustSignals.reduce((s, x) => s + x.value * parseFloat(x.weight) / 100, 0)
  );

  /* ── Tips based on real user state ── */
  const tips = [];
  if (!hasDocuments) {
    tips.push({ icon: "📄", title: "Verify Your Identity", desc: "Upload Aadhaar or PAN card to get started.", impact: "+15", priority: "high" });
  } else if (!isVerified) {
    tips.push({ icon: "⏳", title: "Await Verification", desc: "Your documents are pending admin review.", impact: "+15", priority: "medium" });
  }
  if (!profileDone) {
    tips.push({ icon: "👤", title: "Complete Your Profile", desc: "Add bio and skills to boost your score.", impact: "+12", priority: "high" });
  }
  if (!hasBio) {
    tips.push({ icon: "✏️", title: "Add a Bio", desc: "Tell employers about yourself.", impact: "+5", priority: "medium" });
  }
  if (!hasSkills) {
    tips.push({ icon: "🎯", title: "Add Your Skills", desc: "Showcase what you can do.", impact: "+5", priority: "medium" });
  }
  if (tips.length === 0) {
    tips.push({ icon: "🎉", title: "Looking Good!", desc: "Keep using the platform to maintain your score.", impact: "—", priority: "low" });
  }

  /* ── Score history from actual user timestamps ── */
  const history = [];
  if (user?.createdAt) {
    history.push({
      date: new Date(user.createdAt).toLocaleDateString(),
      score: 0,
      event: "Account created",
      delta: "—",
    });
  }
  if (profileDone) {
    history.push({
      date: "Profile completed",
      score: trustScore,
      event: "Profile marked as complete",
      delta: "+15",
    });
  }
  if (isVerified) {
    history.push({
      date: "Verified",
      score: trustScore,
      event: "Documents verified by admin",
      delta: "+15",
    });
  }
  if (history.length === 0) {
    history.push({ date: "Today", score: 0, event: "Account created — initial score", delta: "—" });
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Trust Engine</h1>
        <p>Understand how your trust score is calculated and how to improve it.</p>
      </div>

      <div className="trust-overview fade-up">
        <div className="trust-main-card card">
          <div className="trust-score-section">
            <TrustRing score={trustScore} size={160} stroke={12} />
            <div className="trust-score-meta">
              <div className="trust-score-title">Your Trust Score</div>
              <div className="trust-score-subtitle">
                {trustScore > 0
                  ? `Calculated from ${trustSignals.length} weighted signals based on your real activity`
                  : 'Start building your score by completing the steps below'
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
          <div className="section-heading"><h2>How to Improve</h2><span className="tag teal">Tips</span></div>
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
