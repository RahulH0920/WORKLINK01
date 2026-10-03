import React, { useState, useEffect } from 'react';
import TrustRing from '../../components/TrustRing/TrustRing';
import { updateApplicationStatus, confirmJobCompletion, raiseJobIssue, payRemainingPayment, rateWorkerPerformance, getJobWorkerReview } from '../../data/api';
import { useToast } from '../../components/Toast/Toast';
import EmployerAdvanceModal from '../../components/FeeReceipt/EmployerAdvanceModal';
import EmployerRemainingModal from '../../components/FeeReceipt/EmployerRemainingModal';
import './ApplicantDetailsModal.css';

export default function ApplicantDetailsModal({ applicant, job, onClose, onStatusUpdate }) {
  const { addToast } = useToast();
  const [actionLoading, setActionLoading] = useState(false);
  const [appStatus, setAppStatus] = useState(applicant?.status || 'pending');
  const [completionStatus, setCompletionStatus] = useState(
    job?.completionStatus || applicant?.completionStatus || (applicant?.status === 'accepted' ? 'in_progress' : null)
  );
  const [remainingPaymentPaid, setRemainingPaymentPaid] = useState(
    Boolean(job?.remainingPaymentPaid || applicant?.remainingPaymentPaid)
  );
  const [showConfirmCompletionModal, setShowConfirmCompletionModal] = useState(false);
  const [showRaiseIssueModal, setShowRaiseIssueModal] = useState(false);
  const [showRemainingModal, setShowRemainingModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingHover, setRatingHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [issueReason, setIssueReason] = useState('');
  const [disputeReason, setDisputeReason] = useState(job?.disputeReason || '');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Check if employer already rated this worker for this job
  useEffect(() => {
    let mounted = true;
    async function checkReview() {
      const currentJobId = job?._id || job?.id;
      if (!currentJobId) return;
      try {
        const res = await getJobWorkerReview(currentJobId);
        if (mounted && res && res.success) {
          setAlreadyReviewed(Boolean(res.reviewed));
          if (res.review) {
            setExistingReview(res.review);
            setRatingValue(res.review.rating || 5);
            setReviewComment(res.review.review || '');
          }
        }
      } catch (e) {
        console.error('Error checking job review status:', e);
      }
    }
    checkReview();
    return () => {
      mounted = false;
    };
  }, [job]);

  if (!applicant) return null;

  // Extract applicant user object if nested inside an application record
  const person = applicant.applicant || applicant;
  const applicantId = typeof person === 'object' ? person._id : person;
  const jobId = job?._id || job?.id;

  const name = typeof person === 'object'
    ? (person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown Candidate')
    : 'Unknown Candidate';

  const initials = typeof person === 'object'
    ? (person.name
        ? person.name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
        : `${person.firstName?.charAt(0) || ''}${person.lastName?.charAt(0) || ''}` || '??')
    : '??';

  const email = typeof person === 'object' ? person.email : '';
  const phone = typeof person === 'object' ? person.phone : '';
  const trustScore = typeof person === 'object' ? (person.trustScore || 0) : 0;
  const isVerified = typeof person === 'object' ? Boolean(person.isVerified) : false;
  const location = typeof person === 'object' ? (person.location || 'Not specified') : 'Not specified';
  const skills = typeof person === 'object' && Array.isArray(person.skills) ? person.skills : [];

  // Verification status string
  const verificationStatus = isVerified
    ? 'Verified'
    : (person?.verificationStatus
        ? person.verificationStatus.charAt(0).toUpperCase() + person.verificationStatus.slice(1).replace('_', ' ')
        : 'Unverified');

  // Document verification status
  const documentVerificationStatus = (person?.verificationChecks?.ocrCompleted || person?.documents?.some(d => d.status === 'verified'))
    ? 'Verified'
    : (isVerified ? 'Verified' : 'Pending');

  // Face verification status
  const faceVerificationStatus = (person?.verificationChecks?.faceMatchCompleted || (person?.faceMatchScore && person.faceMatchScore > 0))
    ? 'Verified'
    : (isVerified ? 'Verified' : 'Pending');

  // Face match score & Document match score
  const faceMatchScore = typeof person === 'object' && person.faceMatchScore !== undefined ? person.faceMatchScore : (isVerified ? 95 : 0);
  const documentMatchScore = typeof person === 'object' && person.documentMatchScore !== undefined ? person.documentMatchScore : (isVerified ? 100 : 0);

  // Photo document lookup
  const photoDoc = typeof person === 'object' && Array.isArray(person.documents)
    ? person.documents.find(d => d.docType === 'photo' || d.docType === 'selfie')
    : null;

  const photoUrl = photoDoc && photoDoc.filePath
    ? `http://localhost:5000/uploads/${photoDoc.filePath}`
    : null;

  const appliedDate = applicant.appliedAt
    ? new Date(applicant.appliedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  const handleAction = async (targetStatus) => {
    if (!jobId || !applicantId) return;
    if (appStatus === targetStatus) {
      addToast(`Application is already ${targetStatus}.`, { type: 'info' });
      return;
    }

    if (targetStatus === 'accepted') {
      setShowAdvanceModal(true);
      return;
    }

    setActionLoading(true);
    try {
      const res = await updateApplicationStatus(jobId, applicantId, targetStatus);
      if (res.success) {
        setAppStatus(targetStatus);
        addToast(`Application for ${name} has been marked as rejected.`, { type: 'info' });

        if (onStatusUpdate) {
          onStatusUpdate({ applicantId, jobId, status: targetStatus, updatedJob: res.job });
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to update application status', { type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmAdvanceHiring = async (txnRecord) => {
    setActionLoading(true);
    try {
      const res = await updateApplicationStatus(jobId, applicantId, 'accepted');
      if (res.success) {
        setAppStatus('accepted');
        // Persist transaction record locally
        try {
          const raw = localStorage.getItem('wl_transactions');
          const list = raw ? JSON.parse(raw) : [];
          list.unshift(txnRecord);
          localStorage.setItem('wl_transactions', JSON.stringify(list));
        } catch (e) {
          console.error('Failed to save transaction:', e);
        }

        addToast(`🎉 50% Advance paid & ${name} hired for "${job?.title || 'Job'}"!`, { type: 'success' });
        if (onStatusUpdate) {
          onStatusUpdate({ applicantId, jobId, status: 'accepted', updatedJob: res.job, transaction: txnRecord });
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to hire applicant', { type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCompletionAction = async () => {
    setActionLoading(true);
    try {
      const res = await confirmJobCompletion(jobId);
      if (res.success) {
        setCompletionStatus('completed');
        setShowConfirmCompletionModal(false);
        addToast('🎉 Job completion confirmed! Remaining 50% payment is now available.', { type: 'success' });
        if (onStatusUpdate) {
          onStatusUpdate({ applicantId, jobId, status: 'completed', completionStatus: 'completed', updatedJob: res.job });
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to confirm job completion', { type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRaiseIssueAction = async (e) => {
    if (e) e.preventDefault();
    if (!issueReason.trim()) {
      addToast('Please enter a reason for the dispute.', { type: 'error' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await raiseJobIssue(jobId, issueReason);
      if (res.success) {
        setCompletionStatus('disputed');
        setDisputeReason(issueReason.trim());
        setShowRaiseIssueModal(false);
        addToast('⚠️ Issue submitted. Work status set to Disputed.', { type: 'info' });
        if (onStatusUpdate) {
          onStatusUpdate({ applicantId, jobId, status: 'accepted', completionStatus: 'disputed', updatedJob: res.job });
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to raise issue', { type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRemainingPaymentAction = async () => {
    setActionLoading(true);
    try {
      const res = await payRemainingPayment(jobId);
      if (res.success) {
        setRemainingPaymentPaid(true);
        addToast(`🎉 Remaining payment settled for "${job?.title || 'Job'}"!`, { type: 'success' });
        if (onStatusUpdate) {
          onStatusUpdate({
            applicantId,
            jobId,
            status: 'completed',
            completionStatus: 'completed',
            remainingPaymentPaid: true,
            workerSettled: true,
            updatedJob: res.job,
            transaction: res.transaction,
          });
        }
        return res;
      }
    } catch (err) {
      addToast(err.message || 'Failed to process remaining payment', { type: 'error' });
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Rate Worker Performance Action ── */
  const handleSubmitRatingAction = async (e) => {
    e.preventDefault();
    if (!jobId || alreadyReviewed) return;
    try {
      setSubmittingRating(true);
      const res = await rateWorkerPerformance(jobId, ratingValue, reviewComment);
      if (res && res.success) {
        setAlreadyReviewed(true);
        setExistingReview(res.review);
        setShowRateModal(false);
        const changeStr = res.trustScoreChange >= 0 ? `+${res.trustScoreChange}` : `${res.trustScoreChange}`;
        addToast(`⭐ Rating submitted! Worker Trust Score updated (${changeStr} pts).`, { type: 'success' });
        if (onStatusUpdate) {
          onStatusUpdate({
            applicantId,
            jobId,
            rated: true,
            review: res.review,
            trustScore: res.trustScore,
          });
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to submit rating & review', { type: 'error' });
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="applicant-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="applicant-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="applicant-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="applicant-header-badge">APPLICANT DETAILS</span>
              {appStatus === 'accepted' && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: completionStatus === 'waiting_employer_confirmation'
                    ? '#fef3c7'
                    : completionStatus === 'disputed'
                    ? '#fef2f2'
                    : completionStatus === 'completed'
                    ? '#ecfdf5'
                    : '#eff6ff',
                  color: completionStatus === 'waiting_employer_confirmation'
                    ? '#b45309'
                    : completionStatus === 'disputed'
                    ? '#b91c1c'
                    : completionStatus === 'completed'
                    ? '#047857'
                    : '#1d4ed8',
                  border: `1px solid ${
                    completionStatus === 'waiting_employer_confirmation'
                      ? '#fde68a'
                      : completionStatus === 'disputed'
                      ? '#fecaca'
                      : completionStatus === 'completed'
                      ? '#a7f3d0'
                      : '#bfdbfe'
                  }`,
                }}>
                  {completionStatus === 'waiting_employer_confirmation' && '⏳ Waiting for Your Confirmation'}
                  {completionStatus === 'disputed' && '⚠️ Disputed'}
                  {completionStatus === 'completed' && '✓ Completed'}
                  {(!completionStatus || completionStatus === 'in_progress') && '● In Progress'}
                </span>
              )}
            </div>
            <h2>{name}</h2>
            {job && <p className="applicant-job-subtitle">Applied for <strong>{job.title}</strong></p>}
          </div>
          <button className="applicant-modal-close-btn" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        {/* Body */}
        <div className="applicant-modal-body">
          
          {/* Step 12E: Notification Banner for Completion Status */}
          {appStatus === 'accepted' && completionStatus === 'waiting_employer_confirmation' && (
            <div style={{
              background: '#fef3c7',
              border: '1.5px solid #fde68a',
              borderRadius: 14,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontWeight: 800, fontSize: 14 }}>
                <span>⏳</span> Worker has marked the job as completed. Please confirm completion.
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#78350f', lineHeight: 1.4 }}>
                Please review the work and confirm completion to make the remaining 50% payout available, or raise an issue if there were deficiencies.
              </p>
            </div>
          )}

          {appStatus === 'accepted' && completionStatus === 'disputed' && (
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              borderRadius: 14,
              padding: '16px 18px',
              color: '#991b1b',
              fontSize: 13,
              marginBottom: 16,
            }}>
              <strong>⚠️ Work Status Disputed:</strong> {disputeReason || 'Dispute raised by employer. Remaining payment locked.'}
            </div>
          )}

          {appStatus === 'accepted' && completionStatus === 'completed' && (
            <div style={{
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              borderRadius: 14,
              padding: '16px 18px',
              color: '#065f46',
              fontSize: 13,
              marginBottom: 16,
            }}>
              <strong>✓ Work Completion Confirmed:</strong> The remaining 50% payment is now available for settlement.
            </div>
          )}

          {/* Profile Overview Banner */}
          <div className="applicant-profile-card card">
            <div className="applicant-avatar-wrapper">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name}
                  className="applicant-photo-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="applicant-initials-avatar" style={{ display: photoUrl ? 'none' : 'flex' }}>
                {initials}
              </div>
            </div>

            <div className="applicant-main-meta">
              <div className="applicant-title-row">
                <h3 className="applicant-name-title">{name}</h3>
                <span className={`pill ${isVerified ? 'pill-green' : 'pill-amber'}`}>
                  {isVerified ? '🛡️ WorkLink Verified' : '⏳ Pending Verification'}
                </span>
                <span className={`pill ${appStatus === 'accepted' ? 'pill-green' : appStatus === 'rejected' ? 'pill-red' : 'pill-amber'}`} style={{ marginLeft: 6 }}>
                  Status: {appStatus.charAt(0).toUpperCase() + appStatus.slice(1)}
                </span>
              </div>
              <div className="applicant-sub-meta">
                {email && <span>📧 {email}</span>}
                {phone && <span>📞 {phone}</span>}
                {appliedDate && <span>📅 Applied {appliedDate}</span>}
              </div>
            </div>

            <div className="applicant-trust-ring-box">
              <TrustRing score={trustScore} size={72} stroke={6} />
              <div className="applicant-trust-label">Trust Score</div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="applicant-details-grid">
            
            {/* 1. Location */}
            <div className="applicant-detail-item card">
              <div className="applicant-item-label">📍 Location</div>
              <div className="applicant-item-value">{location}</div>
            </div>

            {/* 2. WorkLink Verification Status */}
            <div className="applicant-detail-item card">
              <div className="applicant-item-label">🛡️ WorkLink Verification</div>
              <div className="applicant-item-value">
                <span className={`pill ${isVerified ? 'pill-green' : 'pill-amber'}`}>
                  {verificationStatus}
                </span>
              </div>
            </div>

            {/* 3. Document Verification Status */}
            <div className="applicant-detail-item card">
              <div className="applicant-item-label">📄 Document Verification</div>
              <div className="applicant-item-value">
                <span className={`pill ${documentVerificationStatus === 'Verified' ? 'pill-green' : 'pill-amber'}`}>
                  {documentVerificationStatus}
                </span>
              </div>
            </div>

            {/* 4. Face Verification Status */}
            <div className="applicant-detail-item card">
              <div className="applicant-item-label">📸 Face Verification</div>
              <div className="applicant-item-value">
                <span className={`pill ${faceVerificationStatus === 'Verified' ? 'pill-green' : 'pill-amber'}`}>
                  {faceVerificationStatus}
                </span>
              </div>
            </div>

            {/* 5. Document Match Score */}
            <div className="applicant-detail-item card">
              <div className="applicant-item-label">🔍 Document Match Score</div>
              <div className="applicant-item-value score-text">
                {documentMatchScore}%
              </div>
            </div>

            {/* 6. Face Match Score */}
            <div className="applicant-detail-item card">
              <div className="applicant-item-label">😃 Face Match Score</div>
              <div className="applicant-item-value score-text">
                {faceMatchScore}%
              </div>
            </div>

          </div>

          {/* Skills Section */}
          <div className="applicant-section card">
            <div className="section-heading" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontFamily: 'var(--font-display)', margin: 0 }}>🛠️ Skills & Qualifications</h3>
            </div>
            {skills.length === 0 ? (
              <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>No skills specified on candidate profile.</p>
            ) : (
              <div className="applicant-skills-list">
                {skills.map((s, idx) => {
                  const skillName = typeof s === 'object' ? s.name : s;
                  const skillLevel = typeof s === 'object' && s.level !== undefined ? s.level : null;
                  return (
                    <div key={idx} className="applicant-skill-chip">
                      <span className="skill-name">{skillName}</span>
                      {skillLevel !== null && (
                        <span className="skill-level">{skillLevel}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer with Hiring & Completion Actions */}
        <div className="applicant-modal-footer" style={{ gap: 12 }}>
          <button className="btn btn-outline" onClick={onClose} disabled={actionLoading}>
            Close
          </button>
          <div style={{ flex: 1 }} />

          {appStatus === 'accepted' ? (
            completionStatus === 'waiting_employer_confirmation' ? (
              <>
                <button
                  className="btn btn-outline"
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={() => setShowRaiseIssueModal(true)}
                  disabled={actionLoading}
                >
                  ⚠️ Raise an Issue
                </button>
                <button
                  className="btn btn-primary"
                  style={{ background: '#16a34a', borderColor: '#16a34a' }}
                  onClick={() => setShowConfirmCompletionModal(true)}
                  disabled={actionLoading}
                >
                  ✓ Confirm Job Completion
                </button>
              </>
            ) : completionStatus === 'completed' ? (
              remainingPaymentPaid ? (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline"
                    style={{ color: '#047857', borderColor: '#a7f3d0', background: '#ecfdf5', fontWeight: 700 }}
                    onClick={() => setShowRemainingModal(true)}
                  >
                    📄 View Payment Receipt
                  </button>
                  {alreadyReviewed ? (
                    <button
                      className="btn btn-outline"
                      style={{ color: '#b45309', borderColor: '#fde68a', background: '#fef3c7', fontWeight: 700 }}
                      onClick={() => setShowRateModal(true)}
                    >
                      ⭐ Reviewed ({existingReview?.rating || ratingValue}★)
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ background: '#f59e0b', borderColor: '#d97706', color: '#ffffff', fontWeight: 700 }}
                      onClick={() => setShowRateModal(true)}
                    >
                      ⭐ Rate Worker Performance
                    </button>
                  )}
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 700 }}
                  onClick={() => setShowRemainingModal(true)}
                  disabled={actionLoading}
                >
                  💳 Pay Remaining 50%
                </button>
              )
            ) : completionStatus === 'disputed' ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                background: '#fef2f2',
                color: '#b91c1c',
                fontWeight: 700,
                fontSize: 13.5,
                border: '1px solid #fecaca'
              }}>
                ⚠️ Disputed (Payment Locked)
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                background: '#eff6ff',
                color: '#1d4ed8',
                fontWeight: 700,
                fontSize: 13.5,
                border: '1px solid #bfdbfe'
              }}>
                ● Worker Hired (In Progress)
              </span>
            )
          ) : (
            <>
              <button
                className="btn btn-outline"
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                onClick={() => handleAction('rejected')}
                disabled={actionLoading || appStatus === 'rejected'}
              >
                {actionLoading ? 'Updating…' : appStatus === 'rejected' ? '❌ Rejected' : 'Reject Applicant'}
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
                onClick={() => handleAction('accepted')}
                disabled={actionLoading || appStatus === 'accepted'}
              >
                {actionLoading ? 'Updating…' : appStatus === 'accepted' ? '🎉 Accepted & Hired' : '✓ Accept & Hire'}
              </button>
            </>
          )}
        </div>

      </div>

      {/* ── STEP 12C + 12D: 50% ADVANCE PAYMENT CONFIRMATION & RECEIPT MODAL ── */}
      <EmployerAdvanceModal
        isOpen={showAdvanceModal}
        applicant={applicant}
        job={job}
        onClose={() => setShowAdvanceModal(false)}
        onConfirmAdvancePayment={handleConfirmAdvanceHiring}
        processing={actionLoading}
      />

      {/* ── STEP 12F + 12G: REMAINING PAYMENT & FINAL RECEIPT MODAL ── */}
      <EmployerRemainingModal
        isOpen={showRemainingModal}
        applicant={applicant}
        job={job}
        onClose={() => setShowRemainingModal(false)}
        onConfirmRemainingPayment={handleConfirmRemainingPaymentAction}
        processing={actionLoading}
      />

      {/* ── STEP 12E: CONFIRM JOB COMPLETION MODAL ── */}
      {showConfirmCompletionModal && (
        <div className="fee-modal-overlay" onClick={() => !actionLoading && setShowConfirmCompletionModal(false)}>
          <div className="fee-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#16a34a',
                fontSize: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                ✓
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                Confirm Job Completion
              </h3>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: 0 }}>
                Are you satisfied with the work completed by <strong>{name}</strong> for "<strong>{job?.title}</strong>"?
              </p>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '14px 18px',
              marginBottom: 20,
              fontSize: 13,
              color: '#334155'
            }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#0f172a' }}>
                Next Steps upon confirmation:
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#64748b', lineHeight: 1.6 }}>
                <li>Job status will be updated to <strong>Completed</strong>.</li>
                <li>Worker will receive an instant completion notification.</li>
                <li>The remaining 50% payment will become available for disbursement.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowConfirmCompletionModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.5, background: '#16a34a', borderColor: '#16a34a' }}
                onClick={handleConfirmCompletionAction}
                disabled={actionLoading}
              >
                {actionLoading ? 'Confirming…' : '✓ Confirm & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 12E: RAISE AN ISSUE MODAL ── */}
      {showRaiseIssueModal && (
        <div className="fee-modal-overlay" onClick={() => !actionLoading && setShowRaiseIssueModal(false)}>
          <div className="fee-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                ⚠️
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Raise an Issue
                </h3>
                <p style={{ fontSize: 12.5, color: '#64748b', margin: 0 }}>
                  Report an issue with the completed work
                </p>
              </div>
            </div>

            <form onSubmit={handleRaiseIssueAction}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Reason for Issue / Dispute <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  placeholder="Describe why the work is incomplete or unsatisfactory..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: 13.5,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 20,
                fontSize: 12,
                color: '#9f1239'
              }}>
                ⚠️ Raising an issue will freeze the remaining 50% payment and mark the job as <strong>Disputed</strong>. The worker will be notified immediately.
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowRaiseIssueModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ flex: 1.5, background: '#dc2626', color: '#fff', fontWeight: 700 }}
                  disabled={actionLoading || !issueReason.trim()}
                >
                  {actionLoading ? 'Submitting…' : '⚠️ Submit Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── STEP 12G: RATE WORKER PERFORMANCE & WRITE REVIEW MODAL ── */}
      {showRateModal && (
        <div className="fee-modal-overlay" onClick={() => !submittingRating && setShowRateModal(false)}>
          <div className="fee-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 14, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>⭐</span>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Rate Worker Performance
                  </h3>
                  <p style={{ fontSize: 12.5, color: '#64748b', margin: '2px 0 0' }}>
                    for <strong>{name}</strong> • {job?.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submittingRating && setShowRateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {alreadyReviewed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  padding: '14px 16px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 10,
                  fontSize: 13.5,
                  color: '#065f46',
                  fontWeight: 600
                }}>
                  ✓ You have already reviewed this completed job.
                </div>

                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} style={{ fontSize: 22, color: s <= (existingReview?.rating || ratingValue) ? '#f59e0b' : '#cbd5e1' }}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 12,
                      background: (existingReview?.trustScoreChange ?? 0) >= 0 ? '#d1fae5' : '#fee2e2',
                      color: (existingReview?.trustScoreChange ?? 0) >= 0 ? '#047857' : '#b91c1c'
                    }}>
                      {(existingReview?.trustScoreChange ?? 0) >= 0 ? `+${existingReview?.trustScoreChange}` : existingReview?.trustScoreChange} Trust Points
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, color: '#334155', fontStyle: existingReview?.review ? 'normal' : 'italic' }}>
                    {existingReview?.review ? `"${existingReview.review}"` : 'No written review comment.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowRateModal(false)}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitRatingAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Interactive Star Picker */}
                <div>
                  <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                    Worker Rating (1 to 5 Stars) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingValue(star)}
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(0)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: 32,
                          lineHeight: 1,
                          color: (ratingHover || ratingValue) >= star ? '#f59e0b' : '#cbd5e1',
                          transition: 'transform 0.15s ease, color 0.15s ease',
                          transform: (ratingHover || ratingValue) >= star ? 'scale(1.15)' : 'scale(1)',
                        }}
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                    <span style={{ marginLeft: 12, fontWeight: 800, fontSize: 16, color: '#0f172a' }}>
                      {ratingHover || ratingValue} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Score impact indicator */}
                <div style={{
                  padding: '12px 16px',
                  background: (ratingHover || ratingValue) >= 4 ? '#ecfdf5' : (ratingHover || ratingValue) === 3 ? '#eff6ff' : '#fef2f2',
                  border: `1px solid ${(ratingHover || ratingValue) >= 4 ? '#a7f3d0' : (ratingHover || ratingValue) === 3 ? '#bfdbfe' : '#fecaca'}`,
                  borderRadius: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ fontSize: 13, color: '#334155' }}>
                    Trust Score Impact:
                  </div>
                  <div style={{
                    fontWeight: 800,
                    fontSize: 14,
                    color: (ratingHover || ratingValue) === 5 ? '#047857' : (ratingHover || ratingValue) === 4 ? '#059669' : (ratingHover || ratingValue) === 3 ? '#1d4ed8' : (ratingHover || ratingValue) === 2 ? '#b91c1c' : '#dc2626'
                  }}>
                    {(ratingHover || ratingValue) === 5 && '🌟 +3 Trust Points (Excellent)'}
                    {(ratingHover || ratingValue) === 4 && '👍 +2 Trust Points (Good)'}
                    {(ratingHover || ratingValue) === 3 && '⚖️ 0 Trust Points (Average)'}
                    {(ratingHover || ratingValue) === 2 && '⚠️ -2 Trust Points (Below Expectations)'}
                    {(ratingHover || ratingValue) === 1 && '❌ -4 Trust Points (Unsatisfactory)'}
                  </div>
                </div>

                {/* Review Textarea */}
                <div>
                  <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                    Employer Review (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="e.g. Completed the work on time and performed the task properly."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid #cbd5e1',
                      fontSize: 13.5,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, display: 'block' }}>
                    🔒 One review per completed job. Verified and published to worker's public profile.
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => setShowRateModal(false)}
                    disabled={submittingRating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1.5, background: '#f59e0b', borderColor: '#d97706', color: '#ffffff', fontWeight: 700 }}
                    disabled={submittingRating}
                  >
                    {submittingRating ? 'Submitting…' : '⭐ Submit Rating & Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
