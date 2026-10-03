import React, { useState, useEffect } from 'react';
import { getJobs, getMyApplications, getWorkerEarnings } from '../data/api';
import './WorkerHome.css';

// Helper: Check if job date is today or in the future
export function isJobTodayOrFuture(job) {
  if (!job) return false;
  const dateVal = job.startDate || job.scheduledDate || job.date || job.createdAt;
  if (!dateVal) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let jDate;
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
    const [year, month, day] = dateVal.trim().split('-').map(Number);
    jDate = new Date(year, month - 1, day);
  } else {
    jDate = new Date(dateVal);
  }

  if (isNaN(jDate.getTime())) return true;
  jDate.setHours(0, 0, 0, 0);

  return jDate.getTime() >= today.getTime();
}

export default function WorkerHome({ user, onNavigate, onCompleteProfile }) {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [earningsSummary, setEarningsSummary] = useState(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingEarnings, setLoadingEarnings] = useState(true);
  const [imgError, setImgError] = useState(false);

  // Debugging user runtime state
  console.log('[WorkerHome Debug] user:', user);
  console.log('[WorkerHome Debug] user.profileComplete:', user?.profileComplete);
  console.log('[WorkerHome Debug] user.isVerified:', user?.isVerified);
  console.log('[WorkerHome Debug] user.verificationStatus:', user?.verificationStatus);
  console.log('[WorkerHome Debug] onCompleteProfile type:', typeof onCompleteProfile);

  // Fetch real jobs, applications, and earnings/transaction data
  useEffect(() => {
    let isMounted = true;

    getJobs()
      .then((res) => {
        if (isMounted && res?.success && Array.isArray(res.jobs)) {
          setJobs(res.jobs);
        }
      })
      .catch((err) => {
        console.error('Error fetching jobs:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingJobs(false);
      });

    getMyApplications()
      .then((res) => {
        if (isMounted && res?.success && Array.isArray(res.applications)) {
          setApplications(res.applications);
        }
      })
      .catch((err) => {
        console.error('Error fetching applications:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingApps(false);
      });

    getWorkerEarnings()
      .then((res) => {
        if (isMounted && res?.success && res.summary) {
          setEarningsSummary(res.summary);
        }
      })
      .catch((err) => {
        console.error('Error fetching worker earnings:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingEarnings(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Worker information derived from real user object
  const workerFullName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Worker');
  const initials = workerFullName
    ? workerFullName.split(' ').map((n) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
    : 'WK';

  const isVerified = Boolean(user?.isVerified || user?.verificationStatus === 'approved');
  const isProfileComplete = Boolean(user?.profileComplete && isVerified);
  const trustScore = typeof user?.trustScore === 'number' ? user.trustScore : (isVerified ? 20 : 0);

  // Resolve worker photo URL if available
  const photoDoc = user?.documents?.find((d) => d.docType === 'photo');
  const photoUrl =
    user?.photoUrl ||
    user?.avatar ||
    (photoDoc?.filePath ? `http://localhost:5000/${photoDoc.filePath.replace(/\\/g, '/')}` : null);

  // Derive counts from real data (show only active jobs scheduled for today or future)
  const activeJobs = jobs.filter((j) => (j.status === 'active' || !j.status) && isJobTodayOrFuture(j));
  const activeJobsCount = activeJobs.length;
  const myApplicationsCount = applications.length;
  const acceptedJobsCount = applications.filter(
    (app) => app.status === 'accepted' || app.status === 'hired'
  ).length;

  // Recommended jobs: real recent active today/future jobs (max 4)
  const recommendedJobs = activeJobs.slice(0, 4);

  // Recent applications (max 5)
  const recentApplications = applications.slice(0, 5);

  // Helper for status badge class
  const getStatusClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'accepted':
      case 'hired':
        return 'status-accepted';
      case 'rejected':
        return 'status-rejected';
      case 'completed':
        return 'status-completed';
      case 'pending':
      default:
        return 'status-pending';
    }
  };

  // Department icon helper
  const getDepartmentIcon = (dept) => {
    switch (dept) {
      case 'Catering':
        return '🍽️';
      case 'Driving':
        return '🚗';
      case 'Cleaning':
        return '🧹';
      case 'Delivery':
        return '📦';
      default:
        return '💼';
    }
  };

  return (
    <div className="wrk-home-container">
      {/* ── 1. WELCOME SECTION ── */}
      <section className="wrk-home-welcome-card">
        <div className="wrk-home-welcome-left">
          <div className="wrk-home-avatar-wrap">
            {photoUrl && !imgError ? (
              <img
                src={photoUrl}
                alt={workerFullName}
                className="wrk-home-avatar-img"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="wrk-home-avatar-placeholder">{initials}</div>
            )}
          </div>

          <div className="wrk-home-welcome-text">
            <div className="wrk-home-title-row">
              <h1 className="wrk-home-title">
                Welcome back, {workerFullName}! 👋
              </h1>
            </div>
            <p className="wrk-home-subtitle">
              Find suitable work and manage your opportunities.
            </p>

            <div className="wrk-home-badges-row">
              {isVerified ? (
                <span className="wrk-badge-verified">
                  ✓ Verified Worker
                </span>
              ) : (
                <span className="wrk-badge-unverified">
                  ⏳ Verification Pending
                </span>
              )}

              {trustScore > 0 ? (
                <span className="wrk-badge-trust">
                  🛡️ Trust Score: {trustScore} pts
                </span>
              ) : (
                <span className="wrk-badge-trust" style={{ color: '#64748b', borderColor: '#e2e8f0', background: '#f8fafc' }}>
                  🛡️ Trust Score: 0 pts
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Complete Profile CTA button in Welcome Card header */}
        {!isProfileComplete && (
          <div className="wrk-home-welcome-cta">
            <button
              type="button"
              className="wrk-complete-profile-btn"
              onClick={() => onCompleteProfile && onCompleteProfile()}
            >
              📄 Complete Your Profile →
            </button>
          </div>
        )}
      </section>

      {/* ── PROFILE COMPLETION NUDGE BANNER ── */}
      {!isProfileComplete && (
        <section className="wrk-profile-nudge-banner fade-up">
          <div className="wrk-nudge-left">
            <div className="wrk-nudge-icon">🛡️</div>
            <div className="wrk-nudge-text">
              <h3 className="wrk-nudge-title">Complete Your Profile & Verification</h3>
              <p className="wrk-nudge-desc">
                Submit your basic details, skills, identity documents (Aadhaar & optional PAN), and live face verification to get verified and unlock job applications.
              </p>
            </div>
          </div>
          <div className="wrk-nudge-right">
            <button
              type="button"
              className="wrk-nudge-action-btn"
              onClick={() => onCompleteProfile && onCompleteProfile()}
            >
              Complete Your Profile →
            </button>
          </div>
        </section>
      )}

      {/* ── 2. SUMMARY CARDS (4 Clickable Cards) ── */}
      <section className="wrk-home-summary-grid">
        {/* Available Jobs */}
        <div
          className="wrk-summary-card"
          onClick={() => onNavigate('jobs')}
          title="Browse all available jobs"
        >
          <div className="wrk-summary-card-top">
            <div className="wrk-summary-icon" style={{ background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb' }}>
              💼
            </div>
            <span className="wrk-summary-arrow">→</span>
          </div>
          <div className="wrk-summary-main">
            <span className="wrk-summary-value">
              {loadingJobs ? '…' : activeJobsCount}
            </span>
            <span className="wrk-summary-label">Available Jobs</span>
            <span className="wrk-summary-subtext">Active listings on WorkLink</span>
          </div>
        </div>

        {/* My Applications */}
        <div
          className="wrk-summary-card"
          onClick={() => onNavigate('applications')}
          title="View your job applications"
        >
          <div className="wrk-summary-card-top">
            <div className="wrk-summary-icon" style={{ background: 'rgba(234, 88, 12, 0.08)', color: '#ea580c' }}>
              📑
            </div>
            <span className="wrk-summary-arrow">→</span>
          </div>
          <div className="wrk-summary-main">
            <span className="wrk-summary-value">
              {loadingApps ? '…' : myApplicationsCount}
            </span>
            <span className="wrk-summary-label">My Applications</span>
            <span className="wrk-summary-subtext">Submitted proposals</span>
          </div>
        </div>

        {/* Accepted Jobs */}
        <div
          className="wrk-summary-card"
          onClick={() => onNavigate('work-completed')}
          title="View accepted and completed work"
        >
          <div className="wrk-summary-card-top">
            <div className="wrk-summary-icon" style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10b981' }}>
              ✅
            </div>
            <span className="wrk-summary-arrow">→</span>
          </div>
          <div className="wrk-summary-main">
            <span className="wrk-summary-value">
              {loadingApps ? '…' : acceptedJobsCount}
            </span>
            <span className="wrk-summary-label">Accepted Jobs</span>
            <span className="wrk-summary-subtext">Hired & confirmed assignments</span>
          </div>
        </div>

        {/* Transaction Amount */}
        <div
          className="wrk-summary-card"
          onClick={() => onNavigate('earnings')}
          title="View transaction history & payouts"
        >
          <div className="wrk-summary-card-top">
            <div className="wrk-summary-icon" style={{ background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed' }}>
              💳
            </div>
            <span className="wrk-summary-arrow">→</span>
          </div>
          <div className="wrk-summary-main">
            <span className="wrk-summary-value">
              {loadingEarnings ? '…' : `₹${(earningsSummary?.totalEarnings ?? 0).toLocaleString('en-IN')}`}
            </span>
            <span className="wrk-summary-label">Transaction Amount</span>
            <span className="wrk-summary-subtext">Total settled transaction payouts</span>
          </div>
        </div>
      </section>

      {/* ── 5. QUICK ACTIONS ── */}
      <section className="wrk-home-quick-actions-bar">
        <div className="wrk-quick-actions-label">
          <span>⚡</span> Quick Actions
        </div>
        <div className="wrk-quick-actions-btns">
          {!isProfileComplete && onCompleteProfile && (
            <button
              type="button"
              className="wrk-quick-action-btn highlight"
              onClick={onCompleteProfile}
            >
              <span>📄</span> Complete Profile
            </button>
          )}
          <button
            type="button"
            className="wrk-quick-action-btn primary"
            onClick={() => onNavigate('jobs')}
          >
            <span>🔍</span> Find Jobs
          </button>
          <button
            type="button"
            className="wrk-quick-action-btn"
            onClick={() => onNavigate('applications')}
          >
            <span>📑</span> My Applications
          </button>
          <button
            type="button"
            className="wrk-quick-action-btn"
            onClick={() => onNavigate('profile')}
          >
            <span>👤</span> View Profile
          </button>
        </div>
      </section>

      {/* ── 3 & 4. RECOMMENDED JOBS & RECENT APPLICATIONS ── */}
      <div className="wrk-home-sections-grid">
        {/* 3. RECOMMENDED JOBS */}
        <section className="wrk-section-shell">
          <div className="wrk-section-header">
            <div className="wrk-section-title-wrap">
              <h2 className="wrk-section-title">
                <span>💼</span> Recommended Jobs
              </h2>
              <p className="wrk-section-desc">
                Recent active job openings from verified employers
              </p>
            </div>
            <button
              type="button"
              className="wrk-view-all-link"
              onClick={() => onNavigate('jobs')}
            >
              Browse All →
            </button>
          </div>

          {loadingJobs ? (
            <div className="wrk-home-loading-box">
              <span>⏳</span> Loading recommended jobs…
            </div>
          ) : recommendedJobs.length > 0 ? (
            <div className="wrk-jobs-list">
              {recommendedJobs.map((job) => {
                const employerName =
                  job.employer?.name ||
                  (job.employer?.firstName
                    ? `${job.employer.firstName} ${job.employer.lastName || ''}`.trim()
                    : 'WorkLink Employer');

                const isEmpVerified = Boolean(
                  job.employer?.isVerified || (job.employer?.trustScore && job.employer.trustScore >= 70)
                );

                return (
                  <div key={job._id || job.id} className="wrk-job-item-card">
                    <div className="wrk-job-item-top">
                      <div className="wrk-job-item-main">
                        <h3 className="wrk-job-item-title">{job.title}</h3>
                        <div className="wrk-job-item-meta">
                          <span className="wrk-job-meta-item">
                            {getDepartmentIcon(job.department)} {job.department || 'General'}
                          </span>
                          <span className="wrk-job-meta-item">
                            📍 {job.location || 'Remote / Flexible'}
                          </span>
                          {job.type && (
                            <span className="wrk-job-meta-item">
                              ⏱️ {job.type}
                            </span>
                          )}
                          {job.duration && (
                            <span className="wrk-job-meta-item">
                              📅 {job.duration}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="wrk-job-item-pay-badge">
                        {job.pay || '₹850/day'}
                      </div>
                    </div>

                    <div className="wrk-job-item-bottom">
                      <div className="wrk-job-item-tags">
                        <span className="wrk-job-tag">
                          🏢 {employerName}
                        </span>
                        {isEmpVerified && (
                          <span className="wrk-emp-verified-pill" title="Verified Employer">
                            🛡️ Verified
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="wrk-btn-view-job"
                        onClick={() => onNavigate('jobs')}
                      >
                        View Job →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="wrk-home-empty-box">
              <div className="wrk-home-empty-icon">💼</div>
              <div className="wrk-home-empty-title">No Active Jobs Found</div>
              <p className="wrk-home-empty-text">
                There are currently no active listings. Check back shortly for newly posted opportunities.
              </p>
            </div>
          )}
        </section>

        {/* 4. RECENT APPLICATIONS */}
        <section className="wrk-section-shell">
          <div className="wrk-section-header">
            <div className="wrk-section-title-wrap">
              <h2 className="wrk-section-title">
                <span>📑</span> Recent Applications
              </h2>
              <p className="wrk-section-desc">
                Your submitted job proposals & review statuses
              </p>
            </div>
            <button
              type="button"
              className="wrk-view-all-link"
              onClick={() => onNavigate('applications')}
            >
              View All →
            </button>
          </div>

          {loadingApps ? (
            <div className="wrk-home-loading-box">
              <span>⏳</span> Loading your applications…
            </div>
          ) : recentApplications.length > 0 ? (
            <div className="wrk-apps-list">
              {recentApplications.map((app, idx) => {
                const jobTitle = app.job?.title || 'Job Application';
                const employerName =
                  app.job?.employer?.name ||
                  (app.job?.employer?.firstName
                    ? `${app.job.employer.firstName} ${app.job.employer.lastName || ''}`.trim()
                    : 'WorkLink Employer');

                const appliedDate = app.appliedAt
                  ? new Date(app.appliedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent';

                const statusLabel = app.status || 'pending';

                return (
                  <div key={app.applicationId || app._id || idx} className="wrk-app-item-card">
                    <div className="wrk-app-item-header">
                      <h4 className="wrk-app-item-title" title={jobTitle}>
                        {jobTitle}
                      </h4>
                      <span className={`wrk-status-pill ${getStatusClass(statusLabel)}`}>
                        ● {statusLabel}
                      </span>
                    </div>

                    <div className="wrk-app-item-details">
                      <span className="wrk-app-item-employer">
                        🏢 {employerName}
                      </span>
                      <span className="wrk-app-item-date">
                        Applied {appliedDate}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="wrk-home-empty-box">
              <div className="wrk-home-empty-icon">📁</div>
              <div className="wrk-home-empty-title">No Recent Applications</div>
              <p className="wrk-home-empty-text">
                You haven't submitted any job applications yet. Browse recommended jobs to apply.
              </p>
              <button
                type="button"
                className="wrk-quick-action-btn primary"
                style={{ marginTop: 14 }}
                onClick={() => onNavigate('jobs')}
              >
                Find Work Now
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
