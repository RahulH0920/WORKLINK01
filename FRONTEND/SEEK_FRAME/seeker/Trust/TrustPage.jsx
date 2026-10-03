import { useState, useEffect } from 'react';
import TrustRing from '../../components/TrustRing/TrustRing';
import { getTrustHistory } from '../../data/api';
import './TrustPage.css';

export default function TrustPage({ user }) {
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trustData, setTrustData] = useState({
    trustScore: user?.trustScore || (user?.isVerified ? 20 : 0),
    isVerified: Boolean(user?.isVerified),
    history: [],
    reviews: [],
  });

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await getTrustHistory();
        if (mounted && res && res.success) {
          setTrustData({
            trustScore: typeof res.trustScore === 'number' ? res.trustScore : (user?.trustScore || 0),
            isVerified: res.isVerified !== undefined ? res.isVerified : Boolean(user?.isVerified),
            history: res.history || [],
            reviews: res.reviews || [],
          });
        }
      } catch (err) {
        console.error('Failed to load trust history:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [user]);

  const trustScore = typeof trustData.trustScore === 'number' ? trustData.trustScore : (user?.trustScore || 0);
  const isVerified = trustData.isVerified || Boolean(user?.isVerified);
  const hasDocuments = user?.documents?.length > 0;
  const profileDone = user?.profileComplete;
  const hasSkills = user?.skills?.length > 0;
  const hasBio = !!user?.bio;

  const isEmployer = user?.role === 'employer';

  const trustSignals = isEmployer
    ? [
        {
          label: "Identity & Business KYC",
          value: isVerified ? 100 : (hasDocuments ? 50 : 0),
          weight: "40%",
          icon: "🛡️",
          color: "var(--accent)",
          desc: isVerified
            ? "Business identity verified. Initial +20 Trust Score awarded."
            : hasDocuments
              ? "Documents uploaded, awaiting admin review."
              : "Verify business identity to receive initial +20 points.",
        },
        {
          label: "Advance Payment Escrow",
          value: trustScore >= 21 ? 100 : 0,
          weight: "20%",
          icon: "💳",
          color: "var(--green)",
          desc: "Completed required 50% advance escrow deposit (+1 pt per hire).",
        },
        {
          label: "Job Completion Rate",
          value: trustScore >= 23 ? 100 : 0,
          weight: "20%",
          icon: "💼",
          color: "var(--green)",
          desc: "Confirming genuine job completions promptly (+2 pts per job).",
        },
        {
          label: "Settlement Track Record",
          value: trustScore >= 26 ? 100 : 0,
          weight: "20%",
          icon: "✅",
          color: "var(--accent)",
          desc: "Remaining payment (+2 pts) & full transaction settlement (+1 pt).",
        },
      ]
    : [
        {
          label: "Identity Verification",
          value: isVerified ? 100 : (hasDocuments ? 50 : 0),
          weight: "40%",
          icon: "🛡️",
          color: "var(--accent)",
          desc: isVerified
            ? "Identity verified. Initial +20 Trust Score awarded."
            : hasDocuments
              ? "Documents uploaded, awaiting admin verification."
              : "Upload Aadhaar and PAN card to get verified.",
        },
        {
          label: "Job Completion Rate",
          value: trustScore >= 22 ? 100 : (trustScore > 20 ? 50 : 0),
          weight: "30%",
          icon: "💼",
          color: "var(--green)",
          desc: "Each successfully completed and settled job awards +2 Trust Points.",
        },
        {
          label: "Employer Ratings & Reviews",
          value: trustData.reviews.length > 0 ? 100 : 0,
          weight: "20%",
          icon: "⭐",
          color: "var(--orange)",
          desc: "5-Star: +3 pts, 4-Star: +2 pts, 3-Star: 0 pts, 2-Star: -2 pts, 1-Star: -4 pts.",
        },
        {
          label: "Profile Completeness",
          value: profileDone ? 100 : ((hasBio ? 50 : 0) + (hasSkills ? 50 : 0)),
          weight: "10%",
          icon: "✅",
          color: "var(--accent)",
          desc: profileDone ? "Profile is complete." : "Add bio and skills to build profile trust.",
        },
      ];

  /* ── Tips based on real user state ── */
  const tips = [];
  if (!isVerified) {
    tips.push({ icon: "🛡️", title: "Complete Identity Verification", desc: "Get verified to receive your initial 20 / 100 Trust Score.", impact: "+20", priority: "high" });
  }
  if (isEmployer) {
    tips.push({ icon: "💳", title: "Complete Advance Payments", desc: "Pay required 50% advance on worker acceptance to earn +1 point.", impact: "+1", priority: "high" });
    tips.push({ icon: "💼", title: "Confirm Job Completions Promptly", desc: "Confirm completed shifts to earn +2 points.", impact: "+2", priority: "high" });
    tips.push({ icon: "✅", title: "Settle Remaining Amounts", desc: "Release remaining payments (+2) and fully settle transactions (+1).", impact: "+3", priority: "medium" });
  } else {
    tips.push({ icon: "💼", title: "Complete Jobs Successfully", desc: "Deliver high quality work and receive +2 points upon job settlement.", impact: "+2", priority: "high" });
    tips.push({ icon: "⭐", title: "Earn 5-Star Employer Ratings", desc: "5-star reviews from employers boost your trust score by +3 points.", impact: "+3", priority: "medium" });
  }


  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          style={{
            color: i <= rating ? '#f59e0b' : '#cbd5e1',
            fontSize: '18px',
            lineHeight: 1,
          }}
        >
          ★
        </span>
      );
    }
    return <div style={{ display: 'inline-flex', gap: '2px' }}>{stars}</div>;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Trust & Verification</h1>
        <p>Real-time Trust Score, verified credentials, and audited performance ratings.</p>
      </div>

      <div className="trust-overview fade-up">
        <div className="trust-main-card card">
          <div className="trust-score-section">
            <TrustRing score={trustScore} size={160} stroke={12} />
            <div className="trust-score-meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="trust-score-title">Trust Score: {trustScore} / 100</div>
                {isVerified && (
                  <span style={{
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 800,
                  }}>
                    🛡️ Verified Worker
                  </span>
                )}
              </div>
              <div className="trust-score-subtitle">
                {trustScore > 0
                  ? `Calculated dynamically from verified identity, completed jobs, and employer reviews.`
                  : 'Complete identity verification to receive your initial 20 / 100 Trust Score.'
                }
              </div>
              <div className="trust-formula">
                <span className="formula-label">Range:</span>
                <code className="formula-code">0 (Min) — 100 (Max)</code>
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
                <div className="trust-signal-value" style={{ color: s.color }}>{s.value}%</div>
              </div>
              <div className="progress-bar-track" style={{ marginTop: 12 }}>
                <div className="progress-bar-fill" style={{ width: `${s.value}%`, background: s.color }} />
              </div>
              {expanded === i && (
                <div className="trust-signal-detail">
                  <p>{s.desc}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 7 & 9: TRUST SCORE HISTORY & EMPLOYER REVIEWS ── */}
      <div className="grid-2 fade-up-3">
        {/* Trust Score History Card */}
        <div className="card">
          <div className="section-heading">
            <h2>Trust Score History</h2>
            <span className="text-muted">{trustData.history.length} Events</span>
          </div>

          {trustData.history.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>No score events recorded yet.</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                Complete verification (+20) and jobs (+2) to see history here.
              </p>
            </div>
          ) : (
            <div className="trust-timeline">
              {trustData.history.map((h, i) => {
                const isPositive = h.change >= 0;
                return (
                  <div key={h._id || i} className="timeline-item">
                    <div className="timeline-dot" style={{ background: isPositive ? 'var(--green)' : 'var(--red)' }} />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-date">{formatDate(h.createdAt)}</span>
                        <span className="timeline-score">Previous: {h.previousScore} → New: <strong>{h.newScore}</strong></span>
                        <span className={`timeline-delta ${isPositive ? 'up' : 'down'}`}>
                          {isPositive ? `+${h.change}` : h.change}
                        </span>
                      </div>
                      <div className="timeline-event" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {h.reason}
                      </div>
                      {h.jobTitle && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          Job: {h.jobTitle} {h.employerName ? `• Employer: ${h.employerName}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Employer Reviews Card */}
        <div className="card">
          <div className="section-heading">
            <h2>Employer Reviews</h2>
            <span className="tag teal">{trustData.reviews.length} Verified</span>
          </div>

          {trustData.reviews.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>⭐</div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5 }}>No employer reviews yet.</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                Ratings and reviews from employers will appear here upon job completion.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {trustData.reviews.map((r, i) => (
                <div
                  key={r._id || i}
                  style={{
                    background: 'var(--bg-card-alt, #f8fafc)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {renderStars(r.rating)}
                    <span style={{ fontSize: 12, fontWeight: 700, color: r.trustScoreChange >= 0 ? '#10b981' : '#ef4444' }}>
                      {r.trustScoreChange >= 0 ? `+${r.trustScoreChange}` : r.trustScoreChange} pts
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-main)', lineHeight: 1.4, fontStyle: r.review ? 'normal' : 'italic' }}>
                    {r.review ? `"${r.review}"` : 'No written review text.'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <span>Job: <strong>{r.jobTitle}</strong> • Employer: {r.employerName}</span>
                    <span>{formatDate(r.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

