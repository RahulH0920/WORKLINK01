import React, { useState, useEffect } from 'react';
import { getTrustHistory } from '../data/api';
import './WorkerTrust.css';

export default function WorkerTrust({ user }) {
  const [loading, setLoading] = useState(true);
  const [trustData, setTrustData] = useState({
    trustScore: user?.trustScore || 0,
    isVerified: Boolean(user?.isVerified),
    verificationStatus: user?.verificationStatus || 'not_submitted',
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
            verificationStatus: res.verificationStatus || user?.verificationStatus || 'not_submitted',
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

  // Real stored user verification properties
  const isVerified = Boolean(trustData.isVerified || user?.isVerified);
  const verificationStatus = (trustData.verificationStatus || user?.verificationStatus || 'not_submitted').toLowerCase();
  const trustScore = typeof trustData.trustScore === 'number' ? trustData.trustScore : (user?.trustScore || 0);
  const verifiedAt = user?.verifiedAt;
  const checks = user?.verificationChecks || {};

  // Resolve overall status text & badge
  const getOverallStatus = () => {
    if (isVerified || verificationStatus === 'approved') {
      return {
        text: '✓ Verified Worker',
        type: 'verified',
        badgeClass: 'status-verified',
      };
    }
    if (verificationStatus === 'pending' || verificationStatus === 'under_review') {
      return {
        text: '⏳ Verification Pending',
        type: 'pending',
        badgeClass: 'status-pending',
      };
    }
    return {
      text: '✕ Not Verified',
      type: 'failed',
      badgeClass: 'status-failed',
    };
  };

  const overall = getOverallStatus();

  // Mask Aadhaar: XXXX XXXX 1234
  const maskAadhaar = (num) => {
    if (!num) return 'XXXX XXXX ••••';
    const clean = num.toString().replace(/\s+/g, '');
    if (clean.length >= 4) {
      const last4 = clean.slice(-4);
      return `XXXX XXXX ${last4}`;
    }
    return 'XXXX XXXX ••••';
  };

  // Mask PAN: XXXXXX1234
  const maskPAN = (num) => {
    if (!num) return 'XXXXXX••••';
    const clean = num.toString().replace(/\s+/g, '');
    if (clean.length >= 4) {
      const last4 = clean.slice(-4);
      return `XXXXXX${last4}`;
    }
    return 'XXXXXX••••';
  };

  // Document numbers from OCR results
  const aadhaarNumber = user?.ocrResult?.aadhaar?.documentNumber || '';
  const panNumber = user?.ocrResult?.pan?.documentNumber || '';

  // Verification Checks (5 points)
  const idDocStatus =
    checks.aadhaarValid || checks.panValid || isVerified
      ? 'verified'
      : verificationStatus === 'pending'
      ? 'pending'
      : 'failed';

  const ocrStatus =
    checks.ocrCompleted || isVerified
      ? 'verified'
      : verificationStatus === 'pending'
      ? 'pending'
      : 'failed';

  const faceMatchStatus =
    checks.faceMatchCompleted || (user?.faceMatchScore && user.faceMatchScore >= 70) || isVerified
      ? 'verified'
      : verificationStatus === 'pending'
      ? 'pending'
      : 'failed';

  const livenessStatus =
    checks.livenessCompleted || isVerified
      ? 'verified'
      : verificationStatus === 'pending'
      ? 'pending'
      : 'failed';

  const overallCheckStatus = isVerified || verificationStatus === 'approved' ? 'verified' : verificationStatus === 'pending' ? 'pending' : 'failed';

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not available';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Not available';
    }
  };

  const getVerificationMessage = () => {
    if (isVerified || verificationStatus === 'approved') {
      return {
        cls: 'status-verified',
        icon: '🛡️',
        text: 'Your profile has been successfully verified with WorkLink AI security credentials.',
      };
    }
    if (verificationStatus === 'pending' || verificationStatus === 'under_review') {
      return {
        cls: 'status-pending',
        icon: '⏳',
        text: 'Your verification is currently being processed.',
      };
    }
    return {
      cls: 'status-failed',
      icon: '⚠️',
      text: 'Verification could not be completed. Please complete identity verification.',
    };
  };

  const message = getVerificationMessage();

  const renderPill = (status) => {
    if (status === 'verified') {
      return <span className="wrk-check-pill verified">✓ Verified</span>;
    }
    if (status === 'pending') {
      return <span className="wrk-check-pill pending">⏳ Pending</span>;
    }
    return <span className="wrk-check-pill failed">✕ Failed</span>;
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
    <div className="wrk-trust-page-container">
      {/* ── Page Header ── */}
      <div className="wrk-trust-header">
        <h1 className="wrk-trust-title">Trust & Verification</h1>
        <p className="wrk-trust-subtitle">
          Real-time security credentials, performance ratings, and Trust Score history.
        </p>
      </div>

      {/* ── Trust Score & Overall Status Hero ── */}
      <div className="wrk-trust-hero-card">
        <div className="wrk-trust-hero-left">
          <div className="wrk-trust-score-badge">
            <span className="wrk-trust-score-number">{trustScore}</span>
            <span className="wrk-trust-score-label">/ 100</span>
          </div>

          <div className="wrk-trust-hero-details">
            <div className="wrk-trust-status-row">
              <h2 className="wrk-trust-overall-status">{overall.text}</h2>
              {isVerified && (
                <span style={{
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  🛡️ Verified Worker
                </span>
              )}
            </div>
            <div className="wrk-trust-hero-meta">
              <span>
                Verified Date: <strong>{verifiedAt ? formatDate(verifiedAt) : formatDate(user?.createdAt)}</strong>
              </span>
              <span>•</span>
              <span>Trust Level: <strong>{trustScore >= 50 ? 'High' : trustScore >= 20 ? 'Established' : 'Starting'}</strong></span>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar 0-100 */}
        <div style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
            <span>Trust Score</span>
            <span style={{ color: '#2563eb' }}>{trustScore} / 100</span>
          </div>
          <div style={{ width: '100%', height: 10, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, trustScore))}%`,
                height: '100%',
                background: trustScore >= 50 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                borderRadius: 99,
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Verification Message ── */}
      <div className={`wrk-trust-message-alert ${message.cls}`}>
        <span style={{ fontSize: 20 }}>{message.icon}</span>
        <span>{message.text}</span>
      </div>

      {/* ── Two Column Layout (Verification Checks & Document Status) ── */}
      <div className="wrk-trust-grid">
        {/* Column 1: Verification Checks (5 items) */}
        <div className="wrk-trust-section-card">
          <div className="wrk-trust-card-header">
            <h3 className="wrk-trust-card-title">
              <span>📋</span> Verification Checks
            </h3>
          </div>

          <div className="wrk-check-list">
            <div className="wrk-check-item">
              <div className="wrk-check-info">
                <span className="wrk-check-name">1. Identity / Document Verification</span>
                <span className="wrk-check-desc">Government ID authenticity and validation</span>
              </div>
              {renderPill(idDocStatus)}
            </div>

            <div className="wrk-check-item">
              <div className="wrk-check-info">
                <span className="wrk-check-name">2. OCR / Document Check</span>
                <span className="wrk-check-desc">Automated optical character extraction</span>
              </div>
              {renderPill(ocrStatus)}
            </div>

            <div className="wrk-check-item">
              <div className="wrk-check-info">
                <span className="wrk-check-name">3. Face Match</span>
                <span className="wrk-check-desc">Facial comparison between photo & Aadhaar</span>
              </div>
              {renderPill(faceMatchStatus)}
            </div>

            <div className="wrk-check-item">
              <div className="wrk-check-info">
                <span className="wrk-check-name">4. Liveness Verification</span>
                <span className="wrk-check-desc">Anti-spoofing and biometric confirmation</span>
              </div>
              {renderPill(livenessStatus)}
            </div>

            <div className="wrk-check-item">
              <div className="wrk-check-info">
                <span className="wrk-check-name">5. Overall Verification</span>
                <span className="wrk-check-desc">Final system approval status</span>
              </div>
              {renderPill(overallCheckStatus)}
            </div>
          </div>
        </div>

        {/* Column 2: Document Status (Masked) */}
        <div className="wrk-trust-section-card">
          <div className="wrk-trust-card-header">
            <h3 className="wrk-trust-card-title">
              <span>📄</span> Document Status
            </h3>
          </div>

          <div className="wrk-check-list">
            {/* Aadhaar */}
            <div className="wrk-doc-item">
              <div className="wrk-doc-left">
                <div className="wrk-doc-icon">🆔</div>
                <div className="wrk-doc-details">
                  <span className="wrk-doc-title">Aadhaar Card</span>
                  <span className="wrk-doc-masked-number">
                    {maskAadhaar(aadhaarNumber)}
                  </span>
                </div>
              </div>
              {renderPill(checks.aadhaarValid || isVerified ? 'verified' : verificationStatus === 'pending' ? 'pending' : 'failed')}
            </div>

            {/* PAN */}
            <div className="wrk-doc-item">
              <div className="wrk-doc-left">
                <div className="wrk-doc-icon">💳</div>
                <div className="wrk-doc-details">
                  <span className="wrk-doc-title">PAN Card</span>
                  <span className="wrk-doc-masked-number">
                    {maskPAN(panNumber)}
                  </span>
                </div>
              </div>
              {renderPill(checks.panValid || isVerified ? 'verified' : verificationStatus === 'pending' ? 'pending' : 'failed')}
            </div>

            {/* Profile Photo */}
            <div className="wrk-doc-item">
              <div className="wrk-doc-left">
                <div className="wrk-doc-icon">📸</div>
                <div className="wrk-doc-details">
                  <span className="wrk-doc-title">Live Selfie Photo</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Biometric face capture
                  </span>
                </div>
              </div>
              {renderPill(isVerified || checks.faceMatchCompleted || user?.documents?.some(d => d.docType === 'photo') ? 'verified' : 'pending')}
            </div>
          </div>

          <div style={{ marginTop: 'auto', padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
            🔒 <strong>Data Privacy:</strong> Document numbers are securely encrypted and masked for your privacy.
          </div>
        </div>
      </div>

      {/* ── Section 7 & 9: TRUST SCORE HISTORY ── */}
      <div className="wrk-trust-section-card" style={{ marginTop: 8 }}>
        <div className="wrk-trust-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="wrk-trust-card-title">
            <span>📈</span> Trust Score History
          </h3>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            {trustData.history.length} {trustData.history.length === 1 ? 'Event' : 'Events'}
          </span>
        </div>

        {trustData.history.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>No trust score events recorded yet.</p>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#94a3b8' }}>
              Events like Identity Verification (+20), Job Completions (+2), and Employer Ratings will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {trustData.history.map((item, idx) => {
              const isPositive = item.change >= 0;
              return (
                <div
                  key={item._id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: isPositive ? '#ecfdf5' : '#fef2f2',
                        color: isPositive ? '#059669' : '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {item.type === 'verification' && '🛡️'}
                      {item.type === 'job_completion' && '💼'}
                      {item.type === 'employer_rating' && '⭐'}
                      {item.type === 'admin_adjustment' && (isPositive ? '➕' : '⚠️')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14.5 }}>
                        {item.reason}
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                        {item.jobTitle ? <span>Job: <strong>{item.jobTitle}</strong> • </span> : null}
                        {item.employerName ? <span>Employer: {item.employerName} • </span> : null}
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        Score: {item.previousScore} → <strong style={{ color: '#0f172a' }}>{item.newScore}</strong>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 800,
                        background: isPositive ? '#d1fae5' : '#fee2e2',
                        color: isPositive ? '#047857' : '#b91c1c',
                        border: `1px solid ${isPositive ? '#a7f3d0' : '#fecaca'}`,
                        minWidth: 48,
                        textAlign: 'center',
                      }}
                    >
                      {isPositive ? `+${item.change}` : item.change}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 4 & 9: EMPLOYER REVIEWS ── */}
      <div className="wrk-trust-section-card" style={{ marginTop: 8 }}>
        <div className="wrk-trust-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="wrk-trust-card-title">
            <span>⭐</span> Employer Reviews
          </h3>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            {trustData.reviews.length} {trustData.reviews.length === 1 ? 'Review' : 'Reviews'}
          </span>
        </div>

        {trustData.reviews.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>No employer reviews received yet.</p>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#94a3b8' }}>
              When employers confirm job completion and rate your performance, their verified reviews will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginTop: 14 }}>
            {trustData.reviews.map((rev, idx) => (
              <div
                key={rev._id || idx}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {renderStars(rev.rating)}
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: rev.trustScoreChange >= 0 ? '#ecfdf5' : '#fef2f2',
                      color: rev.trustScoreChange >= 0 ? '#059669' : '#dc2626',
                    }}
                  >
                    {rev.trustScoreChange >= 0 ? `+${rev.trustScoreChange}` : rev.trustScoreChange} pts
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: 13.5, color: '#1e293b', lineHeight: 1.5, fontStyle: rev.review ? 'normal' : 'italic' }}>
                  {rev.review ? `"${rev.review}"` : 'No written review text provided.'}
                </p>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
                  <div>
                    <strong>Job:</strong> {rev.jobTitle || 'Completed Job'}
                  </div>
                  <div>
                    <strong>Employer:</strong> {rev.employerName || 'Verified Employer'}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
                  {formatDate(rev.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
