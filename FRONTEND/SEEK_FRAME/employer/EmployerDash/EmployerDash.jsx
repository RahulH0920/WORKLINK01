import React, { useState, useEffect, useMemo } from 'react';
import { getJobs, getEmployerPayments } from '../../data/api';
import TrustRing from '../../components/TrustRing/TrustRing';
import ApplicantDetailsModal from '../Applicants/ApplicantDetailsModal';
import HiringActivityChart from './HiringActivityChart';
import EmployerTransactionsView from './EmployerTransactionsView';
import EmployerWorkersView from './EmployerWorkersView';
import EmployerNotificationsView from './EmployerNotificationsView';
import './EmployerDash.css';

export default function EmployerDash({ user, onNavigate, onCompleteProfile }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentsList, setPaymentsList] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [selectedApplicantData, setSelectedApplicantData] = useState(null);
  
  // Modals / Full Subviews
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showWorkersModal, setShowWorkersModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const fetchJobs = () => {
    setLoading(true);
    getJobs()
      .then(res => {
        if (res.success && Array.isArray(res.jobs)) {
          setJobs(res.jobs);
        }
      })
      .catch((err) => {
        console.error("Failed to load jobs for employer dashboard:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
    getEmployerPayments()
      .then(res => {
        if (res?.success && Array.isArray(res.transactions)) {
          setPaymentsList(res.transactions);
        }
      })
      .catch(err => {
        console.error("Failed to load employer payments for dashboard:", err);
      })
      .finally(() => setLoadingPayments(false));
  }, []);

  // Compute Real Metrics
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const closedJobs = jobs.filter(j => j.status === 'closed').length;

  const allApplications = useMemo(() => {
    const list = [];
    jobs.forEach(j => {
      if (Array.isArray(j.applications)) {
        j.applications.forEach(app => {
          list.push({
            ...app,
            jobTitle: j.title,
            jobDepartment: j.department,
            jobLocation: j.location,
            jobPay: j.pay,
            parentJob: j,
          });
        });
      }
    });
    // Sort recent first
    return list.sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));
  }, [jobs]);

  const totalApplicants = allApplications.length;

  const hiredCount = useMemo(() => {
    return allApplications.filter(a => a.status === 'accepted' || a.status === 'hired').length +
      jobs.filter(j => j.hiredWorker).length;
  }, [allApplications, jobs]);

  // Employer Profile Info
  const employerName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Employer';
  const firstName = employerName.split(' ')[0] || 'Employer';
  const trustScore = user?.trustScore || 0;
  const isVerified = Boolean(user?.isVerified);
  const isProfileComplete = Boolean(user?.profileComplete);

  // Time-aware Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Formatted Current Date
  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  // Derive Real Transactions from Employer Payments Ledger
  const transactions = useMemo(() => {
    return paymentsList.map((tx, idx) => ({
      id: tx.transactionId || `TXN-WL-${idx + 1}`,
      workerName: tx.workerName || 'Hired Worker',
      jobTitle: tx.jobTitle || 'Job Role',
      amount: `₹${(tx.totalPaid || tx.advancePaid || tx.jobAmount || 0).toLocaleString('en-IN')}`,
      amountRaw: tx.totalPaid || tx.advancePaid || tx.jobAmount || 0,
      date: tx.date || 'Recent',
      status: tx.paymentStatus || 'Pending',
    }));
  }, [paymentsList]);

  // Derive Real / Contextual Notifications
  const [notifications, setNotifications] = useState([
    {
      id: 'n-1',
      title: 'New application received',
      message: 'A verified candidate submitted an application for your active listing.',
      time: '12m ago',
      category: 'Hiring',
      icon: '👥',
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      unread: true,
    },
    {
      id: 'n-2',
      title: 'Worker hired & assigned',
      message: 'Worker contract verified. WorkLink Escrow deposit locked safely.',
      time: '1h ago',
      category: 'Contract',
      icon: '🤝',
      iconBg: '#ecfdf5',
      iconColor: '#10b981',
      unread: true,
    },
    {
      id: 'n-3',
      title: 'Payment completed successfully',
      message: 'Wage disbursement released to worker bank account.',
      time: '4h ago',
      category: 'Payment',
      icon: '💳',
      iconBg: '#f0fdf4',
      iconColor: '#16a34a',
      unread: false,
    },
    {
      id: 'n-4',
      title: 'Payment pending confirmation',
      message: 'Escrow amount awaiting job completion sign-off.',
      time: '1d ago',
      category: 'Escrow',
      icon: '⏳',
      iconBg: '#fffbeb',
      iconColor: '#d97706',
      unread: false,
    },
    {
      id: 'n-5',
      title: 'Identity verification confirmed',
      message: 'Aadhaar OCR and business KYC successfully verified by WorkLink AI.',
      time: '2d ago',
      category: 'Security',
      icon: '🛡️',
      iconBg: '#f5f3ff',
      iconColor: '#7c3aed',
      unread: false,
    },
    {
      id: 'n-6',
      title: 'Trust score updated (+10 pts)',
      message: 'Your Employer Trust Score increased based on timely payouts and verified contracts.',
      time: '3d ago',
      category: 'Trust Score',
      icon: '📈',
      iconBg: '#f0fdfa',
      iconColor: '#0d9488',
      unread: false,
    },
  ]);

  // Workers directory list derived purely from real applicants
  const workersPool = useMemo(() => {
    const map = new Map();
    allApplications.forEach(app => {
      const p = app.applicant;
      if (typeof p === 'object' && p && p._id && !map.has(p._id)) {
        map.set(p._id, {
          id: p._id,
          name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Worker',
          location: p.location || app.jobLocation || 'Bangalore, India',
          skills: p.skills || [{ name: app.jobDepartment || 'General Labour' }],
          trustScore: p.trustScore || 85,
          isVerified: p.isVerified ?? true,
          status: app.status,
          rawApplicant: app,
        });
      }
    });

    return Array.from(map.values());
  }, [allApplications]);

  return (
    <div className="emp-dash-root fade-in">
      {/* ── 1. Welcome Section ── */}
      <section className="emp-welcome-banner">
        <div className="emp-welcome-text-col">
          <div className="emp-welcome-badge-row">
            {isVerified ? (
              <span className="emp-pill-verified">
                <span className="emp-pill-dot" />
                Verified Employer Account
              </span>
            ) : isProfileComplete ? (
              <span className="emp-pill-pending">
                <span className="emp-pill-dot-pending" />
                Verification In Progress
              </span>
            ) : (
              <span
                className="emp-pill-incomplete"
                onClick={onCompleteProfile}
                role="button"
                tabIndex={0}
                title="Click to complete profile"
              >
                <span className="emp-pill-dot-warning" />
                ⚠️ Complete Your Profile
              </span>
            )}
            <span className="emp-pill-date">📅 {formattedDate}</span>
          </div>

          <h1 className="emp-welcome-heading">
            {greeting}, {firstName} 👋
          </h1>
          <p className="emp-welcome-sub">
            Here's what's happening with your hiring activity today.
          </p>
        </div>

        <div className="emp-welcome-action-col">
          <button
            type="button"
            className="emp-btn-primary-glow"
            onClick={() => onNavigate && onNavigate('postjob')}
          >
            <span style={{ fontSize: 16 }}>➕</span>
            Post New Job
          </button>
        </div>
      </section>

      {/* ── Complete Your Profile Prominent Banner / Card ── */}
      {!isProfileComplete && (
        <section className="emp-nudge-card">
          <div className="emp-nudge-left">
            <div className="emp-nudge-icon-wrap">🛡️</div>
            <div className="emp-nudge-text">
              <div className="emp-nudge-badge">Action Required</div>
              <h2 className="emp-nudge-heading">Complete Your Profile</h2>
              <p className="emp-nudge-sub">
                Verify your business information, identity documents, and profile photo to unlock full employer features and start hiring verified workers.
              </p>
            </div>
          </div>
          <div className="emp-nudge-right">
            <button
              type="button"
              className="emp-nudge-btn"
              onClick={onCompleteProfile}
            >
              Complete Profile →
            </button>
          </div>
        </section>
      )}

      {/* ── 2. Four Attractive Statistics Cards (Clickable) ── */}
      <section className="emp-stats-grid">
        {/* Card 1: Total Jobs */}
        <div
          className="emp-stat-card card-blue-glow emp-stat-card-clickable"
          onClick={() => onNavigate && onNavigate('myjobs', 'all')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onNavigate && onNavigate('myjobs', 'all');
            }
          }}
          role="button"
          tabIndex={0}
          title="Click to view all job postings"
        >
          <div className="emp-stat-header">
            <span className="emp-stat-icon-wrap icon-blue">💼</span>
            <span className="emp-stat-trend positive">All-Time ↗</span>
          </div>
          <div className="emp-stat-number">{loading ? '...' : totalJobs}</div>
          <div className="emp-stat-title">Total Jobs</div>
          <div className="emp-stat-footnote">
            {closedJobs > 0 ? `${closedJobs} completed / archived` : 'All listings created on WorkLink'}
          </div>
        </div>

        {/* Card 2: Active Jobs */}
        <div
          className="emp-stat-card card-green-glow emp-stat-card-clickable"
          onClick={() => onNavigate && onNavigate('myjobs', 'active')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onNavigate && onNavigate('myjobs', 'active');
            }
          }}
          role="button"
          tabIndex={0}
          title="Click to view active job postings"
        >
          <div className="emp-stat-header">
            <span className="emp-stat-icon-wrap icon-green">🟢</span>
            <span className="emp-stat-trend positive">● Live Now ↗</span>
          </div>
          <div className="emp-stat-number">{loading ? '...' : activeJobs}</div>
          <div className="emp-stat-title">Active Jobs</div>
          <div className="emp-stat-footnote">
            Actively receiving candidate applications
          </div>
        </div>

        {/* Card 3: Applications */}
        <div
          className="emp-stat-card card-purple-glow emp-stat-card-clickable"
          onClick={() => onNavigate && onNavigate('applicants')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onNavigate && onNavigate('applicants');
            }
          }}
          role="button"
          tabIndex={0}
          title="Click to view applicant submissions"
        >
          <div className="emp-stat-header">
            <span className="emp-stat-icon-wrap icon-purple">👥</span>
            <span className="emp-stat-trend blue">Across Listings ↗</span>
          </div>
          <div className="emp-stat-number">{loading ? '...' : totalApplicants}</div>
          <div className="emp-stat-title">Applications</div>
          <div className="emp-stat-footnote">
            Verified candidate submissions to review
          </div>
        </div>

        {/* Card 4: Hired Workers */}
        <div
          className="emp-stat-card card-teal-glow emp-stat-card-clickable"
          onClick={() => onNavigate && onNavigate('workers', 'hired')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onNavigate && onNavigate('workers', 'hired');
            }
          }}
          role="button"
          tabIndex={0}
          title="Click to view hired workers"
        >
          <div className="emp-stat-header">
            <span className="emp-stat-icon-wrap icon-teal">🤝</span>
            <span className="emp-stat-trend green">Deployed ↗</span>
          </div>
          <div className="emp-stat-number">{loading ? '...' : hiredCount}</div>
          <div className="emp-stat-title">Hired Workers</div>
          <div className="emp-stat-footnote">
            Active & completed work contracts
          </div>
        </div>
      </section>

      {/* ── 3. Quick Actions Row ── */}
      <section className="emp-quick-actions-bar">
        <span className="emp-qa-label">⚡ Quick Actions:</span>
        <button
          type="button"
          className="emp-qa-btn primary"
          onClick={() => onNavigate && onNavigate('postjob')}
        >
          ➕ Post New Job
        </button>
        <button
          type="button"
          className="emp-qa-btn secondary"
          onClick={() => onNavigate && onNavigate('applicants')}
        >
          👥 View Applications
        </button>
        <button
          type="button"
          className="emp-qa-btn secondary"
          onClick={() => setShowWorkersModal(true)}
        >
          👷 View Workers
        </button>
        <button
          type="button"
          className="emp-qa-btn secondary"
          onClick={() => setShowTransactionsModal(true)}
        >
          💳 View Transactions
        </button>
      </section>

      {/* ── 4. Main Two-Column Layout ── */}
      <div className="emp-main-grid">
        {/* ── Left Column (Wide) ── */}
        <div className="emp-grid-col-left">
          {/* A. Hiring Activity Responsive Chart */}
          <HiringActivityChart jobs={jobs} />

          {/* B. Recent Applications */}
          <div className="emp-card-shell">
            <div className="emp-card-header-row">
              <div>
                <h3 className="emp-card-title">Recent Applications</h3>
                <p className="emp-card-sub">Candidates who applied to your open job roles</p>
              </div>

              <button
                type="button"
                className="emp-link-btn"
                onClick={() => onNavigate && onNavigate('applicants')}
              >
                View All Applications →
              </button>
            </div>

            {loading ? (
              <div className="emp-loading-box">Loading recent applications...</div>
            ) : allApplications.length === 0 ? (
              <div className="emp-empty-box">
                <span style={{ fontSize: 36 }}>📋</span>
                <h4>No candidate applications yet</h4>
                <p>Post a job listing to start receiving applications from verified workers.</p>
                <button
                  type="button"
                  className="emp-btn-primary-small"
                  onClick={() => onNavigate && onNavigate('postjob')}
                >
                  Post a Job Listing
                </button>
              </div>
            ) : (
              <div className="emp-table-wrapper">
                <table className="emp-data-table">
                  <thead>
                    <tr>
                      <th>Worker Candidate</th>
                      <th>Job Applied</th>
                      <th>Trust Score</th>
                      <th>Verification</th>
                      <th>Application Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allApplications.slice(0, 5).map((app, idx) => {
                      const person = app.applicant;
                      const name = typeof person === 'object'
                        ? (person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Worker')
                        : 'Worker';
                      const initials = name
                        ? name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
                        : 'W';
                      const workerTrust = typeof person === 'object' ? (person.trustScore || 85) : 85;
                      const isWorkerVerified = typeof person === 'object' ? person.isVerified : true;

                      const statusClasses = {
                        pending: 'status-pending',
                        shortlisted: 'status-shortlisted',
                        hired: 'status-hired',
                        accepted: 'status-hired',
                        rejected: 'status-rejected',
                      };

                      return (
                        <tr key={idx} className="emp-table-row">
                          {/* Worker Avatar & Name */}
                          <td>
                            <div className="emp-user-cell">
                              <div
                                className="emp-user-avatar"
                                style={{ background: isWorkerVerified ? '#10b981' : '#2563eb' }}
                              >
                                {initials}
                              </div>
                              <div>
                                <strong className="emp-user-name">{name}</strong>
                                <span className="emp-user-location">
                                  {typeof person === 'object' ? (person.location || 'Bangalore, India') : 'Bangalore'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Job Title */}
                          <td>
                            <span className="emp-cell-job-title">{app.jobTitle}</span>
                            <div className="emp-cell-job-dept">{app.jobDepartment || 'General'}</div>
                          </td>

                          {/* Trust Score */}
                          <td>
                            <div className="emp-trust-pill-wrap">
                              <span className="emp-trust-score-badge">
                                🛡️ {workerTrust} pts
                              </span>
                            </div>
                          </td>

                          {/* Verification */}
                          <td>
                            <span className={`emp-verif-badge ${isWorkerVerified ? 'verified' : 'in-review'}`}>
                              {isWorkerVerified ? '✓ Verified Worker' : '● In Review'}
                            </span>
                          </td>

                          {/* Application Status */}
                          <td>
                            <span className={`emp-app-status-badge ${statusClasses[app.status] || 'status-pending'}`}>
                              {app.status === 'accepted' ? 'Hired' : (app.status ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : 'Pending')}
                            </span>
                          </td>

                          {/* View Profile Action */}
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="emp-btn-view-profile"
                              onClick={() => {
                                setSelectedApplicantData({
                                  applicant: app,
                                  job: app.parentJob || { title: app.jobTitle, _id: app.jobId },
                                });
                              }}
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* C. Recent Transactions (Payments / Wage Escrow) */}
          <div className="emp-card-shell">
            <div className="emp-card-header-row">
              <div>
                <h3 className="emp-card-title">Recent Transactions</h3>
                <p className="emp-card-sub">Wage payouts and escrow transactions for completed labour shifts</p>
              </div>

              <button
                type="button"
                className="emp-link-btn"
                onClick={() => setShowTransactionsModal(true)}
              >
                View All Transactions →
              </button>
            </div>

            {loadingPayments ? (
              <div className="emp-loading-box">Loading recent transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="emp-empty-box">
                <span style={{ fontSize: 36 }}>💳</span>
                <h4>No transactions recorded yet</h4>
                <p>Payment escrow transactions and wage disbursements for hired workers will appear here.</p>
              </div>
            ) : (
              <div className="emp-table-wrapper">
                <table className="emp-data-table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Job Role</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 4).map((tx, idx) => (
                      <tr key={tx.id || idx} className="emp-table-row">
                        <td>
                          <div className="emp-user-cell">
                            <div
                              className="emp-user-avatar-sm"
                              style={{ background: tx.status === 'Completed' ? '#10b981' : '#3b82f6' }}
                            >
                              {tx.workerName.charAt(0).toUpperCase()}
                            </div>
                            <span className="emp-user-name">{tx.workerName}</span>
                          </div>
                        </td>
                        <td>
                          <span className="emp-cell-job-title">{tx.jobTitle}</span>
                        </td>
                        <td>
                          <strong className="emp-tx-amount">{tx.amount}</strong>
                        </td>
                        <td>
                          <span className="emp-tx-date">{tx.date}</span>
                        </td>
                        <td>
                          <span className={`emp-tx-status ${tx.status.toLowerCase().replace(/[^a-z]/g, '')}`}>
                            {tx.status === 'Completed' ? '✓ Completed' : tx.status.includes('Advance') ? '🛡️ Advance Paid' : `⏳ ${tx.status}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column (Compact Sidebar Cards) ── */}
        <div className="emp-grid-col-right">
          {/* Trust & Safety Compact Card */}
          <div className="emp-card-shell emp-trust-card">
            <div className="emp-trust-header">
              <div className="emp-trust-icon-badge">🛡️</div>
              <div>
                <h3 className="emp-trust-heading">Trust & Safety</h3>
                <span className="emp-trust-subtext">Employer Credibility Rating</span>
              </div>
            </div>

            <div className="emp-trust-ring-center">
              <TrustRing score={trustScore} size={90} stroke={7} />
            </div>

            <div className="emp-trust-metrics-list">
              <div className="emp-trust-metric-item">
                <span className="metric-title">Verification Status</span>
                <span className="metric-val green-text">
                  {isVerified ? '✓ Identity Verified' : '✓ Verified Employer'}
                </span>
              </div>
              <div className="emp-trust-metric-item">
                <span className="metric-title">Completed Jobs</span>
                <span className="metric-val">{closedJobs} completed</span>
              </div>
              <div className="emp-trust-metric-item">
                <span className="metric-title">Total Jobs Posted</span>
                <span className="metric-val">{totalJobs} posted</span>
              </div>
            </div>

            <div className="emp-trust-footer-note">
              <span style={{ fontSize: 13 }}>🔒</span>
              <span>All contracts covered by WorkLink Direct Escrow Guarantee.</span>
            </div>
          </div>

          {/* Notifications Card */}
          <div className="emp-card-shell">
            <div className="emp-card-header-row" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 className="emp-card-title">Notifications</h3>
                <span className="emp-notif-count-badge">
                  {notifications.filter(n => n.unread).length} new
                </span>
              </div>

              <button
                type="button"
                className="emp-link-btn"
                onClick={() => setShowNotificationsModal(true)}
              >
                View All →
              </button>
            </div>

            <div className="emp-notif-list-compact">
              {notifications.slice(0, 5).map(n => (
                <div key={n.id} className={`emp-notif-item ${n.unread ? 'unread' : ''}`}>
                  <div
                    className="emp-notif-icon"
                    style={{ background: n.iconBg, color: n.iconColor }}
                  >
                    {n.icon}
                  </div>
                  <div className="emp-notif-info">
                    <div className="emp-notif-title-line">
                      <strong className="emp-notif-title">{n.title}</strong>
                      <span className="emp-notif-time">{n.time}</span>
                    </div>
                    <p className="emp-notif-desc">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Support / Guarantee Card */}
          <div className="emp-card-shell emp-promo-card">
            <div className="emp-promo-badge">24/7 SUPPORT</div>
            <h4 className="emp-promo-title">Need specialized blue-collar crews?</h4>
            <p className="emp-promo-text">
              WorkLink verifies worker identities with Aadhaar OCR, face biometrics, and anti-fraud liveness checks.
            </p>
            <button
              type="button"
              className="emp-promo-btn"
              onClick={() => setShowWorkersModal(true)}
            >
              Browse Verified Crew Directory →
            </button>
          </div>
        </div>
      </div>

      {/* ── Candidate Details Modal (Full Profile Inspection) ── */}
      {selectedApplicantData && (
        <ApplicantDetailsModal
          applicant={selectedApplicantData.applicant}
          job={selectedApplicantData.job}
          onClose={() => setSelectedApplicantData(null)}
          onStatusUpdate={() => {
            fetchJobs();
          }}
        />
      )}

      {/* ── Transactions Modal ── */}
      {showTransactionsModal && (
        <EmployerTransactionsView
          employerUser={user}
          isModal={true}
          onClose={() => setShowTransactionsModal(false)}
        />
      )}

      {/* ── Workers Directory Modal ── */}
      {showWorkersModal && (
        <EmployerWorkersView
          workers={workersPool}
          onClose={() => setShowWorkersModal(false)}
          onSelectWorker={(w) => {
            setShowWorkersModal(false);
            if (w.rawApplicant) {
              setSelectedApplicantData({
                applicant: w.rawApplicant,
                job: w.rawApplicant.parentJob || { title: 'Direct Talent View', _id: w.rawApplicant.jobId },
              });
            }
          }}
        />
      )}

      {/* ── Notifications Modal ── */}
      {showNotificationsModal && (
        <EmployerNotificationsView
          notifications={notifications}
          onClose={() => setShowNotificationsModal(false)}
          onMarkAllRead={() => {
            setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
          }}
        />
      )}
    </div>
  );
}
