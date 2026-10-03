import React, { useState, useEffect, useMemo } from 'react';
import { getJobs, updateApplicationStatus } from '../../data/api';
import ApplicantDetailsModal from './ApplicantDetailsModal';
import './Applicants.css';

export default function Applicants({ user, initialSelectedJobId = null, onNavigate }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(initialSelectedJobId || 'all');
  const [selectedApplicantData, setSelectedApplicantData] = useState(null); // { applicant, job }
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await getJobs();
      if (res.success && Array.isArray(res.jobs)) {
        setJobs(res.jobs);
      }
    } catch (err) {
      console.error('Failed to load jobs for applicants view:', err);
      showToast('Failed to load applications.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (initialSelectedJobId) {
      setSelectedJobId(initialSelectedJobId);
    }
  }, [initialSelectedJobId]);

  // Flatten all applications across jobs with parent job context
  const allApplications = useMemo(() => {
    const list = [];
    jobs.forEach((j) => {
      if (Array.isArray(j.applications)) {
        j.applications.forEach((app) => {
          list.push({
            ...app,
            parentJob: j,
            jobId: j._id,
            jobTitle: j.title,
            jobDepartment: j.department,
            jobLocation: j.location,
            jobPay: j.pay,
            jobStatus: j.status,
            jobCompletionStatus: j.completionStatus,
          });
        });
      }
    });
    // Sort recent applications first
    return list.sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));
  }, [jobs]);

  // Tab counts
  const counts = useMemo(() => {
    const total = allApplications.length;
    const pending = allApplications.filter((a) => a.status === 'pending').length;
    const shortlisted = allApplications.filter((a) => a.status === 'shortlisted').length;
    const hired = allApplications.filter(
      (a) => a.status === 'accepted' || a.status === 'hired'
    ).length;
    const completed = allApplications.filter(
      (a) => a.status === 'completed' || a.jobCompletionStatus === 'completed'
    ).length;
    const rejected = allApplications.filter((a) => a.status === 'rejected').length;

    return { total, pending, shortlisted, hired, completed, rejected };
  }, [allApplications]);

  // Filtered applications based on selectedJobId, statusFilter, and searchQuery
  const filteredApplications = useMemo(() => {
    return allApplications.filter((app) => {
      // 1. Job Filter
      if (selectedJobId !== 'all' && String(app.jobId) !== String(selectedJobId)) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter === 'pending' && app.status !== 'pending') return false;
      if (statusFilter === 'shortlisted' && app.status !== 'shortlisted') return false;
      if (statusFilter === 'hired' && app.status !== 'accepted' && app.status !== 'hired') {
        return false;
      }
      if (
        statusFilter === 'completed' &&
        app.status !== 'completed' &&
        app.jobCompletionStatus !== 'completed'
      ) {
        return false;
      }
      if (statusFilter === 'rejected' && app.status !== 'rejected') return false;

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const person = app.applicant;
        const name = typeof person === 'object'
          ? (person.name || `${person.firstName || ''} ${person.lastName || ''}`).toLowerCase()
          : '';
        const email = typeof person === 'object' && person.email ? person.email.toLowerCase() : '';
        const loc = typeof person === 'object' && person.location ? person.location.toLowerCase() : '';
        const jobTitle = app.jobTitle ? app.jobTitle.toLowerCase() : '';
        const skillsStr =
          typeof person === 'object' && Array.isArray(person.skills)
            ? person.skills
                .map((s) => (typeof s === 'string' ? s : s.name || '').toLowerCase())
                .join(' ')
            : '';

        if (
          !name.includes(q) &&
          !email.includes(q) &&
          !loc.includes(q) &&
          !jobTitle.includes(q) &&
          !skillsStr.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allApplications, selectedJobId, statusFilter, searchQuery]);

  // Quick Reject handler
  const handleQuickReject = async (app, e) => {
    if (e) e.stopPropagation();
    const person = app.applicant;
    const applicantId = typeof person === 'object' ? person._id : person;
    const personName =
      typeof person === 'object'
        ? person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Candidate'
        : 'Candidate';

    setActionLoadingId(app._id);
    try {
      const res = await updateApplicationStatus(app.jobId, applicantId, 'rejected');
      if (res.success) {
        showToast(`Application for ${personName} marked as rejected.`, 'info');
        fetchJobs();
      }
    } catch (err) {
      showToast(err.message || 'Failed to reject application.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Details Modal for Full Profile & Hire Flow
  const handleOpenDetails = (app) => {
    setSelectedApplicantData({
      applicant: app,
      job: app.parentJob,
    });
  };

  const getStatusBadge = (status, jobCompletion) => {
    if (jobCompletion === 'completed' || status === 'completed') {
      return <span className="app-pill pill-completed">✓ Completed</span>;
    }
    switch (status) {
      case 'accepted':
      case 'hired':
        return <span className="app-pill pill-hired">🤝 Hired & Verified</span>;
      case 'shortlisted':
        return <span className="app-pill pill-shortlisted">⭐ Shortlisted</span>;
      case 'rejected':
        return <span className="app-pill pill-rejected">✕ Rejected</span>;
      case 'pending':
      default:
        return <span className="app-pill pill-pending">⏳ Pending Review</span>;
    }
  };

  return (
    <div className="applicants-container fade-in">
      {/* Toast Alert */}
      {toast && (
        <div className={`app-toast app-toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── 1. Page Header ── */}
      <div className="applicants-header">
        <div className="applicants-header-info">
          <div className="applicants-title-row">
            <h2>👥 Candidate Applications</h2>
            <span className="applicants-total-pill">{allApplications.length} Total Received</span>
          </div>
          <p>
            Review worker submissions, verify biometric trust scores, inspect credentials, and
            deploy hired talent.
          </p>
        </div>
        <div className="applicants-header-stats">
          <div className="app-stat-chip">
            <span className="stat-num">{counts.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="app-stat-chip">
            <span className="stat-num text-success">{counts.hired}</span>
            <span className="stat-label">Hired</span>
          </div>
          <div className="app-stat-chip">
            <span className="stat-num">{counts.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      </div>

      {/* ── 2. Filters & Controls Bar ── */}
      <div className="applicants-toolbar">
        {/* Status Tabs */}
        <div className="applicants-tabs-scroll">
          <button
            type="button"
            className={`app-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Candidates <span className="tab-badge">{counts.total}</span>
          </button>
          <button
            type="button"
            className={`app-tab ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            ⏳ Pending <span className="tab-badge">{counts.pending}</span>
          </button>
          <button
            type="button"
            className={`app-tab ${statusFilter === 'shortlisted' ? 'active' : ''}`}
            onClick={() => setStatusFilter('shortlisted')}
          >
            ⭐ Shortlisted <span className="tab-badge">{counts.shortlisted}</span>
          </button>
          <button
            type="button"
            className={`app-tab ${statusFilter === 'hired' ? 'active' : ''}`}
            onClick={() => setStatusFilter('hired')}
          >
            🤝 Hired <span className="tab-badge">{counts.hired}</span>
          </button>
          <button
            type="button"
            className={`app-tab ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            ✓ Completed <span className="tab-badge">{counts.completed}</span>
          </button>
          <button
            type="button"
            className={`app-tab ${statusFilter === 'rejected' ? 'active' : ''}`}
            onClick={() => setStatusFilter('rejected')}
          >
            ✕ Rejected <span className="tab-badge">{counts.rejected}</span>
          </button>
        </div>

        {/* Filter Controls Row: Search & Job Selector */}
        <div className="applicants-filter-controls">
          <div className="app-search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by worker name, location, skill, or job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="app-job-select-wrap">
            <label className="select-label">Filter by Job:</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="app-job-dropdown"
            >
              <option value="all">All Jobs ({jobs.length})</option>
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>
                  {j.title} ({j.applications?.length || 0} apps)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 3. Applicants Grid Content ── */}
      {loading ? (
        <div className="applicants-loading-shell">
          <div className="applicants-spinner" />
          <p>Loading candidate applications...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="applicants-empty-state">
          <div className="empty-icon">👥</div>
          <h3>
            {searchQuery || selectedJobId !== 'all' || statusFilter !== 'all'
              ? 'No applicants matching your filter'
              : 'No applicants yet'}
          </h3>
          <p>
            {searchQuery || selectedJobId !== 'all' || statusFilter !== 'all'
              ? 'Try selecting a different job or clearing your search keywords.'
              : 'When verified workers apply to your posted jobs, their profiles and trust scores will appear here.'}
          </p>
          {searchQuery || selectedJobId !== 'all' || statusFilter !== 'all' ? (
            <button
              type="button"
              className="app-btn-secondary"
              onClick={() => {
                setSelectedJobId('all');
                setStatusFilter('all');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          ) : (
            <button
              type="button"
              className="app-btn-primary"
              onClick={() => onNavigate && onNavigate('postjob')}
            >
              ➕ Post a Job to Get Applicants
            </button>
          )}
        </div>
      ) : (
        <div className="applicants-grid">
          {filteredApplications.map((app) => {
            const person = app.applicant;
            const name = typeof person === 'object'
              ? (person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Worker Candidate')
              : 'Worker Candidate';

            const initials = typeof person === 'object'
              ? (person.name
                  ? person.name.split(' ').map((n) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
                  : `${person.firstName?.charAt(0) || ''}${person.lastName?.charAt(0) || ''}` || 'WK')
              : 'WK';

            const isVerified = typeof person === 'object' ? Boolean(person.isVerified) : false;
            const trustScore = typeof person === 'object' ? person.trustScore || 85 : 85;
            const location =
              typeof person === 'object' && person.location
                ? person.location
                : app.jobLocation || 'Bengaluru';
            const email = typeof person === 'object' ? person.email : '';
            const skills =
              typeof person === 'object' && Array.isArray(person.skills) && person.skills.length > 0
                ? person.skills
                : [{ name: app.jobDepartment || 'General Labour' }];

            const appliedDateStr = app.appliedAt
              ? new Date(app.appliedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Recently';

            const isActionLoading = actionLoadingId === app._id;
            const isHired = app.status === 'accepted' || app.status === 'hired';

            return (
              <div
                key={app._id}
                className={`applicant-card ${isHired ? 'card-hired' : ''}`}
                onClick={() => handleOpenDetails(app)}
              >
                {/* Top Section: Avatar, Trust Score, Status */}
                <div className="applicant-card-header">
                  <div className="applicant-profile-wrap">
                    <div
                      className="applicant-avatar"
                      style={{ background: isVerified ? '#10b981' : '#2563eb' }}
                    >
                      {initials}
                      {isVerified && (
                        <span className="avatar-verified-badge" title="Verified Worker">✓</span>
                      )}
                    </div>
                    <div className="applicant-id-info">
                      <h4 className="applicant-name">{name}</h4>
                      <span className="applicant-loc">📍 {location}</span>
                    </div>
                  </div>

                  <div className="applicant-score-box">
                    <span className="score-label">Trust Score</span>
                    <strong className="score-val">{trustScore} pts</strong>
                  </div>
                </div>

                {/* Job Applied Context Banner */}
                <div className="applicant-job-banner">
                  <div className="job-banner-text">
                    <span className="job-applied-label">Applied for</span>
                    <strong className="job-applied-title">{app.jobTitle}</strong>
                  </div>
                  <span className="job-pay-pill">{app.jobPay}</span>
                </div>

                {/* Skills Tags */}
                <div className="applicant-skills-row">
                  {skills.slice(0, 3).map((s, idx) => (
                    <span key={idx} className="skill-chip">
                      {typeof s === 'string' ? s : s.name}
                    </span>
                  ))}
                  {skills.length > 3 && (
                    <span className="skill-chip-more">+{skills.length - 3}</span>
                  )}
                </div>

                {/* Verification Check Badges */}
                <div className="applicant-verification-row">
                  <span className={`verify-chip ${isVerified ? 'verified' : 'pending'}`}>
                    {isVerified ? '✓ Identity Verified' : '⏳ Verification Pending'}
                  </span>
                  <span className="applied-date-chip">📅 {appliedDateStr}</span>
                </div>

                {/* Footer Actions */}
                <div
                  className="applicant-card-footer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="status-container">
                    {getStatusBadge(app.status, app.jobCompletionStatus)}
                  </div>

                  <div className="actions-buttons-wrap">
                    <button
                      type="button"
                      className="app-btn-view"
                      onClick={() => handleOpenDetails(app)}
                    >
                      View Profile →
                    </button>

                    {app.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          className="app-btn-hire"
                          onClick={() => handleOpenDetails(app)}
                          title="Accept application & proceed to 50% advance escrow"
                        >
                          🤝 Accept & Hire
                        </button>
                        <button
                          type="button"
                          className="app-btn-reject"
                          disabled={isActionLoading}
                          onClick={(e) => handleQuickReject(app, e)}
                          title="Reject application"
                        >
                          {isActionLoading ? '...' : '✕'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. Full Profile Inspection & Hiring Modal ── */}
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
    </div>
  );
}
