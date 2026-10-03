import React, { useState, useEffect, useMemo } from 'react';
import { getMyApplications, markWorkCompleted, getJobTransaction } from '../data/api';
import { useToast } from '../components/Toast/Toast';
import WorkerEarningsReceiptModal from '../components/FeeReceipt/WorkerEarningsReceiptModal';
import './WorkerMyWork.css';

export default function WorkerMyWork({ initialTab = 'upcoming', onNavigate }) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab || 'upcoming');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWorkModal, setActiveWorkModal] = useState(null);
  const [completionConfirmItem, setCompletionConfirmItem] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [earningsReceiptData, setEarningsReceiptData] = useState(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    let isMounted = true;
    getMyApplications()
      .then((res) => {
        if (isMounted && res?.success && Array.isArray(res.applications)) {
          setApplications(res.applications);
        }
      })
      .catch((err) => {
        console.error('Error fetching work applications:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter ONLY accepted/hired jobs for Upcoming Work (excluding already confirmed completed)
  const upcomingWork = useMemo(() => {
    return applications.filter((app) => {
      const isHired = app.status === 'accepted' || app.status === 'hired';
      const isCompleted = app.status === 'completed' || app.job?.completionStatus === 'completed';
      return isHired && !isCompleted;
    });
  }, [applications]);

  // Filter ONLY completed jobs for Completed Work
  const completedWork = useMemo(() => {
    return applications.filter((app) => {
      return app.status === 'completed' || app.job?.completionStatus === 'completed';
    });
  }, [applications]);

  // Mark Work Completed by Worker
  const handleMarkCompleted = async () => {
    if (!completionConfirmItem) return;
    const jobId = completionConfirmItem.job?._id || completionConfirmItem.job?.id || completionConfirmItem.job;
    setCompleting(true);
    try {
      const res = await markWorkCompleted(jobId);
      if (res?.success) {
        addToast('🎉 Work marked as completed! Employer has been notified to confirm.', { type: 'success' });
        setApplications((prev) =>
          prev.map((app) => {
            const id = app.job?._id || app.job?.id || app.job;
            if (String(id) === String(jobId)) {
              return {
                ...app,
                job: {
                  ...(app.job || {}),
                  completionStatus: 'waiting_employer_confirmation',
                  workerCompletedAt: new Date(),
                },
                completionStatus: 'waiting_employer_confirmation',
              };
            }
            return app;
          })
        );
        setCompletionConfirmItem(null);
        if (activeWorkModal) setActiveWorkModal(null);
      } else {
        addToast(res?.message || 'Failed to mark work as completed.', { type: 'error' });
      }
    } catch (err) {
      addToast(err?.message || 'Failed to mark work as completed.', { type: 'error' });
    } finally {
      setCompleting(false);
    }
  };

  const handleContactEmployer = (item) => {
    const employerObj = item.job?.employer;
    const employerId = employerObj?._id || employerObj?.id || employerObj;
    const employerName =
      employerObj?.name ||
      (employerObj?.firstName
        ? `${employerObj.firstName} ${employerObj.lastName || ''}`.trim()
        : 'Employer');

    if (onNavigate) {
      onNavigate('messages', {
        employerId: String(employerId),
        employerName,
        jobId: item.job?._id || item.job?.id,
        jobTitle: item.job?.title,
      });
    }
  };

  const handleOpenEarningsReceipt = async (item) => {
    const jobId = item.job?._id || item.job?.id || item.job;
    try {
      const res = await getJobTransaction(jobId);
      if (res?.success && res?.receipt) {
        setEarningsReceiptData({
          receipt: res.receipt,
          job: item.job,
        });
      } else {
        setEarningsReceiptData({
          receipt: null,
          job: item.job,
        });
      }
    } catch (err) {
      console.error('Failed to load transaction receipt:', err);
      setEarningsReceiptData({
        receipt: null,
        job: item.job,
      });
    }
  };

  return (
    <div className="wrk-mywork-container">
      {/* ── Page Header ── */}
      <div className="wrk-mywork-header">
        <h1 className="wrk-mywork-title">My Work</h1>
        <p className="wrk-mywork-subtitle">
          Manage your accepted, upcoming and completed work.
        </p>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="wrk-mywork-tabs-bar">
        <button
          type="button"
          className={`wrk-mywork-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <span>⏳ Upcoming</span>
          <span className="wrk-mywork-tab-badge">{upcomingWork.length}</span>
        </button>

        <button
          type="button"
          className={`wrk-mywork-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <span>✅ Completed</span>
          <span className="wrk-mywork-tab-badge">{completedWork.length}</span>
        </button>
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="wrk-mywork-empty">
          <div className="wrk-state-spinner" />
          <h3 className="wrk-mywork-empty-title">Loading your work…</h3>
        </div>
      )}

      {/* ── UPCOMING WORK TAB ── */}
      {!loading && activeTab === 'upcoming' && (
        <>
          {upcomingWork.length === 0 ? (
            <div className="wrk-mywork-empty">
              <div className="wrk-mywork-empty-icon">⏳</div>
              <h2 className="wrk-mywork-empty-title">No Upcoming Work</h2>
              <p className="wrk-mywork-empty-desc">
                Your accepted jobs will appear here.
              </p>
              <button
                type="button"
                className="wrk-work-btn-primary"
                onClick={() => onNavigate('jobs')}
              >
                🔍 Browse Available Jobs
              </button>
            </div>
          ) : (
            <div className="wrk-mywork-grid">
              {upcomingWork.map((item, idx) => {
                const job = item.job || {};
                const employerName =
                  job.employer?.name ||
                  (job.employer?.firstName
                    ? `${job.employer.firstName} ${job.employer.lastName || ''}`.trim()
                    : 'WorkLink Employer');

                const scheduledDate = job.date
                  ? job.date
                  : item.appliedAt
                  ? new Date(item.appliedAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Scheduled';

                const timing = job.time || (job.duration ? `Duration: ${job.duration}` : 'Shift Time: Flexible / Confirmed with Employer');
                const payment = job.pay || 'Payment information not available';
                const completionStatus = job.completionStatus || item.completionStatus || 'in_progress';

                return (
                  <div key={item.applicationId || idx} className="wrk-work-card">
                    <div className="wrk-work-card-header">
                      <div className="wrk-work-card-title-group">
                        <h3 className="wrk-work-card-title">{job.title || 'Work Assignment'}</h3>
                        <div className="wrk-work-card-subline">
                          <span>🏷️ {job.department || 'General'}</span>
                          <span>•</span>
                          <span>🏢 {employerName}</span>
                        </div>
                      </div>

                      {completionStatus === 'waiting_employer_confirmation' ? (
                        <span className="wrk-work-status-badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                          ⏳ Waiting for Employer Confirmation
                        </span>
                      ) : completionStatus === 'disputed' ? (
                        <span className="wrk-work-status-badge" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                          ⚠️ Disputed
                        </span>
                      ) : completionStatus === 'completed' ? (
                        <span className="wrk-work-status-badge completed">
                          ✓ Completed
                        </span>
                      ) : (
                        <span className="wrk-work-status-badge accepted">
                          ● In Progress
                        </span>
                      )}
                    </div>

                    <div className="wrk-work-schedule-box">
                      <div className="wrk-schedule-item">
                        <span className="wrk-schedule-icon">📍</span>
                        <span>{job.location || 'Location upon deployment'}</span>
                      </div>
                      <div className="wrk-schedule-item">
                        <span className="wrk-schedule-icon">📅</span>
                        <span>{scheduledDate}</span>
                      </div>
                      <div className="wrk-schedule-item" style={{ gridColumn: 'span 2' }}>
                        <span className="wrk-schedule-icon">🕐</span>
                        <span>{timing}</span>
                      </div>
                    </div>

                    {completionStatus === 'disputed' && job.disputeReason && (
                      <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#991b1b' }}>
                        <strong>⚠️ Employer Raised Issue:</strong> {job.disputeReason}
                      </div>
                    )}

                    <div className="wrk-work-pay-row">
                      <span className="wrk-work-pay-label">Offered Compensation</span>
                      <span className="wrk-work-pay-val">💰 {payment}</span>
                    </div>

                    <div className="wrk-work-card-footer" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <button
                        type="button"
                        className="wrk-work-btn-secondary"
                        onClick={() => setActiveWorkModal({ ...item, employerName, scheduledDate, timing, payment, completionStatus })}
                      >
                        View Details
                      </button>

                      {completionStatus === 'in_progress' ? (
                        <button
                          type="button"
                          className="wrk-work-btn-primary"
                          style={{ background: '#16a34a', borderColor: '#16a34a' }}
                          onClick={() => setCompletionConfirmItem(item)}
                        >
                          ✓ Mark Work as Completed
                        </button>
                      ) : completionStatus === 'waiting_employer_confirmation' ? (
                        <button
                          type="button"
                          className="wrk-work-btn-secondary"
                          disabled
                          style={{ opacity: 0.7, cursor: 'not-allowed', color: '#b45309' }}
                        >
                          ⏳ Awaiting Employer Confirmation
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="wrk-work-btn-secondary"
                        onClick={() => handleContactEmployer(item)}
                      >
                        💬 Contact Employer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── COMPLETED WORK TAB ── */}
      {!loading && activeTab === 'completed' && (
        <>
          {completedWork.length === 0 ? (
            <div className="wrk-mywork-empty">
              <div className="wrk-mywork-empty-icon">✅</div>
              <h2 className="wrk-mywork-empty-title">No Completed Work</h2>
              <p className="wrk-mywork-empty-desc">
                Your completed jobs will appear here.
              </p>
            </div>
          ) : (
            <div className="wrk-mywork-grid">
              {completedWork.map((item, idx) => {
                const job = item.job || {};
                const employerName =
                  job.employer?.name ||
                  (job.employer?.firstName
                    ? `${job.employer.firstName} ${job.employer.lastName || ''}`.trim()
                    : 'WorkLink Employer');

                const completedDate = item.appliedAt
                  ? new Date(item.appliedAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Completed';

                const payment = job.pay || 'Payment information not available';

                return (
                  <div key={item.applicationId || idx} className="wrk-work-card">
                    <div className="wrk-work-card-header">
                      <div className="wrk-work-card-title-group">
                        <h3 className="wrk-work-card-title">{job.title || 'Completed Shift'}</h3>
                        <div className="wrk-work-card-subline">
                          <span>🏷️ {job.department || 'General'}</span>
                          <span>•</span>
                          <span>🏢 {employerName}</span>
                        </div>
                      </div>

                      <span className="wrk-work-status-badge completed">
                        ✓ Completed
                      </span>
                    </div>

                    <div className="wrk-work-schedule-box">
                      <div className="wrk-schedule-item">
                        <span className="wrk-schedule-icon">📍</span>
                        <span>{job.location || 'Completed site'}</span>
                      </div>
                      <div className="wrk-schedule-item">
                        <span className="wrk-schedule-icon">📅</span>
                        <span>Completed: {completedDate}</span>
                      </div>
                    </div>

                    <div className="wrk-work-pay-row">
                      <span className="wrk-work-pay-label">Settled Payout</span>
                      <span className="wrk-work-pay-val">💰 {payment}</span>
                    </div>

                    <div className="wrk-work-card-footer" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="wrk-work-btn-secondary"
                        onClick={() => setActiveWorkModal({ ...item, employerName, scheduledDate: completedDate, timing: 'Completed', payment })}
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        className="wrk-work-btn-primary"
                        style={{ background: '#059669', borderColor: '#059669' }}
                        onClick={() => handleOpenEarningsReceipt(item)}
                      >
                        📄 View Earnings Receipt
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── WORK DETAILS MODAL ── */}
      {activeWorkModal && (
        <div
          className="wrk-modal-backdrop"
          onClick={() => setActiveWorkModal(null)}
        >
          <div
            className="wrk-modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="wrk-modal-header">
              <div className="wrk-modal-title-group">
                <div className="wrk-modal-badges">
                  <span className="wrk-modal-dept-badge">
                    {activeWorkModal.job?.department || 'General'}
                  </span>
                  <span className={`wrk-work-status-badge ${activeWorkModal.status === 'completed' ? 'completed' : 'accepted'}`}>
                    ● {activeWorkModal.status === 'completed' ? 'Completed & Settled' : 'Accepted Work'}
                  </span>
                </div>
                <h2 className="wrk-modal-title">{activeWorkModal.job?.title}</h2>
              </div>
              <button
                type="button"
                className="wrk-modal-close-btn"
                onClick={() => setActiveWorkModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="wrk-modal-body">
              {/* Work Information */}
              <div className="wrk-modal-section">
                <h3 className="wrk-modal-section-title">Work Information</h3>
                <div className="wrk-modal-info-grid">
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Employer</span>
                    <span className="wrk-modal-info-value">{activeWorkModal.employerName}</span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Department</span>
                    <span className="wrk-modal-info-value">{activeWorkModal.job?.department || 'General'}</span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Location</span>
                    <span className="wrk-modal-info-value">{activeWorkModal.job?.location}</span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Scheduled Date</span>
                    <span className="wrk-modal-info-value">{activeWorkModal.scheduledDate}</span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Shift Timing</span>
                    <span className="wrk-modal-info-value">{activeWorkModal.timing}</span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Job Type</span>
                    <span className="wrk-modal-info-value">{activeWorkModal.job?.type || 'Part-time'}</span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Payment</span>
                    <span className="wrk-modal-info-value" style={{ color: '#059669' }}>
                      {activeWorkModal.payment}
                    </span>
                  </div>
                  <div className="wrk-modal-info-item">
                    <span className="wrk-modal-info-label">Current Status</span>
                    <span className="wrk-modal-info-value" style={{ color: activeWorkModal.status === 'completed' ? '#059669' : '#2563eb' }}>
                      {activeWorkModal.status === 'completed' ? 'Completed & Settled' : 'Accepted / Confirmed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="wrk-modal-section">
                <h3 className="wrk-modal-section-title">Job Description</h3>
                <div className="wrk-modal-desc-box">
                  {activeWorkModal.job?.description || 'No detailed job description provided.'}
                </div>
              </div>
            </div>

            <div className="wrk-modal-footer">
              <div className="wrk-modal-footer-pay">
                <span className="wrk-modal-footer-pay-label">Total Compensation</span>
                <span className="wrk-modal-footer-pay-val">{activeWorkModal.payment}</span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {activeWorkModal.status === 'completed' ? (
                  <button
                    type="button"
                    className="wrk-work-btn-primary"
                    style={{ background: '#059669', borderColor: '#059669' }}
                    onClick={() => {
                      handleOpenEarningsReceipt(activeWorkModal);
                    }}
                  >
                    📄 View Earnings Receipt
                  </button>
                ) : (
                  <>
                    {(activeWorkModal.completionStatus === 'in_progress' || !activeWorkModal.completionStatus) && (
                      <button
                        type="button"
                        className="wrk-work-btn-primary"
                        style={{ background: '#16a34a', borderColor: '#16a34a' }}
                        onClick={() => {
                          setCompletionConfirmItem(activeWorkModal);
                        }}
                      >
                        ✓ Mark Work as Completed
                      </button>
                    )}

                    <button
                      type="button"
                      className="wrk-work-btn-secondary"
                      onClick={() => {
                        setActiveWorkModal(null);
                        handleContactEmployer(activeWorkModal);
                      }}
                    >
                      💬 Contact Employer
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 12E: WORKER COMPLETION CONFIRMATION MODAL ── */}
      {completionConfirmItem && (
        <div
          className="wrk-modal-backdrop"
          onClick={() => !completing && setCompletionConfirmItem(null)}
          style={{ zIndex: 1200 }}
        >
          <div
            className="wrk-modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480, padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ecfdf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900 }}>
                ✓
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  Have you completed this work?
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {completionConfirmItem.job?.title || 'Work Assignment'}
                </span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 20px' }}>
              Please confirm that you have finished all tasks required for this assignment. Once submitted, your employer will be notified to review and sign off on completion.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="wrk-work-btn-secondary"
                onClick={() => setCompletionConfirmItem(null)}
                disabled={completing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="wrk-work-btn-primary"
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
                onClick={handleMarkCompleted}
                disabled={completing}
              >
                {completing ? 'Submitting…' : 'Mark as Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 12G: WORKER EARNINGS RECEIPT MODAL ── */}
      <WorkerEarningsReceiptModal
        isOpen={Boolean(earningsReceiptData)}
        receipt={earningsReceiptData?.receipt}
        job={earningsReceiptData?.job}
        onClose={() => setEarningsReceiptData(null)}
      />
    </div>
  );
}
