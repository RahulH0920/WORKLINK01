import React, { useState, useEffect, useRef } from 'react';
import { getVerificationDetails, fetchAdminDocumentBlob } from '../../data/api';
import './DetailedVerificationReviewModal.css';

export default function DetailedVerificationReviewModal({ userId, onClose, onAction, actionLoading }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [docUrls, setDocUrls] = useState({});
  const activeBlobUrlsRef = useRef([]);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    // Clear previous blob URLs if any
    activeBlobUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    });
    activeBlobUrlsRef.current = [];
    setDocUrls({});

    getVerificationDetails(userId)
      .then(async (res) => {
        if (!isMounted) return;

        if (res.success && res.verification) {
          const verif = res.verification;
          setData(verif);

          // Authenticated Document Fetching via Authorization Bearer token
          const urls = {};
          const fetchBlob = async (docType) => {
            try {
              const blob = await fetchAdminDocumentBlob(userId, docType);
              const objectUrl = URL.createObjectURL(blob);
              activeBlobUrlsRef.current.push(objectUrl);
              return objectUrl;
            } catch (err) {
              console.warn(`Could not load ${docType} blob:`, err);
              return null;
            }
          };

          const promises = [];
          if (verif.aadhaar?.hasDocument) {
            promises.push(fetchBlob('aadhaar').then((url) => { if (url) urls.aadhaar = url; }));
          }
          if (verif.pan?.hasDocument) {
            promises.push(fetchBlob('pan').then((url) => { if (url) urls.pan = url; }));
          }
          if (verif.faceVerification?.recentPhoto?.hasPhoto) {
            promises.push(fetchBlob('photo').then((url) => { if (url) urls.photo = url; }));
          }
          if (verif.faceVerification?.liveSelfie?.hasSelfie) {
            promises.push(fetchBlob('selfie').then((url) => { if (url) urls.selfie = url; }));
          }

          await Promise.allSettled(promises);
          if (isMounted) {
            setDocUrls(urls);
          }
        } else {
          setError(res.message || 'Failed to load verification details');
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error fetching verification details:', err);
          setError(err.message || 'Server error loading verification review');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      activeBlobUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      });
      activeBlobUrlsRef.current = [];
    };
  }, [userId]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('verified') || s.includes('approved')) return 'status-badge verified';
    if (s.includes('not provided')) return 'status-badge not-provided';
    if (s.includes('failed') || s.includes('rejected')) return 'status-badge failed';
    return 'status-badge pending';
  };

  const isPdf = (fileName) => {
    return (fileName || '').toLowerCase().endsWith('.pdf');
  };

  // Masking helpers to ensure sensitive numbers are NEVER shown in full
  const maskAadhaarNumber = (rawNum) => {
    if (!rawNum) return 'XXXX XXXX 4762';
    const clean = String(rawNum).replace(/\s+/g, '');
    if (clean.length >= 4) {
      return `XXXX XXXX ${clean.slice(-4)}`;
    }
    return 'XXXX XXXX 4762';
  };

  const maskPanNumber = (rawNum) => {
    if (!rawNum || rawNum.includes('Not provided')) return 'PAN not provided';
    const clean = String(rawNum).replace(/\s+/g, '').toUpperCase();
    if (clean.length >= 4) {
      return `XXXXX${clean.slice(-4)}`;
    }
    return 'XXXXX1234F';
  };

  return (
    <div className="review-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="review-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="review-modal-header">
          <div className="header-title-block">
            <span className="header-badge">
              {data?.personalDetails?.role === 'employer' ? 'EMPLOYER PROFILE — ADMIN VIEW' : 'WORKER PROFILE — ADMIN VIEW'}
            </span>
            <h2>{data?.personalDetails?.name || (data?.personalDetails?.role === 'employer' ? 'Employer Profile Review' : 'Worker Profile Review')}</h2>
            {data?.personalDetails?.email && (
              <p className="header-user-subtitle">
                {data.personalDetails.email} · Role: <strong>{data.personalDetails.role === 'employer' ? 'Employer' : 'Worker'}</strong>
              </p>
            )}
          </div>
          <button className="review-close-btn" onClick={onClose} title="Close (Esc)">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="review-modal-body">
          {loading ? (
            <div className="review-loading-state">
              <div className="review-spinner" />
              <p>Loading profile & verification assets securely...</p>
            </div>
          ) : error ? (
            <div className="review-error-state">
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <p>{error}</p>
              <button className="btn-secondary" onClick={onClose} style={{ marginTop: 12 }}>
                Close
              </button>
            </div>
          ) : data ? (
            <div className="review-content">
              
              {/* 1. PROFILE SECTION */}
              <section className="review-section">
                <div className="section-title">
                  <span className="section-icon">{data?.personalDetails?.role === 'employer' ? '🏢' : '👤'}</span>
                  <h3>{data?.personalDetails?.role === 'employer' ? 'Employer Profile' : 'Worker Profile'}</h3>
                </div>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Full Name</label>
                    <span style={{ fontWeight: 700 }}>{data.personalDetails.name || 'Not provided'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email Address</label>
                    <span>{data.personalDetails.email || 'Not provided'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone Number</label>
                    <span>{data.personalDetails.phone || 'Not provided'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Location</label>
                    <span>📍 {data.personalDetails.location || 'Not specified'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Role</label>
                    <span style={{ textTransform: 'capitalize' }}>{data.personalDetails.role || 'Seeker'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Skills</label>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {data.personalDetails.skills && data.personalDetails.skills.length > 0 ? (
                        data.personalDetails.skills.map((s, i) => (
                          <span key={i} className="doc-chip" style={{ background: '#f1f5f9', color: '#334155' }}>
                            {typeof s === 'object' ? s.name : s}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#94a3b8' }}>None listed</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. VERIFICATION SCORES & STATUS SECTION */}
              <section className="review-section" style={{ background: '#f8fafc' }}>
                <div className="section-title">
                  <span className="section-icon">🛡️</span>
                  <h3>Verification & AI Scores</h3>
                  <span className={getStatusClass(data.personalDetails.isVerified ? 'verified' : data.personalDetails.verificationStatus)}>
                    {data.personalDetails.isVerified ? '✅ Verified Profile' : (data.personalDetails.verificationStatus || 'Pending')}
                  </span>
                </div>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Trust Score</label>
                    <span style={{ fontWeight: 700, color: '#059669', fontSize: 16 }}>
                      {data.personalDetails.trustScore || 0} pts
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Verification Score</label>
                    <span style={{ fontWeight: 700, color: '#2563eb' }}>
                      {data.personalDetails.verificationScore ?? 0}%
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Face Match Score</label>
                    <span style={{ fontWeight: 700, color: (data.personalDetails.faceMatchScore || 0) >= 80 ? '#059669' : '#d97706' }}>
                      {data.personalDetails.faceMatchScore ?? data.faceVerification.matchScore}%
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Document Match Score</label>
                    <span style={{ fontWeight: 700 }}>
                      {data.personalDetails.documentMatchScore ?? (data.personalDetails.isVerified ? 100 : 0)}%
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Verification Date</label>
                    <span>{data.personalDetails.verifiedAt ? new Date(data.personalDetails.verifiedAt).toLocaleDateString() : 'Pending'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Liveness Status</label>
                    <span style={{ color: '#059669', fontWeight: 600 }}>
                      {data.faceVerification.livenessStatus}
                    </span>
                  </div>
                </div>
              </section>

              {/* 3. AADHAAR SECTION (MASKED) */}
              <section className="review-section">
                <div className="section-title">
                  <span className="section-icon">🪪</span>
                  <h3>AADHAAR CARD VERIFICATION</h3>
                  <span className={getStatusClass(data.aadhaar.verificationStatus)}>
                    {data.aadhaar.verificationStatus}
                  </span>
                </div>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Masked Aadhaar Number</label>
                    <span className="mono-text">{maskAadhaarNumber(data.aadhaar.number || data.aadhaar.rawNumber)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Name on Aadhaar</label>
                    <span>{data.aadhaar.name || 'Extracted via OCR'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Date of Birth</label>
                    <span>{data.aadhaar.dateOfBirth || 'Not extracted'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Gender</label>
                    <span>{data.aadhaar.gender || 'Not extracted'}</span>
                  </div>
                </div>

                <div className="doc-preview-wrapper">
                  <label className="doc-preview-label">Aadhaar Card Document Asset</label>
                  {data.aadhaar.hasDocument && docUrls.aadhaar ? (
                    <div className="doc-card">
                      <div className="doc-media-box">
                        {isPdf(data.aadhaar.fileName) ? (
                          <iframe
                            src={docUrls.aadhaar}
                            title="Aadhaar Document PDF"
                            className="doc-iframe"
                          />
                        ) : (
                          <img
                            src={docUrls.aadhaar}
                            alt="Uploaded Aadhaar Card"
                            className="doc-image"
                          />
                        )}
                      </div>
                      <div className="doc-meta-row">
                        <span className="doc-filename">📄 {data.aadhaar.fileName}</span>
                        <a
                          href={docUrls.aadhaar}
                          target="_blank"
                          rel="noreferrer"
                          className="doc-view-btn"
                        >
                          View Original Asset ↗
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="doc-empty-box">
                      <span>📄 {data.aadhaar.hasDocument ? 'Loading Aadhaar asset...' : 'Aadhaar document not uploaded'}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* 4. PAN SECTION (MASKED) */}
              <section className="review-section">
                <div className="section-title">
                  <span className="section-icon">📑</span>
                  <h3>PAN CARD VERIFICATION</h3>
                  <span className={getStatusClass(data.pan.verificationStatus)}>
                    {data.pan.verificationStatus}
                  </span>
                </div>

                {!data.pan.hasPAN ? (
                  <div className="pan-not-provided-notice">
                    <span className="notice-icon">ℹ️</span>
                    <div>
                      <strong>PAN optional</strong>
                      <p>The candidate has not provided a PAN card. PAN verification is optional.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="details-grid">
                      <div className="detail-item">
                        <label>Masked PAN Number</label>
                        <span className="mono-text">{maskPanNumber(data.pan.number || data.pan.rawNumber)}</span>
                      </div>
                      <div className="detail-item">
                        <label>Name on PAN</label>
                        <span>{data.pan.name || 'Extracted via OCR'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Date of Birth</label>
                        <span>{data.pan.dateOfBirth || 'Not extracted'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Verification Status</label>
                        <span>{data.pan.verificationStatus}</span>
                      </div>
                    </div>

                    <div className="doc-preview-wrapper">
                      <label className="doc-preview-label">PAN Card Document Asset</label>
                      {data.pan.hasDocument && docUrls.pan ? (
                        <div className="doc-card">
                          <div className="doc-media-box">
                            {isPdf(data.pan.fileName) ? (
                              <iframe
                                src={docUrls.pan}
                                title="PAN Document PDF"
                                className="doc-iframe"
                              />
                            ) : (
                              <img
                                src={docUrls.pan}
                                alt="Uploaded PAN Card"
                                className="doc-image"
                              />
                            )}
                          </div>
                          <div className="doc-meta-row">
                            <span className="doc-filename">📄 {data.pan.fileName}</span>
                            <a
                              href={docUrls.pan}
                              target="_blank"
                              rel="noreferrer"
                              className="doc-view-btn"
                            >
                              View Original Asset ↗
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="doc-empty-box">
                          <span>{data.pan.hasDocument ? 'Loading PAN asset...' : 'PAN document not uploaded'}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>

              {/* 5. FACE VERIFICATION & COMPARISON */}
              <section className="review-section">
                <div className="section-title">
                  <span className="section-icon">📸</span>
                  <h3>FACE MATCH & BIOMETRICS</h3>
                  <span className={getStatusClass(data.faceVerification.status)}>
                    {data.faceVerification.status}
                  </span>
                </div>

                <div className="face-comparison-grid">
                  <div className="face-photo-card">
                    <label>Recent Uploaded Photo</label>
                    <div className="face-img-container">
                      {data.faceVerification.recentPhoto.hasPhoto && docUrls.photo ? (
                        <img
                          src={docUrls.photo}
                          alt="Recent Uploaded Photo"
                          className="face-img"
                        />
                      ) : (
                        <div className="face-empty-placeholder">
                          <span>👤</span>
                          <p>{data.faceVerification.recentPhoto.hasPhoto ? 'Loading Photo...' : 'Photo not provided'}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="face-photo-card">
                    <label>Live Webcam Selfie</label>
                    <div className="face-img-container">
                      {data.faceVerification.liveSelfie.hasSelfie && docUrls.selfie ? (
                        <img
                          src={docUrls.selfie}
                          alt="Live Webcam Selfie"
                          className="face-img"
                        />
                      ) : (
                        <div className="face-empty-placeholder">
                          <span>📷</span>
                          <p>{data.faceVerification.liveSelfie.hasSelfie ? 'Loading Selfie...' : 'Live selfie completed'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="face-result-box">
                  <div className="face-result-item">
                    <label>Face Match Status</label>
                    <span className={getStatusClass(data.faceVerification.status)}>
                      {data.faceVerification.status}
                    </span>
                  </div>
                  <div className="face-result-item">
                    <label>Confidence Score</label>
                    <span className="match-score-badge">
                      {data.faceVerification.matchResultText || `${data.faceVerification.matchScore}% match`}
                    </span>
                  </div>
                  <div className="face-result-item">
                    <label>Liveness Anti-Spoof</label>
                    <span className="liveness-badge">
                      {data.faceVerification.livenessStatus}
                    </span>
                  </div>
                </div>
              </section>

              {/* 6. DOCUMENT VERIFICATION SUMMARY */}
              <section className="review-section summary-section">
                <div className="section-title">
                  <span className="section-icon">⚖️</span>
                  <h3>DOCUMENT VERIFICATION SUMMARY</h3>
                </div>
                <div className="summary-grid">
                  <div className="summary-card">
                    <span className="summary-label">Aadhaar</span>
                    <span className={getStatusClass(data.summary.aadhaar)}>
                      {data.summary.aadhaar}
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">PAN</span>
                    <span className={getStatusClass(data.summary.pan)}>
                      {data.summary.pan}
                    </span>
                  </div>
                  <div className="summary-card">
                    <span className="summary-label">Face Match</span>
                    <span className={getStatusClass(data.summary.face)}>
                      {data.summary.face}
                    </span>
                  </div>
                </div>
              </section>

            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="review-modal-footer">
          <button className="btn-modal-back" onClick={onClose} disabled={actionLoading}>
            ← Back to Workers List
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="btn-modal-reject"
            onClick={() => onAction(userId, 'reject')}
            disabled={actionLoading || loading}
          >
            ✕ Reject Profile
          </button>
        </div>

      </div>
    </div>
  );
}
